import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { Role } from '../auth/roles.js';
import type { Env } from '../config/env.js';
import { createAuthenticate, requireRoles } from '../middleware/authenticate.js';
import { createWeatherService, WeatherUpstreamError } from '../services/weather/weatherService.js';

const coordsSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

const suggestSchema = z.object({
  q: z.string().min(1).max(120),
  limit: z.coerce.number().int().min(1).max(10).optional(),
});

export const weatherRoutes: FastifyPluginAsync<{ env: Env }> = async (app, opts) => {
  const authenticate = createAuthenticate(opts.env);
  const allowWeather = requireRoles(Role.ADMIN, Role.USER);
  const weather = createWeatherService(opts.env);

  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', allowWeather);

  app.get('/by-coords', async (request, reply) => {
    try {
      const query = coordsSchema.parse(request.query);
      const data = await weather.getByCoords(query.lat, query.lon);
      return { data };
    } catch (error) {
      return sendWeatherError(reply, error);
    }
  });

  app.get('/geo/suggest', async (request, reply) => {
    try {
      const query = suggestSchema.parse(request.query);
      const data = await weather.suggest(query.q, query.limit ?? 5);
      return { data };
    } catch (error) {
      return sendWeatherError(reply, error);
    }
  });
};

function sendWeatherError(
  reply: { status: (code: number) => { send: (body: unknown) => unknown } },
  error: unknown,
) {
  if (error instanceof WeatherUpstreamError) {
    return reply.status(error.statusCode).send({
      error: { message: error.message, code: error.code },
    });
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof (error as { statusCode: unknown }).statusCode === 'number'
  ) {
    const err = error as { statusCode: number; message: string; code?: string };
    return reply.status(err.statusCode).send({
      error: {
        message: err.message,
        code: err.code ?? 'WEATHER_ERROR',
      },
    });
  }

  throw error;
}
