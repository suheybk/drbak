import { z } from 'zod';
import { LocaleSchema } from './locale.js';

const PasswordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .max(256)
  .transform((s) => s.normalize('NFC'));

const EmailSchema = z.string().trim().toLowerCase().email().max(254);

export const RegisterRequestSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  fullName: z.string().min(2).max(160),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'),
  locale: LocaleSchema,
  phoneE164: z
    .string()
    .regex(/^\+\d{8,15}$/)
    .optional(),
  consents: z
    .object({
      appointmentBooking: z.literal(true),
      healthDataProcessing: z.literal(true),
      marketingCommunications: z.boolean().optional(),
    })
    .strict(),
  consentDocumentVersion: z.string(),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1).max(256),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const TokenPairSchema = z.object({
  accessToken: z.string(),
  accessTokenExpiresAt: z.string().datetime(),
  // Refresh token is HttpOnly cookie — not present in body for SPA flow
});
export type TokenPair = z.infer<typeof TokenPairSchema>;

export const SessionUserSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  role: z.enum(['patient', 'staff', 'admin', 'doctor']),
  locale: LocaleSchema,
  emailVerified: z.boolean(),
});
export type SessionUser = z.infer<typeof SessionUserSchema>;

export const VerifyEmailRequestSchema = z.object({
  token: z.string().min(16).max(256),
});
export type VerifyEmailRequest = z.infer<typeof VerifyEmailRequestSchema>;

export const PasswordResetRequestSchema = z.object({
  email: EmailSchema,
});
export type PasswordResetRequest = z.infer<typeof PasswordResetRequestSchema>;

export const PasswordResetConfirmSchema = z.object({
  token: z.string().min(16).max(256),
  newPassword: PasswordSchema,
});
export type PasswordResetConfirm = z.infer<typeof PasswordResetConfirmSchema>;

export const OauthBeginRequestSchema = z.object({
  provider: z.literal('google'),
  redirectAfter: z.string().url().optional(),
  locale: LocaleSchema,
});
export type OauthBeginRequest = z.infer<typeof OauthBeginRequestSchema>;
