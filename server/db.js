import pkg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root or server directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/medical_concierge';
const isRemoteDb = connectionString && !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1');

export const pool = new Pool({
  connectionString,
  ssl: (process.env.NODE_ENV === 'production' || isRemoteDb) ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

export const query = (text, params) => pool.query(text, params);

export default {
  pool,
  query
};
