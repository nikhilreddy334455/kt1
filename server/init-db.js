import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDB() {
  console.log('Connecting to PostgreSQL database...');
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Executing schema definition...');
    await pool.query(schemaSql);
    console.log('Schema tables created successfully.');

    // Seed sample patients if not present
    const checkPatients = await pool.query('SELECT COUNT(*) FROM patients');
    if (parseInt(checkPatients.rows[0].count, 10) === 0) {
      console.log('Seeding initial demo patient data...');
      await pool.query(`
        INSERT INTO patients (phone_number, full_name, dob)
        VALUES 
          ('5551234567', 'Elena Rostova', '1988-04-12'),
          ('5559876543', 'Marcus Vance', '1975-11-23'),
          ('5554567890', 'Aisha Khan', '1992-08-30');
      `);
      console.log('Sample patients seeded successfully.');
    } else {
      console.log(`Patients table already contains ${checkPatients.rows[0].count} records.`);
    }

    console.log('Database initialization completed.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

initDB();
