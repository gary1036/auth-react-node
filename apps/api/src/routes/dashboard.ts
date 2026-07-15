import type { FastifyPluginAsync } from 'fastify';
import { Role, UserStatus } from '../auth/roles.js';
import type { Env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { createAuthenticate, requireRoles } from '../middleware/authenticate.js';

export const dashboardRoutes: FastifyPluginAsync<{ env: Env }> = async (app, opts) => {
  const authenticate = createAuthenticate(opts.env);
  const adminOnly = requireRoles(Role.ADMIN);

  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', adminOnly);

  app.get('/stats', async () => {
    const [totalUsers, activeUsers, inactiveUsers, adminUsers, regularUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
      prisma.user.count({ where: { status: UserStatus.INACTIVE } }),
      prisma.user.count({ where: { role: Role.ADMIN } }),
      prisma.user.count({ where: { role: Role.USER } }),
    ]);

    return {
      data: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        adminUsers,
        regularUsers,
      },
    };
  });
};
