
export const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Africa/Lagos';
export type Period = 'week' | 'month' | 'year';
export const isPeriod = (value: unknown): value is Period =>
  value === 'week' || value === 'month' || value === 'year';
interface ZonedParts {
  year: number;
  month: number;
  day: number;
  weekday: number;
}
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const zonedParts = (date: Date, tz = APP_TIMEZONE): ZonedParts => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      weekday: 'short',
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    weekday: WEEKDAYS.indexOf(parts.weekday) + 1,
  };
};
const offsetMs = (date: Date, tz: string): number => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    })
      .formatToParts(date)
      .map((p) => [p.type, Number(p.value)]),
  );
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return asUtc - (date.getTime() - date.getMilliseconds());
};
export const zonedMidnight = (
  year: number,
  month: number,
  day: number,
  tz = APP_TIMEZONE,
): Date => {
  const guess = new Date(Date.UTC(year, month - 1, day));
  return new Date(guess.getTime() - offsetMs(guess, tz));
};
export interface PeriodWindow {
  start: Date;
  end: Date;
}
export const currentWindow = (
  period: Period,
  now = new Date(),
  tz = APP_TIMEZONE,
): PeriodWindow => {
  const p = zonedParts(now, tz);
  switch (period) {
    case 'week': {
      const start = zonedMidnight(p.year, p.month, p.day - (p.weekday - 1), tz);
      const end = zonedMidnight(p.year, p.month, p.day - (p.weekday - 1) + 7, tz);
      return { start, end };
    }
    case 'month':
      return {
        start: zonedMidnight(p.year, p.month, 1, tz),
        end: zonedMidnight(p.year, p.month + 1, 1, tz),
      };
    case 'year':
      return {
        start: zonedMidnight(p.year, 1, 1, tz),
        end: zonedMidnight(p.year + 1, 1, 1, tz),
      };
  }
};
export const previousWindow = (
  period: Period,
  now = new Date(),
  tz = APP_TIMEZONE,
): PeriodWindow => {
  const current = currentWindow(period, now, tz);
  return currentWindow(period, new Date(current.start.getTime() - 1), tz);
};
export const daysInMonth = (year: number, month: number): number =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();
