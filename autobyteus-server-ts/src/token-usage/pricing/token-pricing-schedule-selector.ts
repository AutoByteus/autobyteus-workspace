import type { TokenPricingSchedule, TokenPricingScheduleHistory, TokenPricingSchedulePeriod } from 'autobyteus-ts/llm/utils/token-pricing-schedule.js';

export type SelectedTokenPricingSchedule = {
  schedule: TokenPricingSchedule;
  period: TokenPricingSchedulePeriod;
};

const weekday = new Map([['Monday', 1], ['Tuesday', 2], ['Wednesday', 3], ['Thursday', 4], ['Friday', 5], ['Saturday', 6], ['Sunday', 7]]);
const coordinates = (instant: Date, timezone: string): { minute: number; day: number } | null => {
  try {
    const parts = new Intl.DateTimeFormat('en-US-u-ca-iso8601', { timeZone: timezone, hour: '2-digit', minute: '2-digit', weekday: 'long', hourCycle: 'h23' }).formatToParts(instant);
    const get = (type: string) => parts.find((part) => part.type === type)?.value;
    const hour = Number(get('hour')); const minute = Number(get('minute')); const day = weekday.get(get('weekday') ?? '');
    return Number.isInteger(hour) && Number.isInteger(minute) && day ? { minute: hour * 60 + minute, day } : null;
  } catch { return null; }
};

export const selectTokenPricingSchedulePeriod = (history: TokenPricingScheduleHistory, observedAt: string): SelectedTokenPricingSchedule | null => {
  const instant = new Date(observedAt);
  if (Number.isNaN(instant.getTime())) return null;
  const eligible = history.filter((schedule) => schedule.effectiveFrom === null || !Number.isNaN(Date.parse(schedule.effectiveFrom)) && Date.parse(schedule.effectiveFrom) <= instant.getTime());
  if (eligible.length === 0) return null;
  const effective = eligible.reduce((best, current) => (best.effectiveFrom === null || (current.effectiveFrom !== null && Date.parse(current.effectiveFrom) > Date.parse(best.effectiveFrom))) ? current : best);
  if (effective.kind === 'fixed') return { schedule: effective, period: effective.period };
  const window = coordinates(instant, effective.windowTimezone);
  const calendar = coordinates(instant, effective.peakDaysTimezone);
  if (!window || !calendar) return null;
  const periodId = effective.peakDays.includes(calendar.day) && effective.peakWindows.some((item) => window.minute >= item.startMinute && window.minute < item.endMinute)
    ? effective.peakWindows.find((item) => window.minute >= item.startMinute && window.minute < item.endMinute)?.periodId
    : effective.defaultPeriodId;
  const period = effective.periods.find((item) => item.periodId === periodId);
  return period ? { schedule: effective, period } : null;
};
