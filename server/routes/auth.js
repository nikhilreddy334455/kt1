import express from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { LoginSchema, SignUpSchema, EmailLoginSchema, GoogleAuthSchema } from '../schemas/index.js';
import { signToken, verifyToken } from '../utils/jwt.js';

const router = express.Router();

// Helper to sanitize patient object (remove password hash)
function sanitizePatient(p) {
  if (!p) return null;
  const { password_hash, ...safePatient } = p;
  return safePatient;
}

// Helper to decode Google JWT credential if sent
function parseGoogleJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

// POST /api/auth/signup - Create a new patient account with Email & Password
router.post('/signup', async (req, res) => {
  try {
    const validated = SignUpSchema.parse(req.body);
    const { email, password, fullName, phoneNumber, dob } = validated;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already registered
    const existing = await pool.query(
      'SELECT id FROM patients WHERE email = $1',
      [normalizedEmail]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists. Please log in.' });
    }

    // Hash password securely
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert new patient
    const insertResult = await pool.query(
      `INSERT INTO patients (email, password_hash, full_name, phone_number, dob) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [
        normalizedEmail,
        passwordHash,
        fullName.trim(),
        phoneNumber || null,
        dob || '1990-01-01'
      ]
    );

    const patient = sanitizePatient(insertResult.rows[0]);
    const token = signToken(patient);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      patient
    });
  } catch (error) {
    if (error.errors) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Sign-up error:', error);
    res.status(500).json({ error: 'Failed to create patient account' });
  }
});

// POST /api/auth/login - Log in with Email & Password OR Phone Number
router.post('/login', async (req, res) => {
  try {
    // 1. Email & Password Login
    if (req.body.email && req.body.password) {
      const validated = EmailLoginSchema.parse(req.body);
      const normalizedEmail = validated.email.toLowerCase().trim();

      const userQuery = await pool.query(
        'SELECT * FROM patients WHERE email = $1',
        [normalizedEmail]
      );

      if (userQuery.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const rawPatient = userQuery.rows[0];

      if (!rawPatient.password_hash) {
        return res.status(400).json({
          error: 'This account was created with Google Sign-In. Please sign in with Google.'
        });
      }

      const isMatch = await bcrypt.compare(validated.password, rawPatient.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const patient = sanitizePatient(rawPatient);
      const token = signToken(patient);

      return res.json({
        success: true,
        message: 'Logged in successfully',
        token,
        patient
      });
    }

    // 2. Phone Number Quick Login (Backward Compatible)
    if (req.body.phoneNumber) {
      const validated = LoginSchema.parse(req.body);
      const { phoneNumber, fullName, dob } = validated;

      let result = await pool.query(
        'SELECT * FROM patients WHERE phone_number = $1',
        [phoneNumber]
      );

      let rawPatient;
      if (result.rows.length === 0) {
        const insertResult = await pool.query(
          'INSERT INTO patients (phone_number, full_name, dob) VALUES ($1, $2, $3) RETURNING *',
          [phoneNumber, fullName || 'Patient Guest', dob || '1990-01-01']
        );
        rawPatient = insertResult.rows[0];
      } else {
        rawPatient = result.rows[0];
      }

      const patient = sanitizePatient(rawPatient);
      const token = signToken(patient);

      return res.json({
        success: true,
        token,
        patient
      });
    }

    return res.status(400).json({ error: 'Please provide email/password or phone number' });
  } catch (error) {
    if (error.errors) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during patient login' });
  }
});

// POST /api/auth/google - Authenticate or Sign Up via Google OAuth
router.post('/google', async (req, res) => {
  try {
    let email = req.body.email;
    let fullName = req.body.fullName;
    let avatarUrl = req.body.avatarUrl;
    let googleId = req.body.googleId;

    // If Google ID token credential was passed, decode it
    if (req.body.credential) {
      const decoded = parseGoogleJwt(req.body.credential);
      if (decoded && decoded.email) {
        email = decoded.email;
        fullName = decoded.name || fullName;
        avatarUrl = decoded.picture || avatarUrl;
        googleId = decoded.sub || googleId;
      }
    }

    if (!email) {
      return res.status(400).json({ error: 'Google email could not be verified' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if patient exists by email or google_id
    let userQuery = await pool.query(
      'SELECT * FROM patients WHERE email = $1 OR google_id = $2',
      [normalizedEmail, googleId || '']
    );

    let rawPatient;
    if (userQuery.rows.length > 0) {
      // Update Google profile details if needed
      rawPatient = userQuery.rows[0];
      if (!rawPatient.google_id && googleId) {
        await pool.query(
          'UPDATE patients SET google_id = $1, avatar_url = COALESCE(avatar_url, $2) WHERE id = $3',
          [googleId, avatarUrl, rawPatient.id]
        );
        rawPatient.google_id = googleId;
        rawPatient.avatar_url = avatarUrl;
      }
    } else {
      // Create new patient from Google profile
      const insertResult = await pool.query(
        `INSERT INTO patients (email, full_name, avatar_url, google_id) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [normalizedEmail, fullName || 'Google User', avatarUrl || null, googleId || null]
      );
      rawPatient = insertResult.rows[0];
    }

    const patient = sanitizePatient(rawPatient);
    const token = signToken(patient);

    res.json({
      success: true,
      message: 'Signed in with Google successfully',
      token,
      patient
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Failed to authenticate with Google' });
  }
});

// GET /api/auth/me - Get current logged-in patient from JWT token
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: 'Invalid or expired session token' });
    }

    const result = await pool.query(
      'SELECT id, phone_number, email, full_name, dob, avatar_url, created_at FROM patients WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json({
      success: true,
      patient: result.rows[0]
    });
  } catch (error) {
    console.error('Auth me error:', error);
    res.status(500).json({ error: 'Failed to verify session' });
  }
});

// GET /api/auth/patients - List demo patients for rapid switcher
router.get('/patients', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, phone_number, email, full_name, dob, avatar_url FROM patients ORDER BY id ASC LIMIT 10'
    );
    res.json({ patients: result.rows });
  } catch (error) {
    console.error('Failed to list patients:', error);
    res.status(500).json({ error: 'Failed to retrieve demo patients' });
  }
});

export default router;
