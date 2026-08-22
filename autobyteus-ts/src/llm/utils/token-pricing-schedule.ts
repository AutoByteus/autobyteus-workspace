export type TokenPricingTrustedDimensions = {
  input: boolean;
  output: boolean;
  cachedInputRead: boolean;
  cachedInputWrite: boolean;
  cachedInputWrite5m: boolean;
  cachedInputWrite1h: boolean;
};

export type TokenPricingSchedulePeriod = {
  periodId: "peak" | "off_peak";
  inputTokenPricing: number;
  outputTokenPricing: number;
  cachedInputReadTokenPricing: number;
  cachedInputWriteTokenPricing?: number;
  trustedDimensions: TokenPricingTrustedDimensions;
};

export type TokenPricingSchedule = {
  scheduleId: "deepseek-v4-2026-08-17";
  timezone: "UTC";
  effectiveFrom: "2026-08-16T16:00:00Z";
  peakWindows: readonly [
    { periodId: "peak"; startMinuteUtc: 60; endMinuteUtc: 240 },
    { periodId: "peak"; startMinuteUtc: 360; endMinuteUtc: 600 },
  ];
  defaultPeriodId: "off_peak";
  periods: readonly [TokenPricingSchedulePeriod, TokenPricingSchedulePeriod];
};

const trustedDimensions = Object.freeze({
  input: true,
  output: true,
  cachedInputRead: true,
  cachedInputWrite: false,
  cachedInputWrite5m: false,
  cachedInputWrite1h: false,
});

export const createDeepSeekV4PricingSchedule = (
  prices: { offPeakInput: number; offPeakOutput: number; offPeakCacheRead: number; peakInput: number; peakOutput: number; peakCacheRead: number },
): TokenPricingSchedule => ({
  scheduleId: "deepseek-v4-2026-08-17",
  timezone: "UTC",
  effectiveFrom: "2026-08-16T16:00:00Z",
  peakWindows: [
    { periodId: "peak", startMinuteUtc: 60, endMinuteUtc: 240 },
    { periodId: "peak", startMinuteUtc: 360, endMinuteUtc: 600 },
  ],
  defaultPeriodId: "off_peak",
  periods: [
    {
      periodId: "peak",
      inputTokenPricing: prices.peakInput,
      outputTokenPricing: prices.peakOutput,
      cachedInputReadTokenPricing: prices.peakCacheRead,
      trustedDimensions,
    },
    {
      periodId: "off_peak",
      inputTokenPricing: prices.offPeakInput,
      outputTokenPricing: prices.offPeakOutput,
      cachedInputReadTokenPricing: prices.offPeakCacheRead,
      trustedDimensions,
    },
  ],
});
