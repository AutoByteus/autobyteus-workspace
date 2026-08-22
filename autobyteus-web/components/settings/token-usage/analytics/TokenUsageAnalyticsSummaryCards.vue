<template>
  <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" :aria-label="t('settings.components.settings.TokenUsageAnalytics.summary')">
    <article v-for="card in cards" :key="card.label" class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p class="text-xs font-bold uppercase tracking-wider text-slate-500">{{ card.label }}</p>
      <p class="mt-2 text-2xl font-bold tracking-tight text-slate-950">{{ card.value }}</p>
      <p class="mt-1 text-sm text-slate-500">{{ card.detail }}</p>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import type { TokenUsageAnalyticsMetric, TokenUsageAnalyticsResult } from '~/types/tokenUsageAnalytics';

const props = defineProps<{ result: TokenUsageAnalyticsResult; metric: TokenUsageAnalyticsMetric }>();
const { t } = useLocalization();
const integer = (value: number) => new Intl.NumberFormat().format(value);
const compact = (value: number) => new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 2 }).format(value);
const cost = (value: number | null | undefined, currency: string | null | undefined) => {
  if (value == null) return t('settings.components.settings.TokenUsageAnalytics.notAvailable');
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 4 }).format(value);
};
const costValue = computed(() => {
  const quality = props.result.selectedCostQuality;
  if (quality.kind === 'MIXED_CURRENCY') return t('settings.components.settings.TokenUsageAnalytics.mixed');
  if (quality.kind === 'LOCAL') return t('settings.components.settings.TokenUsageAnalytics.localNoBill');
  return cost(props.result.selectedAggregate.estimatedApiTotalCost, quality.currency);
});
const comparable = computed(() => {
  const prior = props.result.comparisonAggregate;
  if (!prior || props.result.coverage.status !== 'FULL' || props.result.comparisonCoverage?.status !== 'FULL') return null;
  const selectedValue = props.metric === 'TOKENS' ? props.result.selectedAggregate.totalTokens : props.result.selectedAggregate.estimatedApiTotalCost;
  const priorValue = props.metric === 'TOKENS' ? prior.totalTokens : prior.estimatedApiTotalCost;
  if (selectedValue == null || priorValue == null || priorValue === 0) return null;
  if (props.metric === 'COST') {
    const currentQuality = props.result.selectedCostQuality;
    const priorQuality = props.result.comparisonCostQuality;
    if (!priorQuality || !['COMPLETE', 'PARTIAL'].includes(currentQuality.kind) || !['COMPLETE', 'PARTIAL'].includes(priorQuality.kind) || currentQuality.currency !== priorQuality.currency) return null;
  }
  return { selectedValue, priorValue, change: selectedValue - priorValue, percent: ((selectedValue - priorValue) / priorValue) * 100 };
});
const comparisonValue = computed(() => comparable.value
  ? `${comparable.value.change >= 0 ? '+' : ''}${props.metric === 'TOKENS' ? compact(comparable.value.change) : cost(comparable.value.change, props.result.selectedCostQuality.currency)}`
  : t('settings.components.settings.TokenUsageAnalytics.noComparableData'));
const comparisonDetail = computed(() => comparable.value
  ? `${comparable.value.percent >= 0 ? '+' : ''}${comparable.value.percent.toFixed(1)}% · ${t('settings.components.settings.TokenUsageAnalytics.prior')}: ${props.metric === 'TOKENS' ? compact(comparable.value.priorValue) : cost(comparable.value.priorValue, props.result.selectedCostQuality.currency)}`
  : t('settings.components.settings.TokenUsageAnalytics.comparisonUnavailable'));
const cards = computed(() => [
  {
    label: t('settings.components.settings.TokenUsageAnalytics.totalTokens'),
    value: compact(props.result.selectedAggregate.totalTokens),
    detail: `${compact(props.result.selectedAggregate.grossInputTokens)} ${t('settings.components.settings.TokenUsageAnalytics.input')} · ${compact(props.result.selectedAggregate.outputTokens)} ${t('settings.components.settings.TokenUsageAnalytics.output')}`,
  },
  {
    label: t('settings.components.settings.TokenUsageAnalytics.estimatedApiCost'),
    value: costValue.value,
    detail: t(`settings.components.settings.TokenUsageAnalytics.quality${props.result.selectedCostQuality.kind}`),
  },
  {
    label: t('settings.components.settings.TokenUsageAnalytics.tokensPerActiveDay'),
    value: props.result.activeDayCount ? compact(props.result.selectedAggregate.totalTokens / props.result.activeDayCount) : '—',
    detail: `${integer(props.result.activeDayCount)} ${t('settings.components.settings.TokenUsageAnalytics.activeDays')}`,
  },
  {
    label: t('settings.components.settings.TokenUsageAnalytics.comparedPrior'),
    value: comparisonValue.value,
    detail: comparisonDetail.value,
  },
]);
</script>
