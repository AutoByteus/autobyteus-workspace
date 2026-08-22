<template>
  <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div class="mb-3"><h3 class="font-bold text-slate-950">{{ t('settings.components.settings.TokenUsageAnalytics.consumptionPace') }}</h3><p class="text-sm text-slate-500">{{ comparisonLabel }}</p></div>
    <p v-if="!canCompare" class="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">{{ t('settings.components.settings.TokenUsageAnalytics.noComparableData') }}</p>
    <div v-else class="h-64"><canvas ref="canvas" role="img" tabindex="0" :aria-label="t('settings.components.settings.TokenUsageAnalytics.paceChartAria')"></canvas></div>
    <div v-if="canCompare" class="mt-3 grid grid-cols-2 gap-3 text-sm">
      <div class="rounded-lg bg-blue-50 p-3"><span class="font-semibold text-blue-900">{{ t('settings.components.settings.TokenUsageAnalytics.current') }}</span><p class="tabular-nums text-blue-800">{{ endpoint(currentValues) }}</p></div>
      <div class="rounded-lg bg-slate-100 p-3"><span class="font-semibold text-slate-700">{{ t('settings.components.settings.TokenUsageAnalytics.prior') }}</span><p class="tabular-nums text-slate-700">{{ endpoint(priorValues) }}</p></div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Chart, registerables } from 'chart.js';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import type { TokenUsageAnalyticsMetric, TokenUsageAnalyticsResult } from '~/types/tokenUsageAnalytics';
Chart.register(...registerables);
const props = defineProps<{ result: TokenUsageAnalyticsResult; metric: TokenUsageAnalyticsMetric }>();
const { t } = useLocalization();
const canvas = ref<HTMLCanvasElement | null>(null); let chart: Chart<'line'> | null = null;
const monetaryComparable = computed(() => {
  if (props.metric === 'TOKENS') return true;
  const left = props.result.selectedCostQuality; const right = props.result.comparisonCostQuality;
  return Boolean(right && ['COMPLETE', 'PARTIAL'].includes(left.kind) && ['COMPLETE', 'PARTIAL'].includes(right.kind) && left.currency === right.currency);
});
const canCompare = computed(() => props.result.coverage.status === 'FULL' && props.result.comparisonCoverage?.status === 'FULL' && monetaryComparable.value && props.result.comparisonBuckets.length > 0);
const cumulative = (buckets: TokenUsageAnalyticsResult['trendBuckets']) => {
  let sum = 0; return buckets.map((bucket) => { const amount = props.metric === 'TOKENS' ? bucket.aggregate.totalTokens : bucket.aggregate.estimatedApiTotalCost; sum += amount ?? 0; return sum; });
};
const currentValues = computed(() => cumulative(props.result.trendBuckets)); const priorValues = computed(() => cumulative(props.result.comparisonBuckets));
const endpoint = (values: number[]) => { const amount = values.at(-1) ?? 0; return props.metric === 'TOKENS' ? new Intl.NumberFormat().format(amount) : new Intl.NumberFormat(undefined, { style: 'currency', currency: props.result.selectedCostQuality.currency || 'USD', maximumFractionDigits: 4 }).format(amount); };
const shortDate = (value: string) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(value));
const inclusiveEnd = (value: string) => new Date(Date.parse(value) - 86_400_000).toISOString();
const comparisonLabel = computed(() => props.result.comparisonRange ? `${shortDate(props.result.appliedRange.startTime)}–${shortDate(inclusiveEnd(props.result.appliedRange.endTimeExclusive))} · ${shortDate(props.result.comparisonRange.startTime)}–${shortDate(inclusiveEnd(props.result.comparisonRange.endTimeExclusive))}` : t('settings.components.settings.TokenUsageAnalytics.noComparableData'));
const render = async () => { await nextTick(); chart?.destroy(); chart = null; if (!canvas.value || !canCompare.value) return; const labels = currentValues.value.map((_, index) => String(index + 1)); chart = new Chart(canvas.value, { type: 'line', data: { labels, datasets: [{ label: t('settings.components.settings.TokenUsageAnalytics.current'), data: currentValues.value, borderColor: '#2563eb', backgroundColor: '#2563eb', pointRadius: 2, tension: .25 }, { label: t('settings.components.settings.TokenUsageAnalytics.prior'), data: priorValues.value, borderColor: '#64748b', backgroundColor: '#64748b', borderDash: [6, 4], pointStyle: 'rectRot', pointRadius: 2, tension: .25 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { x: { title: { display: true, text: t('settings.components.settings.TokenUsageAnalytics.elapsedPeriod') }, grid: { display: false } }, y: { beginAtZero: true } } } }); };
onMounted(render); watch(() => [props.result, props.metric], render, { deep: true }); onBeforeUnmount(() => chart?.destroy());
</script>
