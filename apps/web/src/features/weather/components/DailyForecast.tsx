import { owmIconUrl } from '../api/weatherClient';
import type { WeatherBundle } from '../types';

export function DailyForecast({ weather }: { weather: WeatherBundle }) {
  return (
    <section className="panel stretch forecast-block">
      <h2>Upcoming days</h2>
      <ul className="daily-list">
        {weather.daily.map((day) => (
          <li key={day.dateIso}>
            <span className="daily-day">{day.weekday}</span>
            <img src={owmIconUrl(day.iconCode)} alt={day.description} width={40} height={40} />
            <span className="muted daily-desc">{day.description}</span>
            <span className="daily-temps">
              <strong>{Math.round(day.tempMaxC)}°</strong>
              <span className="muted">{Math.round(day.tempMinC)}°</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
