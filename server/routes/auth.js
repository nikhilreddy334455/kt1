import express from 'express';
import { pool } from '../db.js';
import { LoginSchema } from '../schemas/index.js';

const router = express.Router();

// POST /api/auth/login - Authenticate or register patient by phone number
router.post('/login', async (req, res) => {
  try {
    const validated = LoginSchema.parse(req.body);
    const { phoneNumber, fullName, dob } = validated;

    // Check if patient exists
    let result = await pool.query(
      'SELECT id, phone_number, full_name, dob, created_at FROM patients WHERE phone_number = $1',
      [phoneNumber]
    );

    let patient;
    if (result.rows.length === 0) {
      // Create new patient
      const insertResult = await pool.query(
        'INSERT INTO patients (phone_number, full_name, dob) VALUES ($1, $2, $3) RETURNING *',
        [phoneNumber, fullName || 'Patient Guest', dob || '1990-01-01']
      );
      patient = insertResult.rows[0];
    } else {
      patient = result.rows[0];
    }

    res.json({
      success: true,
      patient
    });
  } catch (error) {
    if (error.errors) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during patient login' });
  }
});

// GET /api/auth/patients - List demo patients for rapid switcher
router.get('/patients', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, phone_number, full_name, dob FROM patients ORDER BY id ASC LIMIT 10'
    );
    res.json({ patients: result.rows });
  } catch (error) {
    console.error('Failed to list patients:', error);
    res.status(500).json({ error: 'Failed to retrieve demo patients' });
  }
});

export default router;
