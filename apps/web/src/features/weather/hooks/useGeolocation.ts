import { useCallback, useEffect, useRef, useState } from 'react';

export type GeoPosition = { lat: number; lon: number };

export type GeolocationState = {
  status: 'idle' | 'prompting' | 'granted' | 'denied' | 'unsupported' | 'error';
  position: GeoPosition | null;
  error: string | null;
  request: () => void;
};

export function useGeolocation(autoRequest = true): GeolocationState {
  const [status, setStatus] = useState<GeolocationState['status']>('idle');
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requested = useRef(false);

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('unsupported');
      setError('Geolocation is not supported in this browser.');
      return;
    }

    setStatus('prompting');
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
        setStatus('granted');
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('denied');
          setError('Location permission denied. Search for a city instead.');
        } else {
          setStatus('error');
          setError(err.message || 'Unable to get current location.');
        }
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60_000 },
    );
  }, []);

  useEffect(() => {
    if (!autoRequest || requested.current) return;
    requested.current = true;
    request();
  }, [autoRequest, request]);

  return { status, position, error, request };
}
