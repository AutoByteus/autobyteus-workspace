import { describe, expect, it } from 'vitest';
import { selectTokenPricingSchedulePeriod } from '../../../../src/token-usage/pricing/token-pricing-schedule-selector.js';
import { createDeepSeekV4PricingScheduleHistory } from 'autobyteus-ts/llm/utils/token-pricing-schedule.js';

const history = createDeepSeekV4PricingScheduleHistory({
  priorInput: 0.14, priorOutput: 0.28, priorCacheRead: 0.0028,
  offPeakInput: 0.22, offPeakOutput: 0.66, offPeakCacheRead: 0.007,
  peakInput: 0.44, peakOutput: 1.32, peakCacheRead: 0.014,
});

describe('selectTokenPricingSchedulePeriod', () => {
  it.each([
    ['2026-07-15T12:00:00Z', 'deepseek-v4-before-2026-08-17', 'flat'],
    ['2026-08-16T15:59:59.999Z', 'deepseek-v4-before-2026-08-17', 'flat'],
    ['2026-08-16T16:00:00Z', 'deepseek-v4-2026-08-17', 'off_peak'],
    ['2026-08-22T02:00:00Z', 'deepseek-v4-2026-08-17', 'peak'],
    ['2026-08-22T16:00:00Z', 'deepseek-v4-2026-08-23', 'off_peak'],
    ['2026-08-29T02:00:00Z', 'deepseek-v4-2026-08-23', 'off_peak'],
    ['2026-08-26T02:00:00Z', 'deepseek-v4-2026-08-23', 'peak'],
  ] as const)('selects %s as %s/%s', (observedAt, scheduleId, periodId) => {
    const selected = selectTokenPricingSchedulePeriod(history, observedAt);
    expect(selected?.schedule.scheduleId).toBe(scheduleId);
    expect(selected?.period.periodId).toBe(periodId);
  });

  it('uses configured calendar timezone and day set independently from the window timezone', () => {
    const schedule = history[2];
    if (schedule.kind !== 'time_window') throw new Error('expected time-window schedule');
    const saturday = '2026-08-28T16:30:00Z';
    const synthetic = { ...schedule, peakWindows: [{ periodId: 'peak', startMinute: 990, endMinute: 1020 }] };
    expect(selectTokenPricingSchedulePeriod([synthetic], saturday)?.period.periodId).toBe('off_peak');
    const expanded = { ...synthetic, peakDays: [1, 2, 3, 4, 5, 6, 7] };
    expect(selectTokenPricingSchedulePeriod([expanded], saturday)?.period.periodId).toBe('peak');
  });

  it('does not depend on declaration order and fails closed for invalid input', () => {
    expect(selectTokenPricingSchedulePeriod([...history].reverse(), '2026-08-26T02:00:00Z')?.schedule.scheduleId)
      .toBe('deepseek-v4-2026-08-23');
    expect(selectTokenPricingSchedulePeriod(history, 'not-a-timestamp')).toBeNull();
  });
});
