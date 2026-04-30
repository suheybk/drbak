import type { Config } from 'drizzle-kit';

// Drizzle CLI runs in Node, not in Workers — so we read DATABASE_URL from process.env.
// In Workers runtime we use the Hyperdrive binding instead (see infrastructure/db/client.ts).

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL is required for drizzle-kit. ' +
      'Use a Neon branch URL for migrations; never run kit against production directly.',
  );
}

export default {
  schema: './src/infrastructure/db/schema.ts',
  out: './src/infrastructure/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: databaseUrl },
  strict: true,
  verbose: true,
  breakpoints: true,
} satisfies Config;
