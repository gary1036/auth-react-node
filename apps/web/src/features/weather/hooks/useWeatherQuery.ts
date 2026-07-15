import { useCallback, useEffect, useRef, useState } from 'react';
import { weatherApi } from '../api/weatherClient';
import {
  invalidateWeatherCache,
  readWeatherCache,
  weatherCacheKey,
  writeWeatherCache,
} from '../cache/weatherCache';
import type { WeatherBundle } from '../types';

export function useWeatherQuery() {
  const [data, setData] = useState<WeatherBundle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadByCoords = useCallback(async (lat: number, lon: number, force = false) => {
    const key = weatherCacheKey(lat, lon);
    if (!force) {
      const cached = readWeatherCache(key);
      if (cached) {
        setData(cached);
        setError(null);
        return;
      }
    } else {
      invalidateWeatherCache(key);
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const response = await weatherApi.byCoords(lat, lon, controller.signal);
      writeWeatherCache(key, response.data);
      setData(response.data);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Failed to load weather');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  return { data, loading, error, loadByCoords, setError };
}
