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

  it.each([
    ['2026-08-24T01:00:00Z', 'peak'], ['2026-08-24T04:00:00Z', 'off_peak'],
    ['2026-08-24T06:00:00Z', 'peak'], ['2026-08-24T10:00:00Z', 'off_peak'],
  ] as const)('uses half-open window boundaries at %s', (observedAt, periodId) => {
    expect(selectTokenPricingSchedulePeriod(history, observedAt)?.period.periodId).toBe(periodId);
  });

  it('retains exact historical and current rate triples', () => {
    expect(history[0]!.kind === 'fixed' && [history[0]!.period.cachedInputReadTokenPricing, history[0]!.period.inputTokenPricing, history[0]!.period.outputTokenPricing]).toEqual([0.0028, 0.14, 0.28]);
    const current = history[2]!;
    if (current.kind !== 'time_window') throw new Error('expected time-window schedule');
    expect(current.periods.map((period) => [period.periodId, period.cachedInputReadTokenPricing, period.inputTokenPricing, period.outputTokenPricing])).toEqual([
      ['peak', 0.014, 0.44, 1.32], ['off_peak', 0.007, 0.22, 0.66],
    ]);
  });

  it('uses configured calendar timezone and day set independently from the window timezone', () => {
    const schedule = history.find((candidate): candidate is Extract<typeof history[number], { kind: 'time_window' }> =>
      candidate.kind === 'time_window' && candidate.scheduleId === 'deepseek-v4-2026-08-23');
    if (!schedule) throw new Error('expected time-window schedule');
    const saturday = '2026-08-28T16:30:00Z';
    const monday = '2026-08-30T16:30:00Z';
    const synthetic = { ...schedule, peakWindows: [{ periodId: 'peak', startMinute: 990, endMinute: 1020 }] as const };
    expect(selectTokenPricingSchedulePeriod([synthetic], saturday)?.period.periodId).toBe('off_peak');
    const expanded = { ...synthetic, peakDays: [1, 2, 3, 4, 5, 6, 7] as const };
    expect(selectTokenPricingSchedulePeriod([expanded], saturday)?.period.periodId).toBe('peak');
    expect(selectTokenPricingSchedulePeriod([synthetic], monday)?.period.periodId).toBe('peak');
  });

  it('does not depend on declaration order and fails closed for invalid input', () => {
    expect(selectTokenPricingSchedulePeriod([...history].reverse(), '2026-08-26T02:00:00Z')?.schedule.scheduleId)
      .toBe('deepseek-v4-2026-08-23');
    expect(selectTokenPricingSchedulePeriod(history, 'not-a-timestamp')).toBeNull();
  });
});
