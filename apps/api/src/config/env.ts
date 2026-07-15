import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().default(3000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  GOOGLE_REDIRECT_URI: z
    .string()
    .url()
    .default('http://localhost:3000/api/v1/auth/oauth/google/callback'),
  OIDC_FRONTEND_CALLBACK: z.string().url().default('http://localhost:5173/oauth/callback'),
  OPENWEATHER_API_KEY: z
    .string()
    .default('')
    .transform((value) => value.trim()),
  OPENWEATHER_BASE_URL: z
    .string()
    .url()
    .default('https://api.openweathermap.org')
    .transform((value) => value.replace(/\/$/, '')),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }
  return parsed.data;
}

export function assertGoogleOidcConfigured(env: Env) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new Error(
      'Google OIDC is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
    );
  }
}

export function assertOpenWeatherConfigured(env: Env) {
  if (!env.OPENWEATHER_API_KEY) {
    throw Object.assign(
      new Error('OpenWeatherMap is not configured. Set OPENWEATHER_API_KEY.'),
      { statusCode: 503, code: 'WEATHER_UNAVAILABLE' },
    );
  }
}
