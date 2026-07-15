import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { ZodError } from 'zod';
import type { Env } from './config/env.js';
import { authRoutes } from './routes/auth.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { healthRoutes } from './routes/health.js';
import { usersRoutes } from './routes/users.js';
import { weatherRoutes } from './routes/weather.js';

export async function buildApp(env: Env) {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true,
  });

  await app.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Auth API',
        description:
          'RESTful auth API supporting Basic Auth, JWT Bearer tokens, and Google OIDC',
        version: '1.0.0',
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
          basicAuth: {
            type: 'http',
            scheme: 'basic',
          },
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/api/docs',
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.flatten(),
        },
      });
    }

    const statusCode =
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      typeof error.statusCode === 'number'
        ? error.statusCode
        : 500;
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    app.log.error(error);
    return reply.status(statusCode).send({
      error: {
        message: statusCode >= 500 ? 'Internal server error' : message,
        code: statusCode >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR',
      },
    });
  });

  await app.register(healthRoutes, { prefix: '/api/v1' });
  await app.register(authRoutes, { prefix: '/api/v1/auth', env });
  await app.register(dashboardRoutes, { prefix: '/api/v1/dashboard', env });
  await app.register(usersRoutes, { prefix: '/api/v1/users', env });
  await app.register(weatherRoutes, { prefix: '/api/v1/weather', env });

  return app;
}
