import { useEffect, useState } from 'react';
import { weatherApi } from '../api/weatherClient';
import type { GeoSuggestion } from '../types';

export function useGeoSuggest(query: string) {
  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      void weatherApi
        .suggest(trimmed, controller.signal)
        .then((response) => {
          setSuggestions(response.data);
          setError(null);
        })
        .catch((err: unknown) => {
          if (err instanceof Error && err.name === 'AbortError') return;
          setSuggestions([]);
          setError(err instanceof Error ? err.message : 'Suggest failed');
        })
        .finally(() => setLoading(false));
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return { suggestions, loading, error };
}
