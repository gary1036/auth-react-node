import { PrismaClient, Role, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash('admin123', 12);
  const userHash = await bcrypt.hash('password123', 12);

  await prisma.user.upsert({
    where: { email: 'admin@local.dev' },
    update: {
      passwordHash: adminHash,
      username: 'admin',
      name: 'System Admin',
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
    create: {
      email: 'admin@local.dev',
      username: 'admin',
      passwordHash: adminHash,
      name: 'System Admin',
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.user.upsert({
    where: { email: 'demo@local.dev' },
    update: {
      passwordHash: userHash,
      username: 'demo',
      name: 'Demo User',
      role: Role.USER,
      status: UserStatus.ACTIVE,
    },
    create: {
      email: 'demo@local.dev',
      username: 'demo',
      passwordHash: userHash,
      name: 'Demo User',
      role: Role.USER,
      status: UserStatus.ACTIVE,
    },
  });

  console.log('Seeded admin@local.dev / admin123 (ADMIN)');
  console.log('Seeded demo@local.dev / password123 (USER)');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
