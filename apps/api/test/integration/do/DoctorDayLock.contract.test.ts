/**
 * Contract test for the DoctorDayLock Durable Object.
 *
 * The DO's job: enforce "at most one active hold AND at most one confirmed appointment per
 * (doctorId, startsAt)" under concurrent writers.
 *
 * The implementation lands in Drop 3. This file is the spec it must satisfy.
 *
 * Run with: TEST_KIND=integration pnpm --filter @dr-bak/api test
 */

import { env, runInDurableObject } from 'cloudflare:test';
import type { DurableObjectStub } from '@cloudflare/workers-types';
import { describe, expect, it } from 'vitest';

declare module 'cloudflare:test' {
  interface ProvidedEnv {
    DOCTOR_DAY_LOCK: DurableObjectNamespace;
  }
}

const stubFor = (key: string): DurableObjectStub =>
  env.DOCTOR_DAY_LOCK.get(env.DOCTOR_DAY_LOCK.idFromName(key));

describe.skip('DoctorDayLock contract — implementation pending in Drop 3', () => {
  it('grants a hold when none exists', async () => {
    const stub = stubFor('doc_1::2026-05-15');
    const result = await runInDurableObject(stub, async (instance: unknown) => {
      // The DO will expose a method `hold({ startsAt, durationMinutes, ttlSeconds })`
      // returning { token, expiresAt } | null.
      // Pseudocode below — actual call shape lives in DoctorDayLock.ts.
      // @ts-expect-error — contract test placeholder
      return await instance.hold({
        startsAt: new Date('2026-05-15T10:00:00Z').getTime(),
        durationMinutes: 40,
        ttlSeconds: 300,
        serviceId: 'svc_consultation',
      });
    });
    expect(result).not.toBeNull();
  });

  it('refuses a second concurrent hold for the same slot', async () => {
    const stub = stubFor('doc_1::2026-05-15');
    const [first, second] = await Promise.all([
      runInDurableObject(stub, async (instance: unknown) =>
        // @ts-expect-error — contract test placeholder
        instance.hold({
          startsAt: new Date('2026-05-15T11:00:00Z').getTime(),
          durationMinutes: 40,
          ttlSeconds: 300,
          serviceId: 'svc_consultation',
        }),
      ),
      runInDurableObject(stub, async (instance: unknown) =>
        // @ts-expect-error — contract test placeholder
        instance.hold({
          startsAt: new Date('2026-05-15T11:00:00Z').getTime(),
          durationMinutes: 40,
          ttlSeconds: 300,
          serviceId: 'svc_consultation',
        }),
      ),
    ]);
    const successes = [first, second].filter((r) => r !== null);
    expect(successes).toHaveLength(1);
  });

  it('confirms a hold atomically and rejects the same slot afterwards', async () => {
    const stub = stubFor('doc_1::2026-05-16');
    const hold = await runInDurableObject(stub, async (instance: unknown) =>
      // @ts-expect-error — contract test placeholder
      instance.hold({
        startsAt: new Date('2026-05-16T09:00:00Z').getTime(),
        durationMinutes: 40,
        ttlSeconds: 300,
        serviceId: 'svc_consultation',
      }),
    );
    expect(hold).not.toBeNull();

    const confirm = await runInDurableObject(stub, async (instance: unknown) =>
      // @ts-expect-error — contract test placeholder
      instance.confirm({
        token: (hold as { token: string }).token,
        appointmentId: 'apt_1',
        startsAt: new Date('2026-05-16T09:00:00Z').getTime(),
        endsAt: new Date('2026-05-16T09:40:00Z').getTime(),
      }),
    );
    expect(confirm).toBe('confirmed');

    const second = await runInDurableObject(stub, async (instance: unknown) =>
      // @ts-expect-error — contract test placeholder
      instance.hold({
        startsAt: new Date('2026-05-16T09:00:00Z').getTime(),
        durationMinutes: 40,
        ttlSeconds: 300,
        serviceId: 'svc_consultation',
      }),
    );
    expect(second).toBeNull();
  });

  it('expires holds after TTL and frees the slot', async () => {
    const stub = stubFor('doc_1::2026-05-17');
    const hold = await runInDurableObject(stub, async (instance: unknown) =>
      // @ts-expect-error — contract test placeholder
      instance.hold({
        startsAt: new Date('2026-05-17T09:00:00Z').getTime(),
        durationMinutes: 40,
        ttlSeconds: 1, // immediate
        serviceId: 'svc_consultation',
      }),
    );
    expect(hold).not.toBeNull();

    await new Promise((r) => setTimeout(r, 1100));

    const second = await runInDurableObject(stub, async (instance: unknown) =>
      // @ts-expect-error — contract test placeholder
      instance.hold({
        startsAt: new Date('2026-05-17T09:00:00Z').getTime(),
        durationMinutes: 40,
        ttlSeconds: 300,
        serviceId: 'svc_consultation',
      }),
    );
    expect(second).not.toBeNull();
  });
});
