/**
 * Auth + RBAC guards.
 *
 * `requireAuth(roles?)` middleware:
 *   - Reads Bearer JWT (or `__Secure-drbak_at` cookie).
 *   - Verifies via TokenIssuer.
 *   - Loads UserRecord from DB (NEVER trusts the role claim).
 *   - Sets `c.set('auth', { user, sessionId })`.
 *   - 401 on missing/invalid; 403 if role not allowed.
 */

import type { MiddlewareHandler } from 'hono';
import type { Clock, TokenIssuer, UserRepository } from '../../../application/ports/index.js';
import { Tx } from '../../../composition/buildContainer.js';
import type { Container } from '../../../composition/container.js';
import { T } from '../../../composition/tokens.js';

export interface AuthContext {
  readonly userId: string;
  readonly role: 'patient' | 'staff' | 'admin' | 'doctor';
  readonly locale: string;
  readonly sessionId: string;
  readonly emailVerified: boolean;
  readonly email: string;
}

const COOKIE_NAME = '__Secure-drbak_at';

export const requireAuth =
  (allowedRoles?: ReadonlyArray<AuthContext['role']>): MiddlewareHandler =>
  async (c, next) => {
    const container = c.get('container') as Container;
    const issuer = container.resolve<TokenIssuer>(Tx.TokenIssuer);
    const users = container.resolve<UserRepository>(Tx.UserRepository);
    const clock = container.resolve<Clock>(T.Clock) ?? null;

    const bearer = c.req.header('authorization');
    const tokenStr = bearer?.startsWith('Bearer ')
      ? bearer.slice(7)
      : c.req.header('cookie')?.match(new RegExp(`${COOKIE_NAME}=([^;]+)`))?.[1];
    if (!tokenStr) {
      return c.json({ error: { code: 'TOKEN_INVALID', message: 'Missing token.' } }, 401);
    }

    const claims = await issuer.verifyAccess(tokenStr, clock ? clock.now() : (Date.now() as never));
    if (!claims) {
      return c.json({ error: { code: 'TOKEN_INVALID', message: 'Invalid token.' } }, 401);
    }
    const user = await users.findById(claims.sub as never);
    if (!user || user.deletedAt) {
      return c.json({ error: { code: 'TOKEN_INVALID', message: 'Account inactive.' } }, 401);
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return c.json({ error: { code: 'PERMISSION_DENIED', message: 'Insufficient role.' } }, 403);
    }

    const auth: AuthContext = {
      userId: user.id,
      role: user.role,
      locale: user.locale,
      sessionId: claims.sid,
      emailVerified: user.emailVerifiedAt !== null,
      email: user.email,
    };
    c.set('auth', auth);
    await next();
  };
