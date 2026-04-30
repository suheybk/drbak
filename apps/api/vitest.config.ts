import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';
import { defineConfig } from 'vitest/config';

/**
 * Two test pools:
 *   - `unit` — plain Node-ish vitest. Domain + application use-case tests run here.
 *     Fast, no Workers runtime, no platform bindings. ~ms per test.
 *   - `integration` — `@cloudflare/vitest-pool-workers`. Adapter contracts + DO tests
 *     run inside a real Workers runtime (Miniflare). Slower; opt in via path.
 *
 * The convention: `test/unit/**` always runs in node; `test/integration/**` always runs
 * in workers. `vitest run` runs both unless filtered.
 */

const isIntegration = (process.env.TEST_KIND ?? 'unit') === 'integration';

export default isIntegration
  ? defineWorkersConfig({
      test: {
        include: ['test/integration/**/*.test.ts'],
        poolOptions: {
          workers: {
            wrangler: { configPath: './wrangler.toml', environment: 'dev' },
            isolatedStorage: true,
            singleWorker: true,
            miniflare: {
              compatibilityDate: '2026-04-30',
              compatibilityFlags: ['nodejs_compat'],
            },
          },
        },
      },
    })
  : defineConfig({
      test: {
        include: ['test/unit/**/*.test.ts'],
        environment: 'node',
        globals: false,
        coverage: {
          provider: 'v8',
          include: ['src/domain/**/*.ts', 'src/application/**/*.ts'],
          thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
        },
      },
    });
