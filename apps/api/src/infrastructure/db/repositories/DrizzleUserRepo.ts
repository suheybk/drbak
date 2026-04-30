import type { Locale } from '@dr-bak/contracts';
import { and, eq, isNull } from 'drizzle-orm';
import { ulid } from 'ulid';
import type {
  CreateUserInput,
  UserRecord,
  UserRepository,
  UserRole,
} from '../../../application/ports/index.js';
import type { UserId } from '../../../domain/shared/ids.js';
import { asUserId } from '../../../domain/shared/ids.js';
import type { Instant } from '../../../domain/shared/time.js';
import { instantFromMillis } from '../../../domain/shared/time.js';
import type { Db } from '../client.js';
import { oauthAccounts, users } from '../schema.js';

const toUserRecord = (row: typeof users.$inferSelect): UserRecord => ({
  id: asUserId(row.id),
  email: row.email,
  emailNormalized: row.emailNormalized,
  emailVerifiedAt: row.emailVerifiedAt ? instantFromMillis(row.emailVerifiedAt.getTime()) : null,
  passwordHash: row.passwordHash,
  role: row.role as UserRole,
  locale: row.locale as Locale,
  failedLoginCount: row.failedLoginCount,
  lockedUntil: row.lockedUntil ? instantFromMillis(row.lockedUntil.getTime()) : null,
  lastLoginAt: row.lastLoginAt ? instantFromMillis(row.lastLoginAt.getTime()) : null,
  createdAt: instantFromMillis(row.createdAt.getTime()),
  updatedAt: instantFromMillis(row.updatedAt.getTime()),
  deletedAt: row.deletedAt ? instantFromMillis(row.deletedAt.getTime()) : null,
});

const normalizeEmail = (e: string) => e.trim().toLowerCase();

export class DrizzleUserRepo implements UserRepository {
  constructor(private readonly db: Db) {}

  async findByEmail(emailNormalized: string): Promise<UserRecord | null> {
    const rows = await this.db
      .select()
      .from(users)
      .where(and(eq(users.emailNormalized, emailNormalized), isNull(users.deletedAt)))
      .limit(1);
    return rows[0] ? toUserRecord(rows[0]) : null;
  }

  async findById(id: UserId): Promise<UserRecord | null> {
    const rows = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1);
    return rows[0] ? toUserRecord(rows[0]) : null;
  }

  async create(input: CreateUserInput): Promise<UserRecord> {
    const inserted = await this.db
      .insert(users)
      .values({
        id: input.id,
        email: input.email,
        emailNormalized: normalizeEmail(input.email),
        passwordHash: input.passwordHash,
        role: input.role,
        locale: input.locale,
        emailVerifiedAt: input.emailVerifiedAt ? new Date(input.emailVerifiedAt as number) : null,
        createdAt: new Date(input.now as number),
        updatedAt: new Date(input.now as number),
      })
      .returning();
    if (!inserted[0]) throw new Error('user create returned no rows');
    return toUserRecord(inserted[0]);
  }

  async markEmailVerified(id: UserId, at: Instant): Promise<void> {
    await this.db
      .update(users)
      .set({ emailVerifiedAt: new Date(at as number), updatedAt: new Date(at as number) })
      .where(eq(users.id, id));
  }

  async recordLoginSuccess(id: UserId, at: Instant): Promise<void> {
    await this.db
      .update(users)
      .set({
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(at as number),
        updatedAt: new Date(at as number),
      })
      .where(eq(users.id, id));
  }

  async recordLoginFailure(id: UserId, lockUntil: Instant | null): Promise<void> {
    // We do increment + conditional lock in one SQL statement to avoid races.
    // Drizzle: use raw `sql` for the increment.
    const { sql } = await import('drizzle-orm');
    await this.db
      .update(users)
      .set({
        failedLoginCount: sql`${users.failedLoginCount} + 1`,
        lockedUntil: lockUntil ? new Date(lockUntil as number) : null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
  }

  async resetLoginCounters(id: UserId): Promise<void> {
    await this.db
      .update(users)
      .set({ failedLoginCount: 0, lockedUntil: null, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async updatePasswordHash(id: UserId, newHash: string, at: Instant): Promise<void> {
    await this.db
      .update(users)
      .set({ passwordHash: newHash, updatedAt: new Date(at as number) })
      .where(eq(users.id, id));
  }

  async linkOauthAccount(input: {
    userId: UserId;
    provider: string;
    providerAccountId: string;
    email: string;
    now: Instant;
  }): Promise<void> {
    await this.db.insert(oauthAccounts).values({
      id: ulid(),
      userId: input.userId,
      provider: input.provider,
      providerAccountId: input.providerAccountId,
      email: input.email,
      createdAt: new Date(input.now as number),
    });
  }

  async findByOauthAccount(
    provider: string,
    providerAccountId: string,
  ): Promise<UserRecord | null> {
    const rows = await this.db
      .select({ user: users })
      .from(oauthAccounts)
      .innerJoin(users, eq(users.id, oauthAccounts.userId))
      .where(
        and(
          eq(oauthAccounts.provider, provider),
          eq(oauthAccounts.providerAccountId, providerAccountId),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);
    return rows[0]?.user ? toUserRecord(rows[0].user) : null;
  }
}
