import type { Locale } from '@dr-bak/contracts';
import type { UserId } from '../../domain/shared/ids.js';
import type { Instant } from '../../domain/shared/time.js';

export type UserRole = 'patient' | 'staff' | 'admin' | 'doctor';

export interface UserRecord {
  readonly id: UserId;
  readonly email: string;
  readonly emailNormalized: string;
  readonly emailVerifiedAt: Instant | null;
  readonly passwordHash: string | null;
  readonly role: UserRole;
  readonly locale: Locale;
  readonly failedLoginCount: number;
  readonly lockedUntil: Instant | null;
  readonly lastLoginAt: Instant | null;
  readonly createdAt: Instant;
  readonly updatedAt: Instant;
  readonly deletedAt: Instant | null;
}

export interface CreateUserInput {
  readonly id: UserId;
  readonly email: string;
  readonly passwordHash: string | null;
  readonly role: UserRole;
  readonly locale: Locale;
  readonly emailVerifiedAt: Instant | null;
  readonly now: Instant;
}

export interface UserRepository {
  findByEmail(emailNormalized: string): Promise<UserRecord | null>;
  findById(id: UserId): Promise<UserRecord | null>;
  create(input: CreateUserInput): Promise<UserRecord>;
  markEmailVerified(id: UserId, at: Instant): Promise<void>;
  recordLoginSuccess(id: UserId, at: Instant): Promise<void>;
  recordLoginFailure(id: UserId, lockUntil: Instant | null): Promise<void>;
  resetLoginCounters(id: UserId): Promise<void>;
  updatePasswordHash(id: UserId, newHash: string, at: Instant): Promise<void>;
  linkOauthAccount(input: {
    userId: UserId;
    provider: string;
    providerAccountId: string;
    email: string;
    now: Instant;
  }): Promise<void>;
  findByOauthAccount(provider: string, providerAccountId: string): Promise<UserRecord | null>;
}
