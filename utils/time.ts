/**
 * Calendar maths in the business timezone (Nigeria by default), so "this
 * month" means the Lagos month regardless of where the server runs.
 */
export const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Africa/Lagos';

export type Period = 'week' | 'month' | 'year';

export const isPeriod = (value: unknown): value is Period =>
  value === 'week' || value === 'month' || value === 'year';

interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;
  weekday: number; // 1 = Monday … 7 = Sunday
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Wall-clock parts of [date] in [tz]. */
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

/** Offset of [tz] from UTC at [date], in milliseconds. */
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

/** The instant of local midnight on the given calendar day in [tz]. */
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

/** The current calendar week (Mon–Sun), month or year containing [now]. */
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

/** The window immediately before [currentWindow] of the same period. */
export const previousWindow = (
  period: Period,
  now = new Date(),
  tz = APP_TIMEZONE,
): PeriodWindow => {
  const current = currentWindow(period, now, tz);
  // One millisecond before this window's start lies in the previous one.
  return currentWindow(period, new Date(current.start.getTime() - 1), tz);
};

/** Number of days in a month (month is 1-12). */
export const daysInMonth = (year: number, month: number): number =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();
