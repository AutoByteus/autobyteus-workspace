import type {
  TokenUsageAnalyticsInput,
  TokenUsageAnalyticsRange,
  TokenUsageAnalyticsRangePlan,
} from "../domain/token-usage-analytics.js";
import { isTokenUsageAnalyticsOpaqueKey } from "../projections/token-usage-analytics-contribution.js";

const DAY_MS = 86_400_000;
const utcMidnight = (date: Date): Date => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
const addDays = (date: Date, days: number): Date => new Date(date.getTime() + days * DAY_MS);
const monthStart = (year: number, month: number): Date => new Date(Date.UTC(year, month, 1));
const daysInMonth = (year: number, month: number): number => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
const sameInstant = (left: Date, right: Date): boolean => left.getTime() === right.getTime();
const assertMidnight = (value: Date, field: string): void => {
  if (Number.isNaN(value.getTime()) || !sameInstant(value, utcMidnight(value))) {
    throw new Error(`TOKEN_USAGE_ANALYTICS_RANGE_NOT_UTC_MIDNIGHT:${field}`);
  }
};
const shiftYearClamped = (value: Date, years: number): Date => {
  const targetYear = value.getUTCFullYear() + years;
  const month = value.getUTCMonth();
  const day = Math.min(value.getUTCDate(), daysInMonth(targetYear, month));
  return new Date(Date.UTC(targetYear, month, day));
};

export class TokenUsageAnalyticsRangePolicy {
  plan(input: TokenUsageAnalyticsInput, now = new Date()): TokenUsageAnalyticsRangePlan {
    assertMidnight(input.startTime, "startTime");
    assertMidnight(input.endTimeExclusive, "endTimeExclusive");
    if (input.startTime >= input.endTimeExclusive) throw new Error("TOKEN_USAGE_ANALYTICS_RANGE_INVALID");
    if (input.providerKey && !isTokenUsageAnalyticsOpaqueKey(input.providerKey)) throw new Error("TOKEN_USAGE_ANALYTICS_PROVIDER_KEY_INVALID");
    if (input.modelKey && !isTokenUsageAnalyticsOpaqueKey(input.modelKey)) throw new Error("TOKEN_USAGE_ANALYTICS_MODEL_KEY_INVALID");

    const today = utcMidnight(now);
    const tomorrow = addDays(today, 1);
    const thisMonthStart = monthStart(today.getUTCFullYear(), today.getUTCMonth());
    let selected: TokenUsageAnalyticsRange;
    let comparison: TokenUsageAnalyticsRange | null;

    switch (input.rangePreset) {
      case "THIS_MONTH": {
        selected = { startTime: thisMonthStart, endTimeExclusive: tomorrow };
        const previousStart = monthStart(today.getUTCFullYear(), today.getUTCMonth() - 1);
        const elapsedDays = Math.round((tomorrow.getTime() - thisMonthStart.getTime()) / DAY_MS);
        comparison = {
          startTime: previousStart,
          endTimeExclusive: addDays(previousStart, Math.min(elapsedDays, daysInMonth(previousStart.getUTCFullYear(), previousStart.getUTCMonth()))),
        };
        break;
      }
      case "LAST_MONTH": {
        const previousStart = monthStart(today.getUTCFullYear(), today.getUTCMonth() - 1);
        selected = { startTime: previousStart, endTimeExclusive: thisMonthStart };
        comparison = {
          startTime: monthStart(today.getUTCFullYear(), today.getUTCMonth() - 2),
          endTimeExclusive: previousStart,
        };
        break;
      }
      case "LAST_3_MONTHS": {
        selected = { startTime: monthStart(today.getUTCFullYear(), today.getUTCMonth() - 2), endTimeExclusive: tomorrow };
        const span = selected.endTimeExclusive.getTime() - selected.startTime.getTime();
        comparison = { startTime: new Date(selected.startTime.getTime() - span), endTimeExclusive: selected.startTime };
        break;
      }
      case "LAST_12_MONTHS": {
        selected = { startTime: monthStart(today.getUTCFullYear(), today.getUTCMonth() - 11), endTimeExclusive: tomorrow };
        comparison = {
          startTime: shiftYearClamped(selected.startTime, -1),
          endTimeExclusive: shiftYearClamped(selected.endTimeExclusive, -1),
        };
        break;
      }
      case "CUSTOM": {
        selected = { startTime: input.startTime, endTimeExclusive: input.endTimeExclusive };
        const span = selected.endTimeExclusive.getTime() - selected.startTime.getTime();
        comparison = { startTime: new Date(selected.startTime.getTime() - span), endTimeExclusive: selected.startTime };
        break;
      }
      default:
        throw new Error("TOKEN_USAGE_ANALYTICS_RANGE_PRESET_INVALID");
    }

    if (input.rangePreset !== "CUSTOM" && (!sameInstant(input.startTime, selected.startTime) || !sameInstant(input.endTimeExclusive, selected.endTimeExclusive))) {
      throw new Error("TOKEN_USAGE_ANALYTICS_PRESET_RANGE_MISMATCH");
    }
    const spanDays = Math.round((selected.endTimeExclusive.getTime() - selected.startTime.getTime()) / DAY_MS);
    return {
      preset: input.rangePreset,
      selected,
      comparison,
      granularity: spanDays <= 62 ? "DAY" : spanDays <= 180 ? "WEEK" : "MONTH",
    };
  }
}
