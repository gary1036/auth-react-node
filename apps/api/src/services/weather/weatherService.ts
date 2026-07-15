import type { Env } from '../../config/env.js';
import { createOwmClient, WeatherUpstreamError } from './owmClient.js';
import { normalizeSuggestions, normalizeWeatherBundle } from './normalize.js';
import type { GeoSuggestion, WeatherBundle } from './types.js';

export function createWeatherService(env: Env) {
  const owm = createOwmClient(env);

  return {
    async getByCoords(lat: number, lon: number): Promise<WeatherBundle> {
      const [current, forecast, reverseList] = await Promise.all([
        owm.current(lat, lon),
        owm.forecast(lat, lon),
        owm.reverse(lat, lon).catch(() => [] as Awaited<ReturnType<typeof owm.reverse>>),
      ]);

      return normalizeWeatherBundle(current, forecast, reverseList[0]);
    },

    async suggest(q: string, limit = 5): Promise<GeoSuggestion[]> {
      const trimmed = q.trim();
      if (trimmed.length < 2) return [];
      const items = await owm.suggest(trimmed, limit);
      return normalizeSuggestions(items);
    },
  };
}

export { WeatherUpstreamError };
