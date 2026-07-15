import type { FastifyReply, FastifyRequest } from 'fastify';
import { hasRole, type Role, UserStatus } from '../auth/roles.js';
import type { Env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import {
  type AuthUser,
  toAuthUser,
  verifyAccessToken,
  verifyPassword,
} from '../lib/tokens.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
    authMethod?: 'basic' | 'bearer';
  }
}

function unauthorized(reply: FastifyReply, message = 'Unauthorized') {
  return reply.status(401).header('WWW-Authenticate', 'Bearer, Basic').send({
    error: { message, code: 'UNAUTHORIZED' },
  });
}

function forbidden(reply: FastifyReply, message = 'Forbidden') {
  return reply.status(403).send({
    error: { message, code: 'FORBIDDEN' },
  });
}

async function authenticateBasic(authorization: string): Promise<AuthUser | null> {
  const encoded = authorization.slice('Basic '.length).trim();
  let decoded: string;
  try {
    decoded = Buffer.from(encoded, 'base64').toString('utf8');
  } catch {
    return null;
  }

  const separatorIndex = decoded.indexOf(':');
  if (separatorIndex < 0) return null;

  const email = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);
  if (!email || !password) return null;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) return null;
  if (user.status !== UserStatus.ACTIVE) return null;

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;

  return toAuthUser(user);
}

async function authenticateBearer(env: Env, authorization: string): Promise<AuthUser | null> {
  const token = authorization.slice('Bearer '.length).trim();
  if (!token) return null;
  try {
    const user = await verifyAccessToken(env, token);
    if (user.status !== UserStatus.ACTIVE) return null;
    return user;
  } catch {
    return null;
  }
}

export function createAuthenticate(env: Env, options?: { optional?: boolean }) {
  return async function authenticate(request: FastifyRequest, reply: FastifyReply) {
    const authorization = request.headers.authorization;
    if (!authorization) {
      if (options?.optional) return;
      return unauthorized(reply, 'Missing Authorization header');
    }

    if (authorization.startsWith('Basic ')) {
      const user = await authenticateBasic(authorization);
      if (!user) return unauthorized(reply, 'Invalid basic credentials');
      request.user = user;
      request.authMethod = 'basic';
      return;
    }

    if (authorization.startsWith('Bearer ')) {
      const user = await authenticateBearer(env, authorization);
      if (!user) return unauthorized(reply, 'Invalid or expired access token');
      request.user = user;
      request.authMethod = 'bearer';
      return;
    }

    if (options?.optional) return;
    return unauthorized(reply, 'Unsupported Authorization scheme');
  };
}

/** Authorization guard — call after authenticate. */
export function requireRoles(...allowed: Role[]) {
  return async function authorize(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return unauthorized(reply);
    }
    if (!hasRole(request.user.role, allowed)) {
      return forbidden(reply, 'You do not have permission to access this resource');
    }
  };
}
