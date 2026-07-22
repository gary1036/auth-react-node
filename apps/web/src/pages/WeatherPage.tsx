import { AppShell } from '../components/AppShell';
import { HourlyForecast } from '../features/weather/components/HourlyForecast';
import { DailyForecast } from '../features/weather/components/DailyForecast';
import { WeatherHero } from '../features/weather/components/WeatherHero';
import { WeatherMetrics } from '../features/weather/components/WeatherMetrics';
import { WeatherSearch } from '../features/weather/components/WeatherSearch';
import { WeatherThemeShell } from '../features/weather/components/WeatherThemeShell';
import { useGeolocation } from '../features/weather/hooks/useGeolocation';
import { useWeatherQuery } from '../features/weather/hooks/useWeatherQuery';
import type { GeoSuggestion } from '../features/weather/types';
import { useEffect } from 'react';

export function WeatherPage() {
  const geo = useGeolocation(true);
  const { data, loading, error, loadByCoords, setError } = useWeatherQuery();

  useEffect(() => {
    if (geo.position) {
      void loadByCoords(geo.position.lat, geo.position.lon);
    }
  }, [geo.position, loadByCoords]);

  function onSelectSuggestion(item: GeoSuggestion) {
    void loadByCoords(item.lat, item.lon, true);
  }

  return (
    <WeatherThemeShell condition={data?.current.conditionGroup} isDay={data?.current.isDay}>
      <AppShell
        title="Weather"
        subtitle="Live conditions — locate yourself or search a place."
      >
        <section className="panel stretch weather-toolbar">
          <WeatherSearch onSelect={onSelectSuggestion} />
          <div className="weather-actions">
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setError(null);
                geo.request();
              }}
            >
              Use my location
            </button>
            <button
              type="button"
              onClick={() => {
                if (data) {
                  void loadByCoords(data.location.lat, data.location.lon, true);
                } else if (geo.position) {
                  void loadByCoords(geo.position.lat, geo.position.lon, true);
                }
              }}
              disabled={loading || (!data && !geo.position)}
            >
              Refresh
            </button>
          </div>
          {geo.status === 'denied' || geo.status === 'error' || geo.status === 'unsupported' ? (
            <p className="error">{geo.error}</p>
          ) : null}
          {geo.status === 'prompting' ? <p className="muted">Requesting location…</p> : null}
        </section>

        {loading && !data ? (
          <section className="panel stretch">
            <div className="weather-skeleton" />
            <p className="muted">Loading weather…</p>
          </section>
        ) : null}

        {error ? (
          <section className="panel stretch">
            <p className="error">{error}</p>
            <button
              type="button"
              onClick={() => {
                if (data) void loadByCoords(data.location.lat, data.location.lon, true);
                else if (geo.position) void loadByCoords(geo.position.lat, geo.position.lon, true);
              }}
            >
              Retry
            </button>
          </section>
        ) : null}

        {!loading && !error && !data ? (
          <section className="panel stretch">
            <p className="muted">
              No weather yet. Allow location access or search for a city above.
            </p>
          </section>
        ) : null}

        {data ? (
          <>
            <WeatherHero weather={data} />
            <WeatherMetrics weather={data} />
            <HourlyForecast weather={data} />
            <DailyForecast weather={data} />
          </>
        ) : null}
      </AppShell>
    </WeatherThemeShell>
  );
}
