import { owmIconUrl } from '../api/weatherClient';
import type { WeatherBundle } from '../types';

export function HourlyForecast({ weather }: { weather: WeatherBundle }) {
  return (
    <section className="panel stretch forecast-block">
      <h2>Next hours</h2>
      <div className="hourly-strip">
        {weather.hourly.map((slot) => (
          <div key={slot.timeIso} className="hourly-item">
            <span className="muted">
              {new Date(slot.timeIso).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            <img src={owmIconUrl(slot.iconCode)} alt={slot.description} width={48} height={48} />
            <strong>{Math.round(slot.tempC)}°</strong>
            <span className="muted hourly-desc">{slot.description}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
