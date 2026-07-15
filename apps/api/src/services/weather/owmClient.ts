import type { Env } from '../../config/env.js';
import { assertOpenWeatherConfigured } from '../../config/env.js';

export class WeatherUpstreamError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 502, code = 'UPSTREAM') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

type FetchJsonOptions = {
  path: string;
  query: Record<string, string | number | undefined>;
};

async function fetchOwmJson<T>(env: Env, options: FetchJsonOptions): Promise<T> {
  assertOpenWeatherConfigured(env);

  const url = new URL(options.path, env.OPENWEATHER_BASE_URL);
  for (const [key, value] of Object.entries(options.query)) {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  url.searchParams.set('appid', env.OPENWEATHER_API_KEY);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (response.status === 401 || response.status === 403) {
      const body = await response.text().catch(() => '');
      console.error('[owm]', response.status, body.slice(0, 300));
      throw new WeatherUpstreamError(
        'OpenWeatherMap rejected the API key (401/403). New keys can take up to ~2 hours to activate — verify the key on https://home.openweathermap.org/api_keys and recreate the API container after updating .env.',
        503,
        'WEATHER_UNAVAILABLE',
      );
    }
    if (response.status === 404) {
      throw new WeatherUpstreamError('Location not found', 404, 'NOT_FOUND');
    }
    if (response.status === 429) {
      throw new WeatherUpstreamError('OpenWeatherMap rate limit exceeded', 429, 'RATE_LIMIT');
    }
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error('[owm]', response.status, body.slice(0, 300));
      throw new WeatherUpstreamError(
        `OpenWeatherMap error (${response.status})`,
        502,
        'UPSTREAM',
      );
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof WeatherUpstreamError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new WeatherUpstreamError('Weather request timed out', 504, 'TIMEOUT');
    }
    throw new WeatherUpstreamError('Failed to reach OpenWeatherMap', 502, 'NETWORK');
  } finally {
    clearTimeout(timeout);
  }
}

export type OwmCurrent = {
  name: string;
  coord: { lat: number; lon: number };
  weather: Array<{ id: number; main: string; description: string; icon: string }>;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
  };
  visibility?: number;
  wind: { speed: number; deg: number };
  sys: { country: string; sunrise: number; sunset: number };
  dt: number;
  timezone: number;
  pop?: number;
};

export type OwmForecast = {
  list: Array<{
    dt: number;
    main: { temp: number; temp_min: number; temp_max: number };
    weather: Array<{ description: string; icon: string; main: string }>;
    pop?: number;
    dt_txt: string;
  }>;
  city: {
    name: string;
    country: string;
    coord: { lat: number; lon: number };
    timezone: number;
    sunrise: number;
    sunset: number;
  };
};

export type OwmGeo = {
  name: string;
  local_names?: Record<string, string>;
  lat: number;
  lon: number;
  country: string;
  state?: string;
};

export function createOwmClient(env: Env) {
  return {
    current(lat: number, lon: number, lang = 'en') {
      return fetchOwmJson<OwmCurrent>(env, {
        path: '/data/2.5/weather',
        query: { lat, lon, units: 'metric', lang },
      });
    },
    forecast(lat: number, lon: number, lang = 'en') {
      return fetchOwmJson<OwmForecast>(env, {
        path: '/data/2.5/forecast',
        query: { lat, lon, units: 'metric', lang },
      });
    },
    reverse(lat: number, lon: number) {
      return fetchOwmJson<OwmGeo[]>(env, {
        path: '/geo/1.0/reverse',
        query: { lat, lon, limit: 1 },
      });
    },
    suggest(q: string, limit = 5) {
      return fetchOwmJson<OwmGeo[]>(env, {
        path: '/geo/1.0/direct',
        query: { q, limit },
      });
    },
  };
}
