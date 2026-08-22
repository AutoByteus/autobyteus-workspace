<template>
  <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div class="mb-3">
      <h3 class="font-bold text-slate-950">{{ t('settings.components.settings.TokenUsageAnalytics.usageOverTime') }}</h3>
      <p class="text-sm text-slate-500">{{ rangeLabel }}</p>
    </div>
    <p v-if="unavailable" class="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">{{ t('settings.components.settings.TokenUsageAnalytics.costChartUnavailable') }}</p>
    <div v-else class="h-64">
      <canvas ref="canvas" role="img" tabindex="0" :aria-label="t('settings.components.settings.TokenUsageAnalytics.trendChartAria')"></canvas>
    </div>
    <details class="mt-4">
      <summary class="cursor-pointer text-sm font-semibold text-blue-700">{{ t('settings.components.settings.TokenUsageAnalytics.exactBucketData') }}</summary>
      <div class="mt-2 max-h-52 overflow-auto rounded-lg border border-slate-200">
        <table class="min-w-full text-sm">
          <thead class="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th class="px-3 py-2">UTC</th><th class="px-3 py-2 text-right">{{ metricLabel }}</th><th class="px-3 py-2">{{ t('settings.components.settings.TokenUsageAnalytics.status') }}</th></tr></thead>
          <tbody class="divide-y divide-slate-100"><tr v-for="bucket in result.trendBuckets" :key="bucket.bucketStart"><td class="px-3 py-2">{{ bucketLabel(bucket.bucketStart, bucket.bucketEndExclusive) }}</td><td class="px-3 py-2 text-right tabular-nums">{{ exactValue(bucket) }}</td><td class="px-3 py-2">{{ bucket.costQuality.kind }}</td></tr></tbody>
        </table>
      </div>
    </details>
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
const canvas = ref<HTMLCanvasElement | null>(null);
let chart: Chart<'bar', (number | null)[], string> | null = null;
const unavailable = computed(() => props.metric === 'COST' && props.result.selectedCostQuality.kind === 'MIXED_CURRENCY');
const metricLabel = computed(() => props.metric === 'TOKENS' ? t('settings.components.settings.TokenUsageAnalytics.tokens') : t('settings.components.settings.TokenUsageAnalytics.estimatedCost'));
const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(value));
const bucketLabel = (start: string, end: string) => `${formatDate(start)} – ${formatDate(new Date(Date.parse(end) - 1).toISOString())}`;
const rangeLabel = computed(() => bucketLabel(props.result.appliedRange.startTime, props.result.appliedRange.endTimeExclusive));
const value = (bucket: TokenUsageAnalyticsResult['trendBuckets'][number]): number | null => props.metric === 'TOKENS' ? bucket.aggregate.totalTokens : bucket.aggregate.estimatedApiTotalCost ?? null;
const exactValue = (bucket: TokenUsageAnalyticsResult['trendBuckets'][number]) => {
  const amount = value(bucket);
  if (amount == null) return t('settings.components.settings.TokenUsageAnalytics.unpriced');
  return props.metric === 'TOKENS' ? new Intl.NumberFormat().format(amount) : new Intl.NumberFormat(undefined, { style: 'currency', currency: bucket.costQuality.currency || 'USD', maximumFractionDigits: 4 }).format(amount);
};
const render = async () => {
  await nextTick(); chart?.destroy(); chart = null;
  if (!canvas.value || unavailable.value) return;
  chart = new Chart(canvas.value, {
    type: 'bar',
    data: { labels: props.result.trendBuckets.map((bucket) => formatDate(bucket.bucketStart)), datasets: [{ label: metricLabel.value, data: props.result.trendBuckets.map(value), backgroundColor: '#2563eb', borderRadius: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { title: (items) => { const bucket = props.result.trendBuckets[items[0]?.dataIndex ?? 0]; return bucket ? bucketLabel(bucket.bucketStart, bucket.bucketEndExclusive) : ''; }, label: (item) => exactValue(props.result.trendBuckets[item.dataIndex]!) } } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true } } },
  });
};
onMounted(render); watch(() => [props.result, props.metric], render, { deep: true }); onBeforeUnmount(() => chart?.destroy());
</script>
