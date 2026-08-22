<template>
  <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div class="mb-3">
      <h3 class="font-bold text-slate-950">{{ t('settings.components.settings.TokenUsageAnalytics.consumptionPace') }}</h3>
      <p class="text-sm text-slate-500">{{ comparisonLabel }}</p>
    </div>
    <p v-if="!canCompare" class="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
      {{ t('settings.components.settings.TokenUsageAnalytics.noComparableData') }}
    </p>
    <div v-else class="h-64">
      <canvas
        ref="canvas"
        role="img"
        tabindex="0"
        :aria-label="t('settings.components.settings.TokenUsageAnalytics.paceChartAria')"
      ></canvas>
    </div>
    <div v-if="canCompare" class="mt-3 grid grid-cols-2 gap-3 text-sm">
      <div class="rounded-lg bg-blue-50 p-3">
        <span class="font-semibold text-blue-900">{{ currentSeriesLabel }}</span>
        <p class="tabular-nums text-blue-800">{{ endpoint(currentPoints) }}</p>
      </div>
      <div class="rounded-lg bg-slate-100 p-3">
        <span class="font-semibold text-slate-700">{{ priorSeriesLabel }}</span>
        <p class="tabular-nums text-slate-700">{{ endpoint(priorPoints) }}</p>
      </div>
    </div>
    <details v-if="canCompare" class="mt-4">
      <summary class="cursor-pointer text-sm font-semibold text-blue-700">
        {{ t('settings.components.settings.TokenUsageAnalytics.exactPaceData') }}
      </summary>
      <div class="mt-2 max-h-52 overflow-auto rounded-lg border border-slate-200">
        <table class="min-w-[760px] w-full text-sm">
          <thead class="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th class="px-3 py-2">{{ t('settings.components.settings.TokenUsageAnalytics.series') }}</th>
              <th class="px-3 py-2 text-right">{{ t('settings.components.settings.TokenUsageAnalytics.elapsedDays') }}</th>
              <th class="px-3 py-2">UTC</th>
              <th class="px-3 py-2 text-right">{{ metricLabel }}</th>
              <th class="px-3 py-2">{{ t('settings.components.settings.TokenUsageAnalytics.costQuality') }}</th>
              <th class="px-3 py-2">{{ t('settings.components.settings.TokenUsageAnalytics.capturedApiCostStatus') }}</th>
              <th class="px-3 py-2">{{ t('settings.components.settings.TokenUsageAnalytics.currency') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="row in exactRows" :key="`${row.series}:${row.point.rangeEndExclusive}`">
              <td class="px-3 py-2 font-medium">{{ row.series }}</td>
              <td class="px-3 py-2 text-right tabular-nums">{{ row.point.x }}</td>
              <td class="px-3 py-2">{{ pointRange(row.point) }}</td>
              <td class="px-3 py-2 text-right tabular-nums">{{ pointValue(row.point) }}</td>
              <td class="px-3 py-2">{{ qualityLabel(row.point.qualityKind) }}</td>
              <td class="px-3 py-2">{{ row.point.apiCostStatus }}</td>
              <td class="px-3 py-2">{{ row.point.currency || notAvailable }}</td>
            </tr>
          </tbody>
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
import {
  buildTokenUsagePacePoints,
  formatTokenUsageAnalyticsCost,
  type TokenUsagePacePoint,
} from '~/utils/tokenUsageAnalyticsPresentation';

Chart.register(...registerables);
const props = defineProps<{ result: TokenUsageAnalyticsResult; metric: TokenUsageAnalyticsMetric }>();
const { t } = useLocalization();
const canvas = ref<HTMLCanvasElement | null>(null);
let chart: Chart<'line', TokenUsagePacePoint[], number> | null = null;

const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, {
  month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
}).format(new Date(value));
const inclusiveEnd = (value: string) => new Date(Date.parse(value) - 86_400_000).toISOString();
const formatRange = (start: string, endExclusive: string) => `${formatDate(start)}–${formatDate(inclusiveEnd(endExclusive))}`;
const currentRangeLabel = computed(() => formatRange(props.result.appliedRange.startTime, props.result.appliedRange.endTimeExclusive));
const priorRangeLabel = computed(() => props.result.comparisonRange
  ? formatRange(props.result.comparisonRange.startTime, props.result.comparisonRange.endTimeExclusive)
  : t('settings.components.settings.TokenUsageAnalytics.noComparableData'));
const currentSeriesLabel = computed(() => `${t('settings.components.settings.TokenUsageAnalytics.current')} · ${currentRangeLabel.value}`);
const priorSeriesLabel = computed(() => `${t('settings.components.settings.TokenUsageAnalytics.prior')} · ${priorRangeLabel.value}`);
const comparisonLabel = computed(() => props.result.comparisonRange
  ? `${currentRangeLabel.value} · ${priorRangeLabel.value}`
  : t('settings.components.settings.TokenUsageAnalytics.noComparableData'));
const metricLabel = computed(() => props.metric === 'TOKENS'
  ? t('settings.components.settings.TokenUsageAnalytics.tokens')
  : t('settings.components.settings.TokenUsageAnalytics.estimatedCost'));
const notAvailable = computed(() => t('settings.components.settings.TokenUsageAnalytics.notAvailable'));
const monetaryComparable = computed(() => {
  if (props.metric === 'TOKENS') return true;
  const current = props.result.selectedCostQuality;
  const prior = props.result.comparisonCostQuality;
  return Boolean(prior && ['COMPLETE', 'PARTIAL'].includes(current.kind) &&
    ['COMPLETE', 'PARTIAL'].includes(prior.kind) && current.currency === prior.currency);
});
const canCompare = computed(() => props.result.coverage.status === 'FULL' &&
  props.result.comparisonCoverage?.status === 'FULL' && monetaryComparable.value &&
  Boolean(props.result.comparisonRange) && props.result.comparisonBuckets.length > 0);
const currentPoints = computed(() => buildTokenUsagePacePoints(
  props.result.trendBuckets,
  props.result.appliedRange.startTime,
  props.metric,
));
const priorPoints = computed(() => buildTokenUsagePacePoints(
  props.result.comparisonBuckets,
  props.result.comparisonRange?.startTime ?? props.result.appliedRange.startTime,
  props.metric,
));
const exactRows = computed(() => [
  ...currentPoints.value.map((point) => ({ series: currentSeriesLabel.value, point })),
  ...priorPoints.value.map((point) => ({ series: priorSeriesLabel.value, point })),
]);
const qualityLabel = (kind: string) => t(`settings.components.settings.TokenUsageAnalytics.quality${kind}`);
const pointRange = (point: TokenUsagePacePoint) => formatRange(point.rangeStart, point.rangeEndExclusive);
const pointValue = (point: TokenUsagePacePoint) => props.metric === 'TOKENS'
  ? new Intl.NumberFormat().format(point.y)
  : formatTokenUsageAnalyticsCost({
      value: point.y,
      currency: point.currency,
      qualityKind: point.qualityKind,
      localLabel: t('settings.components.settings.TokenUsageAnalytics.localNoBill'),
      unpricedLabel: t('settings.components.settings.TokenUsageAnalytics.unpriced'),
      currencyUnavailableLabel: t('settings.components.settings.TokenUsageAnalytics.currencyUnavailable'),
    });
const endpoint = (points: TokenUsagePacePoint[]) => points.length
  ? pointValue(points[points.length - 1]!)
  : props.metric === 'TOKENS' ? '0' : t('settings.components.settings.TokenUsageAnalytics.notAvailable');
const tooltipEvidence = (point: TokenUsagePacePoint) => [
  `${t('settings.components.settings.TokenUsageAnalytics.costQuality')}: ${qualityLabel(point.qualityKind)}`,
  `${t('settings.components.settings.TokenUsageAnalytics.capturedApiCostStatus')}: ${point.apiCostStatus}`,
  `${t('settings.components.settings.TokenUsageAnalytics.currency')}: ${point.currency || notAvailable.value}`,
  ...(point.missingPriceDimensions.length
    ? [`${t('settings.components.settings.TokenUsageAnalytics.missingDimensions')}: ${point.missingPriceDimensions.join(', ')}`]
    : []),
];

const render = async () => {
  await nextTick();
  chart?.destroy();
  chart = null;
  if (!canvas.value || !canCompare.value) return;
  const maxElapsedDays = Math.max(currentPoints.value.at(-1)?.x ?? 0, priorPoints.value.at(-1)?.x ?? 0);
  chart = new Chart(canvas.value, {
    type: 'line',
    data: {
      datasets: [
        {
          label: currentSeriesLabel.value,
          data: currentPoints.value,
          borderColor: '#2563eb',
          backgroundColor: '#2563eb',
          pointRadius: 3,
          tension: 0.25,
        },
        {
          label: priorSeriesLabel.value,
          data: priorPoints.value,
          borderColor: '#64748b',
          backgroundColor: '#64748b',
          borderDash: [6, 4],
          pointStyle: 'rectRot',
          pointRadius: 3,
          tension: 0.25,
        },
      ],
    },
    options: {
      parsing: false,
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'linear',
          min: 0,
          max: maxElapsedDays,
          title: { display: true, text: t('settings.components.settings.TokenUsageAnalytics.elapsedDays') },
          grid: { display: false },
        },
        y: { beginAtZero: true },
      },
      plugins: {
        tooltip: {
          callbacks: {
            title: (items) => pointRange(items[0]!.raw as TokenUsagePacePoint),
            label: (item) => `${item.dataset.label}: ${pointValue(item.raw as TokenUsagePacePoint)}`,
            afterLabel: (item) => tooltipEvidence(item.raw as TokenUsagePacePoint),
          },
        },
      },
    },
  });
};

onMounted(render);
watch(() => [props.result, props.metric], render, { deep: true });
onBeforeUnmount(() => chart?.destroy());
</script>
