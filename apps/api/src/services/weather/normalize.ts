import type { ConditionGroup, GeoSuggestion, WeatherBundle } from './types.js';
import type { OwmCurrent, OwmForecast, OwmGeo } from './owmClient.js';

const DEG_LABELS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

export function windDirectionLabel(deg: number): string {
  const index = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
  return DEG_LABELS[index];
}

export function mapConditionGroup(main: string): ConditionGroup {
  const key = main.toLowerCase();
  if (key === 'clear') return 'clear';
  if (key === 'clouds') return 'clouds';
  if (key === 'rain') return 'rain';
  if (key === 'drizzle') return 'drizzle';
  if (key === 'thunderstorm') return 'thunderstorm';
  if (key === 'snow') return 'snow';
  return 'atmosphere';
}

function localParts(unixSec: number, timezoneOffsetSec: number) {
  const shifted = new Date((unixSec + timezoneOffsetSec) * 1000);
  return {
    dateKey: shifted.toISOString().slice(0, 10),
    weekday: shifted.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
    hourLabel: shifted.toISOString(),
  };
}

export function normalizeSuggestions(items: OwmGeo[]): GeoSuggestion[] {
  return items.map((item) => {
    const parts = [item.name, item.state, item.country].filter(Boolean);
    return {
      id: `${item.lat.toFixed(4)},${item.lon.toFixed(4)},${item.country}`,
      label: parts.join(', '),
      name: item.name,
      state: item.state ?? null,
      country: item.country,
      countryCode: item.country,
      lat: item.lat,
      lon: item.lon,
    };
  });
}

export function normalizeWeatherBundle(
  current: OwmCurrent,
  forecast: OwmForecast,
  reverse: OwmGeo | undefined,
): WeatherBundle {
  const tz = current.timezone ?? forecast.city.timezone ?? 0;
  const weather0 = current.weather[0];
  const nowUnix = current.dt;
  const isDay = nowUnix >= current.sys.sunrise && nowUnix < current.sys.sunset;

  const locationName = reverse?.name ?? current.name ?? forecast.city.name;
  const country = reverse?.country ?? current.sys.country ?? forecast.city.country;

  const hourly = forecast.list.slice(0, 8).map((slot) => ({
    timeIso: new Date(slot.dt * 1000).toISOString(),
    tempC: Math.round(slot.main.temp * 10) / 10,
    iconCode: slot.weather[0]?.icon ?? '01d',
    description: slot.weather[0]?.description ?? '',
    precipProbability: typeof slot.pop === 'number' ? slot.pop : null,
  }));

  const byDay = new Map<
    string,
    {
      dateIso: string;
      weekday: string;
      tempMinC: number;
      tempMaxC: number;
      iconCode: string;
      description: string;
    }
  >();

  for (const slot of forecast.list) {
    const parts = localParts(slot.dt, tz);
    const existing = byDay.get(parts.dateKey);
    const icon = slot.weather[0]?.icon ?? '01d';
    const description = slot.weather[0]?.description ?? '';
    if (!existing) {
      byDay.set(parts.dateKey, {
        dateIso: parts.dateKey,
        weekday: parts.weekday,
        tempMinC: slot.main.temp_min,
        tempMaxC: slot.main.temp_max,
        iconCode: icon,
        description,
      });
    } else {
      existing.tempMinC = Math.min(existing.tempMinC, slot.main.temp_min);
      existing.tempMaxC = Math.max(existing.tempMaxC, slot.main.temp_max);
      if (icon.includes('d')) {
        existing.iconCode = icon;
        existing.description = description;
      }
    }
  }

  const daily = [...byDay.values()].slice(0, 7).map((day) => ({
    ...day,
    tempMinC: Math.round(day.tempMinC * 10) / 10,
    tempMaxC: Math.round(day.tempMaxC * 10) / 10,
  }));

  const nearestPop = forecast.list[0]?.pop;

  return {
    location: {
      name: locationName,
      state: reverse?.state ?? null,
      country,
      countryCode: country,
      lat: current.coord.lat,
      lon: current.coord.lon,
      timezoneOffsetSec: tz,
    },
    current: {
      tempC: Math.round(current.main.temp * 10) / 10,
      feelsLikeC: Math.round(current.main.feels_like * 10) / 10,
      tempMinC: Math.round(current.main.temp_min * 10) / 10,
      tempMaxC: Math.round(current.main.temp_max * 10) / 10,
      humidityPct: current.main.humidity,
      pressureHpa: current.main.pressure,
      windSpeedMps: current.wind.speed,
      windDeg: current.wind.deg ?? 0,
      windDirectionLabel: windDirectionLabel(current.wind.deg ?? 0),
      visibilityM: current.visibility ?? null,
      uvIndex: null,
      precipProbability: typeof nearestPop === 'number' ? nearestPop : null,
      description: weather0?.description ?? '',
      iconCode: weather0?.icon ?? '01d',
      conditionGroup: mapConditionGroup(weather0?.main ?? 'Clear'),
      sunriseIso: new Date(current.sys.sunrise * 1000).toISOString(),
      sunsetIso: new Date(current.sys.sunset * 1000).toISOString(),
      updatedAtIso: new Date(current.dt * 1000).toISOString(),
      isDay,
    },
    hourly,
    daily,
    meta: {
      source: 'owm',
      cached: false,
      cacheExpiresAtIso: null,
      units: 'metric',
    },
  };
}
