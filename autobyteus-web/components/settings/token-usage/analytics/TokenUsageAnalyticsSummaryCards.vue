<template>
  <section
    class="token-summary-container overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 shadow-sm"
    :aria-label="t('settings.components.settings.TokenUsageAnalytics.summary')"
  >
    <div class="flex flex-wrap items-center justify-between gap-3 bg-white px-4 pb-2 pt-4 sm:px-5">
      <span class="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-bold" :class="coverageBadgeClass">
        <span class="h-2 w-2 rounded-full bg-current" aria-hidden="true"></span>
        {{ coverageTitle }}
      </span>
      <span class="text-xs font-medium text-slate-500">{{ rangeLabel }} · UTC</span>
      <span class="w-full text-xs text-slate-500">{{ coverageDetail }}</span>
    </div>

    <div class="token-summary-grid grid gap-px" data-testid="token-summary-grid">
      <article
        v-for="card in cards"
        :key="card.id"
        class="flex min-h-32 min-w-0 flex-col bg-white px-4 py-4 sm:px-5"
        :data-summary-id="card.id"
      >
        <p class="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">{{ card.label }}</p>
        <p
          class="mt-3 truncate font-bold tracking-tight tabular-nums"
          :class="card.primary ? 'text-4xl text-blue-700' : 'text-2xl text-slate-950'"
          :title="card.value"
        >
          {{ card.value }}
        </p>
        <p class="mt-auto pt-3 text-xs leading-5 text-slate-500">{{ card.detail }}</p>
      </article>
    </div>

    <div v-if="pricingNotice" class="flex items-start gap-2 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-5" role="status">
      <svg aria-hidden="true" class="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9" /><path stroke-linecap="round" d="M12 8v5m0 3h.01" /></svg>
      <p><span class="font-semibold">{{ pricingNotice }}</span> {{ t('settings.components.settings.TokenUsageAnalytics.notInvoice') }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import type { TokenUsageAnalyticsMetric, TokenUsageAnalyticsResult } from '~/types/tokenUsageAnalytics';

const props = defineProps<{ result: TokenUsageAnalyticsResult; metric: TokenUsageAnalyticsMetric }>();
const { t, resolvedLocale } = useLocalization();
const integer = (value: number) => new Intl.NumberFormat(resolvedLocale.value).format(value);
const compact = (value: number) => new Intl.NumberFormat(resolvedLocale.value, { notation: 'compact', maximumFractionDigits: 2 }).format(value);
const cost = (value: number | null | undefined, currency: string | null | undefined) => {
  if (value == null) return t('settings.components.settings.TokenUsageAnalytics.notAvailable');
  const maximumFractionDigits = value !== 0 && Math.abs(value) < 0.01 ? 4 : 2;
  if (!currency) {
    return `${new Intl.NumberFormat(resolvedLocale.value, { maximumFractionDigits }).format(value)} · ${t('settings.components.settings.TokenUsageAnalytics.currencyUnavailable')}`;
  }
  return new Intl.NumberFormat(resolvedLocale.value, { style: 'currency', currency, maximumFractionDigits }).format(value);
};
const percent = (value: number) => new Intl.NumberFormat(resolvedLocale.value, { style: 'percent', maximumFractionDigits: 1 }).format(value);
const formatDay = (value: string) => new Intl.DateTimeFormat(resolvedLocale.value, { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(value));
const inclusiveEnd = computed(() => new Date(Date.parse(props.result.appliedRange.endTimeExclusive) - 1));
const rangeLabel = computed(() => `${formatDay(props.result.appliedRange.startTime)}–${formatDay(inclusiveEnd.value.toISOString())}`);
const coverageDate = computed(() => `${new Intl.DateTimeFormat(resolvedLocale.value, {
  year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC',
}).format(new Date(props.result.coverage.coverageStart))} UTC`);
const coverageTitle = computed(() => props.result.coverage.status === 'FULL'
  ? t('settings.components.settings.TokenUsageAnalytics.fullCoverageShort')
  : props.result.coverage.status === 'PARTIAL'
    ? t('settings.components.settings.TokenUsageAnalytics.partialCoverage')
    : t('settings.components.settings.TokenUsageAnalytics.unavailableCoverage'));
const coverageDetail = computed(() => props.result.coverage.status === 'UNAVAILABLE'
  ? t('settings.components.settings.TokenUsageAnalytics.unavailableDetail', { date: coverageDate.value })
  : t('settings.components.settings.TokenUsageAnalytics.trackingSince', { date: coverageDate.value }));
const coverageBadgeClass = computed(() => props.result.coverage.status === 'FULL'
  ? 'bg-emerald-50 text-emerald-800'
  : 'bg-amber-50 text-amber-800');
const costValue = computed(() => {
  const quality = props.result.selectedCostQuality;
  if (quality.kind === 'MIXED_CURRENCY') return t('settings.components.settings.TokenUsageAnalytics.mixed');
  if (quality.kind === 'LOCAL') return t('settings.components.settings.TokenUsageAnalytics.localNoBill');
  return cost(props.result.selectedAggregate.estimatedApiTotalCost, quality.currency);
});
const pricingNotice = computed(() => {
  const kind = props.result.selectedCostQuality.kind;
  if (kind === 'MIXED_CURRENCY') return t('settings.components.settings.TokenUsageAnalytics.mixedCurrencies');
  if (kind === 'PARTIAL') return t('settings.components.settings.TokenUsageAnalytics.partialPricing');
  if (kind === 'MISSING') return t('settings.components.settings.TokenUsageAnalytics.missingPricing');
  if (kind === 'LOCAL') return t('settings.components.settings.TokenUsageAnalytics.localUsage');
  return null;
});
const cacheRateValue = computed(() => {
  const aggregate = props.result.selectedAggregate;
  if ((aggregate.cacheState === 'positive' || aggregate.cacheState === 'zero_reported') && aggregate.cacheReadInputTokenRate != null) {
    return percent(aggregate.cacheReadInputTokenRate);
  }
  if (aggregate.cacheState === 'not_reported') return t('settings.components.settings.TokenUsageAnalytics.cacheNotReported');
  if (aggregate.cacheState === 'unsupported_or_local') return t('settings.components.settings.TokenUsageAnalytics.cacheUnsupported');
  return t('settings.components.settings.TokenUsageAnalytics.cacheUnknown');
});
const cacheRateDetail = computed(() => {
  const aggregate = props.result.selectedAggregate;
  if ((aggregate.cacheState === 'positive' || aggregate.cacheState === 'zero_reported') && aggregate.cacheReadInputTokenRate != null) {
    return t('settings.components.settings.TokenUsageAnalytics.cachedOfInput', {
      cached: compact(aggregate.cacheReadInputTokens),
      input: compact(aggregate.grossInputTokens),
    });
  }
  return t('settings.components.settings.TokenUsageAnalytics.cacheRateDefinition');
});
const cards = computed(() => [
  {
    id: 'total',
    label: t('settings.components.settings.TokenUsageAnalytics.totalTokens'),
    value: compact(props.result.selectedAggregate.totalTokens),
    detail: t('settings.components.settings.TokenUsageAnalytics.exactTokens', { value: integer(props.result.selectedAggregate.totalTokens) }),
    primary: true,
  },
  {
    id: 'uncached',
    label: t('settings.components.settings.TokenUsageAnalytics.uncachedInput'),
    value: compact(props.result.selectedAggregate.standardInputTokens),
    detail: t('settings.components.settings.TokenUsageAnalytics.uncachedInputDefinition'),
    primary: false,
  },
  {
    id: 'cached',
    label: t('settings.components.settings.TokenUsageAnalytics.cachedInput'),
    value: compact(props.result.selectedAggregate.cacheReadInputTokens),
    detail: t('settings.components.settings.TokenUsageAnalytics.cacheReads'),
    primary: false,
  },
  {
    id: 'output',
    label: t('settings.components.settings.TokenUsageAnalytics.output'),
    value: compact(props.result.selectedAggregate.outputTokens),
    detail: t('settings.components.settings.TokenUsageAnalytics.generatedTokens'),
    primary: false,
  },
  {
    id: 'cost',
    label: t('settings.components.settings.TokenUsageAnalytics.estimatedApiCost'),
    value: costValue.value,
    detail: t(`settings.components.settings.TokenUsageAnalytics.quality${props.result.selectedCostQuality.kind}`),
    primary: false,
  },
  {
    id: 'cache-rate',
    label: t('settings.components.settings.TokenUsageAnalytics.cacheHitRate'),
    value: cacheRateValue.value,
    detail: cacheRateDetail.value,
    primary: false,
  },
]);
void props.metric;
</script>

<style scoped>
.token-summary-container { container-type: inline-size; }
.token-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
@container (min-width: 720px) {
  .token-summary-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@container (min-width: 1040px) {
  .token-summary-grid { grid-template-columns: repeat(6, minmax(0, 1fr)); }
}
</style>
