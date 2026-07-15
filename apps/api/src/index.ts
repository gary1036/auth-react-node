import { loadEnv } from './config/env.js';
import { buildApp } from './app.js';
import { prisma } from './lib/prisma.js';

async function main() {
  const env = loadEnv();
  const app = await buildApp(env);

  const shutdown = async () => {
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await app.listen({ host: env.API_HOST, port: env.API_PORT });
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
