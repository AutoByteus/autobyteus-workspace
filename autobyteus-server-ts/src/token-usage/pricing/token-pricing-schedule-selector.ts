import type {
  TokenPricingSchedule,
  TokenPricingScheduleHistory,
  TokenPricingSchedulePeriod,
} from 'autobyteus-ts/llm/utils/token-pricing-schedule.js';

export type SelectedTokenPricingSchedule = {
  schedule: TokenPricingSchedule;
  period: TokenPricingSchedulePeriod;
};

const ISO_WEEKDAYS = new Map([
  ['Monday', 1], ['Tuesday', 2], ['Wednesday', 3], ['Thursday', 4],
  ['Friday', 5], ['Saturday', 6], ['Sunday', 7],
]);

type TimeCoordinates = { minute: number; day: number };

const getTimeCoordinates = (instant: Date, timezone: string): TimeCoordinates | null => {
  try {
    const parts = new Intl.DateTimeFormat('en-US-u-ca-iso8601', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'long',
      hourCycle: 'h23',
    }).formatToParts(instant);
    const value = (type: string) => parts.find((part) => part.type === type)?.value;
    const hour = Number(value('hour'));
    const minute = Number(value('minute'));
    const day = ISO_WEEKDAYS.get(value('weekday') ?? '');
    return Number.isInteger(hour) && Number.isInteger(minute) && day
      ? { minute: hour * 60 + minute, day }
      : null;
  } catch {
    return null;
  }
};

const isEligible = (schedule: TokenPricingSchedule, instantMs: number): boolean => {
  if (schedule.effectiveFrom === null) return true;
  const effectiveMs = Date.parse(schedule.effectiveFrom);
  return !Number.isNaN(effectiveMs) && effectiveMs <= instantMs;
};

const selectLatestEligible = (
  history: TokenPricingScheduleHistory,
  instantMs: number,
): TokenPricingSchedule | null => {
  const eligible = history.filter((schedule) => isEligible(schedule, instantMs));
  return eligible.reduce<TokenPricingSchedule | null>((latest, schedule) => {
    if (!latest || latest.effectiveFrom === null) return schedule;
    if (schedule.effectiveFrom === null) return latest;
    return Date.parse(schedule.effectiveFrom) > Date.parse(latest.effectiveFrom) ? schedule : latest;
  }, null);
};

export const selectTokenPricingSchedulePeriod = (
  history: TokenPricingScheduleHistory,
  observedAt: string,
): SelectedTokenPricingSchedule | null => {
  const instant = new Date(observedAt);
  if (Number.isNaN(instant.getTime())) return null;
  const schedule = selectLatestEligible(history, instant.getTime());
  if (!schedule) return null;
  if (schedule.kind === 'fixed') return { schedule, period: schedule.period };

  const windowCoordinates = getTimeCoordinates(instant, schedule.windowTimezone);
  const calendarCoordinates = getTimeCoordinates(instant, schedule.peakDaysTimezone);
  if (!windowCoordinates || !calendarCoordinates) return null;
  const eligibleDay = schedule.peakDays.includes(calendarCoordinates.day);
  const matchingWindow = eligibleDay
    ? schedule.peakWindows.find((window) =>
      windowCoordinates.minute >= window.startMinute && windowCoordinates.minute < window.endMinute)
    : undefined;
  const periodId = matchingWindow?.periodId ?? schedule.defaultPeriodId;
  const period = schedule.periods.find((candidate) => candidate.periodId === periodId);
  return period ? { schedule, period } : null;
};
