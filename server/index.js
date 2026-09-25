import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import conversationsRoutes from './routes/conversations.js';
import chatRoutes from './routes/chat.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Request logging in development
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Health check and diagnostic endpoint
app.get('/api/health', async (req, res) => {
  let dbStatus = 'disconnected';
  let dbError = null;
  let patientCount = 0;

  try {
    const { pool } = await import('./db.js');
    const dbRes = await pool.query('SELECT COUNT(*) FROM patients');
    patientCount = parseInt(dbRes.rows[0].count, 10);
    dbStatus = 'connected';
  } catch (err) {
    dbError = err.message;
  }

  res.json({
    status: dbStatus === 'connected' ? 'healthy' : 'degraded',
    service: 'HealthSync Medical Concierge API',
    database: {
      status: dbStatus,
      patientCount,
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
      error: dbError
    },
    timestamp: new Date().toISOString()
  });
});

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);

// Serve static frontend build if present
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

app.listen(PORT, async () => {
  console.log(`====================================================`);
  console.log(`  HealthSync Medical Concierge Server is running!   `);
  console.log(`  Port: http://localhost:${PORT}                    `);
  console.log(`  Health check: http://localhost:${PORT}/api/health `);
  console.log(`====================================================`);

  // Auto-initialize schema on startup
  try {
    const fs = await import('fs');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    const { pool } = await import('./db.js');
    await pool.query(schemaSql);
    console.log('Database tables verified on startup.');

    // Ensure initial patients exist
    const countRes = await pool.query('SELECT COUNT(*) FROM patients');
    if (parseInt(countRes.rows[0].count, 10) === 0) {
      await pool.query(`
        INSERT INTO patients (phone_number, full_name, dob)
        VALUES 
          ('5551234567', 'Elena Rostova', '1988-04-12'),
          ('5559876543', 'Marcus Vance', '1975-11-23'),
          ('5554567890', 'Aisha Khan', '1992-08-30');
      `);
      console.log('Initial sample patients seeded.');
    }
  } catch (err) {
    console.error('Database auto-initialization notice:', err.message);
  }
});

export default app;
