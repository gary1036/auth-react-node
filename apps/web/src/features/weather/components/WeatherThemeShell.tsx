import type { ConditionGroup } from '../types';
import type { ReactNode } from 'react';

export function WeatherThemeShell({
  condition,
  isDay,
  children,
}: {
  condition?: ConditionGroup;
  isDay?: boolean;
  children: ReactNode;
}) {
  const theme = condition ?? 'clear';
  const mode = isDay === false ? 'night' : 'day';

  return (
    <div className={`weather-theme theme-${theme} theme-${mode}`}>
      <div className="weather-fx" aria-hidden />
      {children}
    </div>
  );
}
