import { MAX_UPDATE_INTERVAL_MINUTES, MIN_UPDATE_INTERVAL_MINUTES } from '~/types/updateNotifications'

export type IntervalUnit = 'minutes' | 'hours'

/** An interval shown as the largest whole unit: 30 → 30 minutes, 60 → 1 hour, 90 → 90 minutes, 1440 → 24 hours. */
export const splitInterval = (minutes: number): { value: number; unit: IntervalUnit } =>
  minutes % 60 === 0 ? { value: minutes / 60, unit: 'hours' } : { value: minutes, unit: 'minutes' }

export const toMinutes = (value: number, unit: IntervalUnit): number => unit === 'hours' ? value * 60 : value

/** Whole minutes from 15 minutes to 24 hours (REQ-001, REQ-011, REQ-012). */
export const isValidIntervalMinutes = (minutes: number): boolean =>
  Number.isInteger(minutes) && minutes >= MIN_UPDATE_INTERVAL_MINUTES && minutes <= MAX_UPDATE_INTERVAL_MINUTES

/** "30 minutes", "1 hour", "90 minutes" for sentences; `t` is the localization function. */
export const describeInterval = (minutes: number, t: (key: string, params?: Record<string, unknown>) => string): string => {
  const { value, unit } = splitInterval(minutes)
  return t(`settings.notifications.interval.${unit}.${value === 1 ? 'one' : 'other'}`, { count: value })
}
