import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { Role, UserStatus } from '../auth/roles.js';
import { toPublicUser, usernameFromEmail } from '../auth/user.js';
import type { Env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { createAuthenticate, requireRoles } from '../middleware/authenticate.js';

const listQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum([UserStatus.ACTIVE, UserStatus.INACTIVE]).optional(),
  role: z.enum([Role.ADMIN, Role.USER]).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(120).nullable().optional(),
  email: z.string().email().optional(),
  username: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[a-zA-Z0-9._-]+$/)
    .optional(),
  role: z.enum([Role.ADMIN, Role.USER]).optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

const statusSchema = z.object({
  status: z.enum([UserStatus.ACTIVE, UserStatus.INACTIVE]),
});

export const usersRoutes: FastifyPluginAsync<{ env: Env }> = async (app, opts) => {
  const authenticate = createAuthenticate(opts.env);
  const adminOnly = requireRoles(Role.ADMIN);

  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', adminOnly);

  app.get('/', async (request) => {
    const query = listQuerySchema.parse(request.query);
    const where = {
      AND: [
        query.q
          ? {
              OR: [
                { email: { contains: query.q, mode: 'insensitive' as const } },
                { username: { contains: query.q, mode: 'insensitive' as const } },
                { name: { contains: query.q, mode: 'insensitive' as const } },
              ],
            }
          : {},
        query.status ? { status: query.status } : {},
        query.role ? { role: query.role } : {},
      ],
    };

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      data: users.map((user) => toPublicUser(user)),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
      },
    };
  });

  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.params.id } });
    if (!user) {
      return reply.status(404).send({
        error: { message: 'User not found', code: 'NOT_FOUND' },
      });
    }
    return { data: toPublicUser(user) };
  });

  app.put<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const body = updateSchema.parse(request.body);
    const existing = await prisma.user.findUnique({ where: { id: request.params.id } });
    if (!existing) {
      return reply.status(404).send({
        error: { message: 'User not found', code: 'NOT_FOUND' },
      });
    }

    if (body.email && body.email !== existing.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email: body.email } });
      if (emailTaken) {
        return reply.status(409).send({
          error: { message: 'Email already in use', code: 'EMAIL_EXISTS' },
        });
      }
    }

    if (body.username && body.username !== existing.username) {
      const usernameTaken = await prisma.user.findUnique({ where: { username: body.username } });
      if (usernameTaken) {
        return reply.status(409).send({
          error: { message: 'Username already in use', code: 'USERNAME_EXISTS' },
        });
      }
    }

    const user = await prisma.user.update({
      where: { id: request.params.id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.email !== undefined ? { email: body.email } : {}),
        ...(body.username !== undefined ? { username: body.username } : {}),
        ...(body.role !== undefined ? { role: body.role } : {}),
        ...(body.avatarUrl !== undefined ? { avatarUrl: body.avatarUrl } : {}),
      },
    });

    return { data: toPublicUser(user) };
  });

  app.patch<{ Params: { id: string } }>('/:id/status', async (request, reply) => {
    const body = statusSchema.parse(request.body);
    const existing = await prisma.user.findUnique({ where: { id: request.params.id } });
    if (!existing) {
      return reply.status(404).send({
        error: { message: 'User not found', code: 'NOT_FOUND' },
      });
    }

    if (existing.id === request.user?.id && body.status === UserStatus.INACTIVE) {
      return reply.status(400).send({
        error: { message: 'You cannot deactivate your own account', code: 'SELF_DEACTIVATE' },
      });
    }

    const user = await prisma.user.update({
      where: { id: request.params.id },
      data: { status: body.status },
    });

    return { data: toPublicUser(user) };
  });
};

export { usernameFromEmail };
