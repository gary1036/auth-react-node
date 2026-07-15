import { owmIconUrl } from '../api/weatherClient';
import type { WeatherBundle } from '../types';

export function WeatherHero({ weather }: { weather: WeatherBundle }) {
  const { location, current } = weather;
  const place = [location.name, location.state, location.country].filter(Boolean).join(', ');

  return (
    <section className="weather-hero panel stretch">
      <div className="weather-hero-main">
        <img src={owmIconUrl(current.iconCode)} alt={current.description} width={96} height={96} />
        <div>
          <p className="weather-place">{place}</p>
          <p className="weather-temp">{Math.round(current.tempC)}°</p>
          <p className="weather-desc">{current.description}</p>
          <p className="muted">
            Feels like {Math.round(current.feelsLikeC)}° · H {Math.round(current.tempMaxC)}° / L{' '}
            {Math.round(current.tempMinC)}°
          </p>
        </div>
      </div>
      <p className="muted weather-updated">
        Updated {new Date(current.updatedAtIso).toLocaleString()}
        {weather.meta.cached ? ' · cached' : ''}
      </p>
    </section>
  );
}
