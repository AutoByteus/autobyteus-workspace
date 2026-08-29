<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" data-testid="usage-trend-section">
    <div>
      <h3 class="text-base font-bold tracking-tight text-slate-950">{{ t('settings.components.settings.TokenUsageAnalytics.usageOverTime') }}</h3>
      <p class="mt-1 text-xs text-slate-500">{{ t('settings.components.settings.TokenUsageAnalytics.dailyPointsExact') }}</p>
    </div>

    <p v-if="unavailable" class="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="status">
      {{ t('settings.components.settings.TokenUsageAnalytics.costChartUnavailable') }}
    </p>

    <div
      v-else
      class="trend-visual mt-5"
      role="img"
      tabindex="0"
      :aria-label="accessibleChartLabel"
      data-testid="daily-line-chart"
    >
      <div class="chart-y-axis" aria-hidden="true">
        <strong>{{ yTitle }}</strong>
        <div class="chart-y-labels">
          <span>{{ yLabels[0] }}</span>
          <span>{{ yLabels[1] }}</span>
          <span>{{ yLabels[2] }}</span>
        </div>
      </div>
      <div class="line-chart-shell" aria-hidden="true">
        <div class="line-plot" data-axis-x="true" data-axis-y="true">
          <svg class="trend-line-svg" preserveAspectRatio="none" viewBox="0 0 100 100">
            <line x1="0" y1="50" x2="100" y2="50" class="midpoint-guide" vector-effect="non-scaling-stroke" data-guide="midpoint" />
            <path
              v-for="(path, index) in linePaths"
              :key="index"
              :d="path"
              class="trend-line"
              vector-effect="non-scaling-stroke"
              data-series="daily"
            />
          </svg>
          <span
            v-for="point in plottedPoints"
            :key="point.key"
            class="trend-point-wrap"
            :style="{ left: `${point.x}%`, top: `${point.y}%` }"
            data-point-marker
          >
            <span class="trend-point" :title="point.tooltip"></span>
          </span>
        </div>
        <div class="line-x-labels">
          <span
            v-for="(tick, index) in xTicks"
            :key="tick.key"
            :class="{ first: index === 0, last: index === xTicks.length - 1 }"
            :style="{ left: `${tick.x}%` }"
          >{{ tick.label }}</span>
        </div>
        <div class="chart-x-title">{{ t('settings.components.settings.TokenUsageAnalytics.dateUtc') }}</div>
      </div>
    </div>

    <details class="mt-3 border-t border-slate-100 pt-3">
      <summary class="cursor-pointer text-sm font-semibold text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
        {{ t('settings.components.settings.TokenUsageAnalytics.exactBucketData') }}
      </summary>
      <div class="mt-3 max-h-64 overflow-auto rounded-xl border border-slate-200">
        <table class="min-w-full text-sm">
          <thead class="sticky top-0 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th class="px-3 py-2">UTC</th>
              <th class="px-3 py-2 text-right">{{ metricLabel }}</th>
              <th class="px-3 py-2">{{ t('settings.components.settings.TokenUsageAnalytics.costQuality') }}</th>
              <th class="px-3 py-2">{{ t('settings.components.settings.TokenUsageAnalytics.capturedApiCostStatus') }}</th>
              <th class="px-3 py-2">{{ t('settings.components.settings.TokenUsageAnalytics.currency') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="bucket in result.trendBuckets" :key="bucket.bucketStart" class="hover:bg-slate-50">
              <td class="whitespace-nowrap px-3 py-2">{{ bucketLabel(bucket.bucketStart, bucket.bucketEndExclusive) }}</td>
              <td class="px-3 py-2 text-right tabular-nums">{{ exactValue(bucket) }}</td>
              <td class="px-3 py-2" :title="bucket.costQuality.missingPriceDimensions.join(', ')">{{ qualityLabel(bucket.costQuality.kind) }}</td>
              <td class="px-3 py-2">{{ bucket.aggregate.apiCostStatus }}</td>
              <td class="px-3 py-2">{{ bucket.costQuality.currency || notAvailable }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import type { TokenUsageAnalyticsMetric, TokenUsageAnalyticsResult } from '~/types/tokenUsageAnalytics';
import { formatTokenUsageAnalyticsCost } from '~/utils/tokenUsageAnalyticsPresentation';

const props = defineProps<{ result: TokenUsageAnalyticsResult; metric: TokenUsageAnalyticsMetric }>();
const { t, resolvedLocale } = useLocalization();
const unavailable = computed(() => props.metric === 'COST' && (
  !['COMPLETE', 'PARTIAL'].includes(props.result.selectedCostQuality.kind) || !props.result.selectedCostQuality.currency
));
const metricLabel = computed(() => props.metric === 'TOKENS'
  ? t('settings.components.settings.TokenUsageAnalytics.tokens')
  : t('settings.components.settings.TokenUsageAnalytics.cost'));
const yTitle = computed(() => props.metric === 'TOKENS'
  ? t('settings.components.settings.TokenUsageAnalytics.tokens')
  : t('settings.components.settings.TokenUsageAnalytics.costCurrency', { currency: props.result.selectedCostQuality.currency || '—' }));
const notAvailable = computed(() => t('settings.components.settings.TokenUsageAnalytics.notAvailable'));
const formatDate = (value: string, includeYear = false) => new Intl.DateTimeFormat(resolvedLocale.value, {
  month: 'short', day: 'numeric', ...(includeYear ? { year: 'numeric' } : {}), timeZone: 'UTC',
}).format(new Date(value));
const bucketLabel = (start: string, end: string) => {
  const inclusiveEnd = new Date(Date.parse(end) - 1).toISOString();
  return formatDate(start) === formatDate(inclusiveEnd)
    ? formatDate(start, true)
    : `${formatDate(start, true)} – ${formatDate(inclusiveEnd, true)}`;
};
const rawValue = (bucket: TokenUsageAnalyticsResult['trendBuckets'][number]): number | null => {
  if (props.metric === 'TOKENS') return bucket.aggregate.totalTokens;
  return ['COMPLETE', 'PARTIAL'].includes(bucket.costQuality.kind) && bucket.costQuality.currency
    ? bucket.aggregate.estimatedApiTotalCost ?? null
    : null;
};
const visibleValues = computed(() => props.result.trendBuckets.map(rawValue));
const maximum = computed(() => Math.max(...visibleValues.value.filter((value): value is number => value != null), 0));
const chartMax = computed(() => maximum.value || 1);
const formatScale = (value: number) => {
  if (props.metric === 'TOKENS') return new Intl.NumberFormat(resolvedLocale.value, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
  const currency = props.result.selectedCostQuality.currency || 'USD';
  return new Intl.NumberFormat(resolvedLocale.value, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
};
const yLabels = computed(() => [formatScale(chartMax.value), formatScale(chartMax.value / 2), formatScale(0)]);
const exactValue = (bucket: TokenUsageAnalyticsResult['trendBuckets'][number]) => {
  const amount = rawValue(bucket);
  if (props.metric === 'TOKENS') return new Intl.NumberFormat(resolvedLocale.value).format(amount ?? 0);
  return formatTokenUsageAnalyticsCost({
    value: amount,
    currency: bucket.costQuality.currency,
    qualityKind: bucket.costQuality.kind,
    localLabel: t('settings.components.settings.TokenUsageAnalytics.localNoBill'),
    unpricedLabel: t('settings.components.settings.TokenUsageAnalytics.unpriced'),
    currencyUnavailableLabel: t('settings.components.settings.TokenUsageAnalytics.currencyUnavailable'),
    locale: resolvedLocale.value,
  });
};
const qualityLabel = (kind: string) => t(`settings.components.settings.TokenUsageAnalytics.quality${kind}`);
const points = computed(() => {
  const buckets = props.result.trendBuckets;
  return buckets.map((bucket, index) => {
    const value = rawValue(bucket);
    return {
      key: bucket.bucketStart,
      x: buckets.length <= 1 ? 0 : (index / (buckets.length - 1)) * 100,
      y: value == null ? null : 92 - (value / chartMax.value) * 84,
      tooltip: `${bucketLabel(bucket.bucketStart, bucket.bucketEndExclusive)}: ${exactValue(bucket)}`,
    };
  });
});
const plottedPoints = computed(() => points.value.flatMap((point) => point.y == null ? [] : [{ ...point, y: point.y }]));
const linePaths = computed(() => {
  const paths: string[] = [];
  let current: string[] = [];
  for (const point of points.value) {
    if (point.y == null) {
      if (current.length) paths.push(current.join(' '));
      current = [];
      continue;
    }
    current.push(`${current.length ? 'L' : 'M'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`);
  }
  if (current.length) paths.push(current.join(' '));
  return paths;
});
const xTicks = computed(() => {
  const buckets = props.result.trendBuckets;
  if (!buckets.length) return [];
  const desired = buckets.length >= 5 ? [0, Math.round((buckets.length - 1) * 0.25), Math.round((buckets.length - 1) * 0.5), Math.round((buckets.length - 1) * 0.75), buckets.length - 1] : buckets.map((_, index) => index);
  return [...new Set(desired)].map((index) => ({
    key: buckets[index]!.bucketStart,
    x: points.value[index]!.x,
    label: formatDate(buckets[index]!.bucketStart),
  }));
});
const accessibleChartLabel = computed(() => {
  const series = props.result.trendBuckets.map((bucket) => `${bucketLabel(bucket.bucketStart, bucket.bucketEndExclusive)}: ${exactValue(bucket)}`).join('; ');
  return `${t('settings.components.settings.TokenUsageAnalytics.usageOverTime')}. ${yTitle.value}. ${t('settings.components.settings.TokenUsageAnalytics.dateUtc')}. ${series}`;
});
</script>

<style scoped>
.trend-visual { display: grid; grid-template-columns: 56px minmax(0, 1fr); height: 270px; }
.chart-y-axis { color: #64748b; display: flex; flex-direction: column; font-size: 10px; padding: 0 10px 42px 0; text-align: right; }
.chart-y-axis > strong { color: #475569; font-size: 10px; font-weight: 700; margin-bottom: 8px; white-space: nowrap; }
.chart-y-labels { display: flex; flex: 1; flex-direction: column; justify-content: space-between; }
.line-chart-shell { display: flex; flex-direction: column; min-width: 0; }
.line-plot { border-bottom: 1.5px solid #94a3b8; border-left: 1.5px solid #94a3b8; flex: 1; min-height: 0; position: relative; }
.trend-line-svg { inset: 0; overflow: visible; position: absolute; width: 100%; height: 100%; }
.midpoint-guide { stroke: #e2e8f0; stroke-width: 1; }
.trend-line { fill: none; stroke: #2563eb; stroke-linecap: round; stroke-linejoin: round; stroke-width: 2.5; }
.trend-point-wrap { position: absolute; width: 0; }
.trend-point { background: white; border: 2px solid #2563eb; border-radius: 999px; box-shadow: 0 0 0 2px rgb(37 99 235 / 8%); display: block; height: 8px; position: absolute; transform: translate(-50%, -50%); width: 8px; }
.line-x-labels { color: #64748b; font-size: 10px; height: 25px; position: relative; }
.line-x-labels span { padding-top: 8px; position: absolute; transform: translateX(-50%); white-space: nowrap; }
.line-x-labels span::before { background: #94a3b8; content: ''; height: 5px; left: 50%; position: absolute; top: 0; width: 1px; }
.line-x-labels span.first { transform: none; }
.line-x-labels span.first::before { left: 0; }
.line-x-labels span.last { transform: translateX(-100%); }
.line-x-labels span.last::before { left: 100%; }
.chart-x-title { color: #64748b; font-size: 10px; font-weight: 500; text-align: center; }
@media (max-width: 640px) {
  .trend-visual { grid-template-columns: 46px minmax(0, 1fr); height: 205px; }
  .chart-y-axis { font-size: 9px; padding-right: 7px; }
  .chart-y-axis > strong, .line-x-labels, .chart-x-title { font-size: 9px; }
  .line-x-labels span:nth-child(2), .line-x-labels span:nth-child(4) { display: none; }
  .trend-point { height: 7px; width: 7px; }
}
</style>
