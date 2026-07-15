import { getAccessToken } from '../../../lib/api';
import type { GeoSuggestion, WeatherBundle } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

async function weatherFetch<T>(path: string, signal?: AbortSignal): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, { headers, signal });
  const json = (await response.json()) as T & {
    error?: { message?: string; code?: string };
  };

  if (!response.ok) {
    throw new Error(json.error?.message ?? `Weather request failed (${response.status})`);
  }

  return json;
}

export const weatherApi = {
  byCoords(lat: number, lon: number, signal?: AbortSignal) {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
    });
    return weatherFetch<{ data: WeatherBundle }>(`/weather/by-coords?${params}`, signal);
  },
  suggest(q: string, signal?: AbortSignal) {
    const params = new URLSearchParams({ q, limit: '5' });
    return weatherFetch<{ data: GeoSuggestion[] }>(`/weather/geo/suggest?${params}`, signal);
  },
};

export function owmIconUrl(iconCode: string) {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
}
