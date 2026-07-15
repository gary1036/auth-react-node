import type { WeatherBundle } from '../types';

const MEMORY = new Map<string, { expiresAt: number; data: WeatherBundle }>();
const TTL_MS = 10 * 60 * 1000;
const PREFIX = 'weather:v1:';

function roundCoord(value: number) {
  return value.toFixed(3);
}

export function weatherCacheKey(lat: number, lon: number) {
  return `${PREFIX}${roundCoord(lat)}:${roundCoord(lon)}:metric`;
}

export function readWeatherCache(key: string): WeatherBundle | null {
  const mem = MEMORY.get(key);
  if (mem && mem.expiresAt > Date.now()) {
    return { ...mem.data, meta: { ...mem.data.meta, cached: true } };
  }

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { expiresAt: number; data: WeatherBundle };
    if (parsed.expiresAt <= Date.now()) {
      localStorage.removeItem(key);
      return null;
    }
    MEMORY.set(key, parsed);
    return { ...parsed.data, meta: { ...parsed.data.meta, cached: true } };
  } catch {
    return null;
  }
}

export function writeWeatherCache(key: string, data: WeatherBundle) {
  const entry = { expiresAt: Date.now() + TTL_MS, data };
  MEMORY.set(key, entry);
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // ignore quota errors
  }
}

export function invalidateWeatherCache(key: string) {
  MEMORY.delete(key);
  localStorage.removeItem(key);
}
