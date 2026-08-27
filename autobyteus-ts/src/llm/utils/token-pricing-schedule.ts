export type TokenPricingTrustedDimensions = {
  input: boolean;
  output: boolean;
  cachedInputRead: boolean;
  cachedInputWrite: boolean;
  cachedInputWrite5m: boolean;
  cachedInputWrite1h: boolean;
};

export type TokenPricingSchedulePeriod = {
  periodId: string;
  inputTokenPricing: number;
  outputTokenPricing: number;
  cachedInputReadTokenPricing: number;
  cachedInputWriteTokenPricing?: number;
  trustedDimensions: TokenPricingTrustedDimensions;
};

export type TokenPricingFixedSchedule = {
  kind: 'fixed';
  scheduleId: string;
  effectiveFrom: string | null;
  period: TokenPricingSchedulePeriod;
};

export type TokenPricingTimeWindow = {
  periodId: string;
  startMinute: number;
  endMinute: number;
};

export type TokenPricingTimeWindowSchedule = {
  kind: 'time_window';
  scheduleId: string;
  effectiveFrom: string;
  windowTimezone: string;
  peakDays: readonly number[];
  peakDaysTimezone: string;
  peakWindows: readonly TokenPricingTimeWindow[];
  defaultPeriodId: string;
  periods: readonly TokenPricingSchedulePeriod[];
};

export type TokenPricingSchedule = TokenPricingFixedSchedule | TokenPricingTimeWindowSchedule;
export type TokenPricingScheduleHistory = readonly TokenPricingSchedule[];

const trustedDimensions = Object.freeze({
  input: true,
  output: true,
  cachedInputRead: true,
  cachedInputWrite: false,
  cachedInputWrite5m: false,
  cachedInputWrite1h: false,
});

const createPeriod = (
  periodId: string,
  input: number,
  output: number,
  cacheRead: number,
): TokenPricingSchedulePeriod => ({
  periodId,
  inputTokenPricing: input,
  outputTokenPricing: output,
  cachedInputReadTokenPricing: cacheRead,
  trustedDimensions,
});

export const createDeepSeekV4PricingScheduleHistory = (prices: {
  priorInput: number;
  priorOutput: number;
  priorCacheRead: number;
  offPeakInput: number;
  offPeakOutput: number;
  offPeakCacheRead: number;
  peakInput: number;
  peakOutput: number;
  peakCacheRead: number;
}): TokenPricingScheduleHistory => {
  const flat = createPeriod('flat', prices.priorInput, prices.priorOutput, prices.priorCacheRead);
  const peak = createPeriod('peak', prices.peakInput, prices.peakOutput, prices.peakCacheRead);
  const offPeak = createPeriod('off_peak', prices.offPeakInput, prices.offPeakOutput, prices.offPeakCacheRead);
  const windows = [
    { periodId: 'peak', startMinute: 60, endMinute: 240 },
    { periodId: 'peak', startMinute: 360, endMinute: 600 },
  ];

  return [
    {
      kind: 'fixed',
      scheduleId: 'deepseek-v4-before-2026-08-17',
      effectiveFrom: null,
      period: flat,
    },
    {
      kind: 'time_window',
      scheduleId: 'deepseek-v4-2026-08-17',
      effectiveFrom: '2026-08-16T16:00:00Z',
      windowTimezone: 'UTC',
      peakDays: [1, 2, 3, 4, 5, 6, 7],
      peakDaysTimezone: 'Asia/Shanghai',
      peakWindows: windows,
      defaultPeriodId: 'off_peak',
      periods: [peak, offPeak],
    },
    {
      kind: 'time_window',
      scheduleId: 'deepseek-v4-2026-08-23',
      effectiveFrom: '2026-08-22T16:00:00Z',
      windowTimezone: 'UTC',
      peakDays: [1, 2, 3, 4, 5],
      peakDaysTimezone: 'Asia/Shanghai',
      peakWindows: windows,
      defaultPeriodId: 'off_peak',
      periods: [peak, offPeak],
    },
  ];
};
