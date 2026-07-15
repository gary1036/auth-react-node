export type ConditionGroup =
  | 'clear'
  | 'clouds'
  | 'rain'
  | 'drizzle'
  | 'thunderstorm'
  | 'snow'
  | 'atmosphere';

export type WeatherLocation = {
  name: string;
  state: string | null;
  country: string;
  countryCode: string;
  lat: number;
  lon: number;
  timezoneOffsetSec: number;
};

export type WeatherCurrent = {
  tempC: number;
  feelsLikeC: number;
  tempMinC: number;
  tempMaxC: number;
  humidityPct: number;
  pressureHpa: number;
  windSpeedMps: number;
  windDeg: number;
  windDirectionLabel: string;
  visibilityM: number | null;
  uvIndex: number | null;
  precipProbability: number | null;
  description: string;
  iconCode: string;
  conditionGroup: ConditionGroup;
  sunriseIso: string;
  sunsetIso: string;
  updatedAtIso: string;
  isDay: boolean;
};

export type WeatherHourly = {
  timeIso: string;
  tempC: number;
  iconCode: string;
  description: string;
  precipProbability: number | null;
};

export type WeatherDaily = {
  dateIso: string;
  weekday: string;
  tempMinC: number;
  tempMaxC: number;
  iconCode: string;
  description: string;
};

export type WeatherBundle = {
  location: WeatherLocation;
  current: WeatherCurrent;
  hourly: WeatherHourly[];
  daily: WeatherDaily[];
  meta: {
    source: 'owm';
    cached: boolean;
    cacheExpiresAtIso: string | null;
    units: 'metric';
  };
};

export type GeoSuggestion = {
  id: string;
  label: string;
  name: string;
  state: string | null;
  country: string;
  countryCode: string;
  lat: number;
  lon: number;
};
