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

export const ResolveAlertSchema = z.object({
  alertId: z.number().int().positive(),
  resolutionNotes: z.string().optional()
});
