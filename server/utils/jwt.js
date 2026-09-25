import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'healthsync_jwt_secret_token_secure_9090_prod';

export function signToken(patient) {
  return jwt.sign(
    {
      id: patient.id,
      email: patient.email,
      fullName: patient.full_name,
      phoneNumber: patient.phone_number
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

export default {
  signToken,
  verifyToken
};
