import type { WeatherBundle } from '../types';

function formatVisibility(meters: number | null) {
  if (meters == null) return '—';
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function WeatherMetrics({ weather }: { weather: WeatherBundle }) {
  const { current } = weather;
  const items = [
    { label: 'Humidity', value: `${current.humidityPct}%` },
    { label: 'Pressure', value: `${current.pressureHpa} hPa` },
    {
      label: 'Wind',
      value: `${current.windSpeedMps.toFixed(1)} m/s ${current.windDirectionLabel}`,
    },
    { label: 'Visibility', value: formatVisibility(current.visibilityM) },
    {
      label: 'UV Index',
      value: current.uvIndex == null ? 'N/A' : String(current.uvIndex),
    },
    {
      label: 'Precip chance',
      value:
        current.precipProbability == null
          ? 'N/A'
          : `${Math.round(current.precipProbability * 100)}%`,
    },
    { label: 'Sunrise', value: formatTime(current.sunriseIso) },
    { label: 'Sunset', value: formatTime(current.sunsetIso) },
  ];

  return (
    <section className="weather-metrics panel stretch">
      <h2>Details</h2>
      <div className="metrics-grid">
        {items.map((item) => (
          <div key={item.label} className="metric-item">
            <span className="muted">{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
