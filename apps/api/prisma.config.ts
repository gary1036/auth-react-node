import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, env } from 'prisma/config';

const rootDir = resolve(fileURLToPath(new URL('../..', import.meta.url)));

config({ path: resolve(rootDir, '.env') });
config({ path: resolve(rootDir, '.env.local'), override: true });

function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL ?? env('DATABASE_URL');

  // `db` is the Docker Compose service name — only reachable inside the network.
  if (!existsSync('/.dockerenv') && url.includes('@db:')) {
    return url.replace('@db:', '@localhost:');
  }

  return url;
}

// Prisma 6 still reads datasource URL from schema.prisma via env("DATABASE_URL").
process.env.DATABASE_URL = resolveDatabaseUrl();

export default defineConfig({
  schema: 'prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
});
