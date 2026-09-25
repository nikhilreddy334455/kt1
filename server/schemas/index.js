import { z } from 'zod';

export const ChatRequestSchema = z.object({
  patientId: z.number().int().positive(),
  message: z.string().min(1, 'Message cannot be empty'),
  channel: z.enum(['text', 'voice']),
  language: z.string().optional()
});

export const LoginSchema = z.object({
  phoneNumber: z.string().min(10, 'Phone number must be at least 10 characters'),
  fullName: z.string().optional(),
  dob: z.string().optional()
});

export const SignUpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phoneNumber: z.string().optional(),
  dob: z.string().optional()
});

export const EmailLoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required')
});

export const GoogleAuthSchema = z.object({
  credential: z.string().optional(),
  email: z.string().email('Invalid Google email address'),
  fullName: z.string().optional(),
  avatarUrl: z.string().optional(),
  googleId: z.string().optional()
});

export const ResolveAlertSchema = z.object({
  alertId: z.number().int().positive(),
  resolutionNotes: z.string().optional()
});
