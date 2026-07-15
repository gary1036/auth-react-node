import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { Role, UserStatus } from '../auth/roles.js';
import { toAuthUser, toPublicUser, usernameFromEmail } from '../auth/user.js';
import { assertGoogleOidcConfigured, type Env } from '../config/env.js';
import {
  createGoogleAuthorizationRequest,
  handleGoogleOidcCallback,
} from '../lib/google-oidc.js';
import { prisma } from '../lib/prisma.js';
import {
  hashPassword,
  issueTokenPair,
  revokeRefreshToken,
  rotateRefreshToken,
  verifyPassword,
} from '../lib/tokens.js';
import { createAuthenticate } from '../middleware/authenticate.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(120).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

async function uniqueUsername(email: string): Promise<string> {
  const base = usernameFromEmail(email);
  let candidate = base;
  let i = 0;
  while (await prisma.user.findUnique({ where: { username: candidate } })) {
    i += 1;
    candidate = `${base}${i}`.slice(0, 40);
  }
  return candidate;
}

export const authRoutes: FastifyPluginAsync<{ env: Env }> = async (app, opts) => {
  const { env } = opts;
  const authenticate = createAuthenticate(env);

  app.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      return reply.status(409).send({
        error: { message: 'Email already registered', code: 'EMAIL_EXISTS' },
      });
    }

    const passwordHash = await hashPassword(body.password);
    const username = await uniqueUsername(body.email);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        username,
        passwordHash,
        name: body.name ?? null,
        role: Role.USER,
        status: UserStatus.ACTIVE,
      },
    });

    const authUser = toAuthUser(user);
    const tokens = await issueTokenPair(env, authUser);

    return reply.status(201).send({
      data: {
        user: toPublicUser(user),
        ...tokens,
      },
    });
  });

  app.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user?.passwordHash) {
      return reply.status(401).send({
        error: { message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' },
      });
    }

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({
        error: { message: 'Invalid email or password', code: 'INVALID_CREDENTIALS' },
      });
    }

    if (user.status !== UserStatus.ACTIVE) {
      return reply.status(403).send({
        error: { message: 'Account is inactive', code: 'ACCOUNT_INACTIVE' },
      });
    }

    const authUser = toAuthUser(user);
    const tokens = await issueTokenPair(env, authUser);

    return {
      data: {
        user: toPublicUser(user),
        ...tokens,
      },
    };
  });

  app.post('/refresh', async (request, reply) => {
    const body = refreshSchema.parse(request.body);
    try {
      const tokens = await rotateRefreshToken(env, body.refreshToken);
      return { data: tokens };
    } catch {
      return reply.status(401).send({
        error: { message: 'Invalid or expired refresh token', code: 'INVALID_REFRESH' },
      });
    }
  });

  app.post('/logout', async (request) => {
    const body = refreshSchema.safeParse(request.body);
    if (body.success) {
      await revokeRefreshToken(body.data.refreshToken);
    }
    return { data: { success: true } };
  });

  app.get('/me', { preHandler: authenticate }, async (request) => {
    return {
      data: {
        user: request.user,
        authMethod: request.authMethod,
      },
    };
  });

  app.get('/oauth/google/authorize', async (_request, reply) => {
    try {
      assertGoogleOidcConfigured(env);
      const { authorizeUrl } = await createGoogleAuthorizationRequest(env);
      return reply.redirect(authorizeUrl);
    } catch (error) {
      console.error('[google-oidc]', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Google OIDC unavailable. Check GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.';
      return reply.status(503).send({
        error: {
          message,
          code: 'GOOGLE_OIDC_UNAVAILABLE',
        },
      });
    }
  });

  app.get('/oauth/google/callback', async (request, reply) => {
    try {
      const protocol = request.headers['x-forwarded-proto'] ?? request.protocol;
      const host = request.headers['x-forwarded-host'] ?? request.headers.host;
      const callbackUrl = new URL(request.url, `${protocol}://${host}`);

      const result = await handleGoogleOidcCallback(env, callbackUrl);
      const params = new URLSearchParams({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        tokenType: result.tokenType,
        expiresIn: String(result.expiresIn),
      });

      return reply.redirect(`${env.OIDC_FRONTEND_CALLBACK}?${params.toString()}`);
    } catch (error) {
      console.error('[google-oidc]', error);
      const message = error instanceof Error ? error.message : 'Google OAuth callback failed';
      const params = new URLSearchParams({ error: message });
      return reply.redirect(`${env.OIDC_FRONTEND_CALLBACK}?${params.toString()}`);
    }
  });
};
