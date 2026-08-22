<template>
  <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div class="flex flex-wrap items-center gap-3">
      <div>
        <h3 class="font-bold text-slate-950">{{ t('settings.components.settings.TokenUsageAnalytics.whereUsageWent') }}</h3>
        <p class="text-sm text-slate-500">{{ t('settings.components.settings.TokenUsageAnalytics.rankedDrivers') }}</p>
      </div>
      <label class="ml-auto text-sm font-semibold text-slate-600">
        {{ t('settings.components.settings.TokenUsageAnalytics.groupBy') }}
        <select :value="grouping" class="ml-2 rounded-lg border-slate-300 bg-white text-sm" @change="onGroupingChange">
          <option value="RUNTIME_MODEL">{{ t('settings.components.settings.TokenUsageAnalytics.runtimeModel') }}</option>
          <option value="RUNTIME">{{ t('settings.components.settings.TokenUsageAnalytics.runtime') }}</option>
          <option value="PROVIDER">{{ t('settings.components.settings.TokenUsageAnalytics.provider') }}</option>
          <option value="MODEL">{{ t('settings.components.settings.TokenUsageAnalytics.model') }}</option>
        </select>
      </label>
    </div>
    <p v-if="chartUnavailable" class="mt-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
      {{ t('settings.components.settings.TokenUsageAnalytics.costChartUnavailable') }}
    </p>
    <div v-else-if="chartRows.length" class="mt-4 h-72">
      <canvas
        ref="canvas"
        role="img"
        tabindex="0"
        :aria-label="t('settings.components.settings.TokenUsageAnalytics.breakdownChartAria')"
      ></canvas>
    </div>
    <p v-else class="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
      {{ t('settings.components.settings.TokenUsageAnalytics.noChartValues') }}
    </p>

    <TokenUsageExactBreakdownTable :result="result" :metric="metric" />
  </section>
</template>

<script setup lang="ts">
import { Chart, registerables } from 'chart.js';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import TokenUsageExactBreakdownTable from './TokenUsageExactBreakdownTable.vue';
import type {
  TokenUsageAnalyticsBreakdownRow,
  TokenUsageAnalyticsGrouping,
  TokenUsageAnalyticsMetric,
  TokenUsageAnalyticsResult,
} from '~/types/tokenUsageAnalytics';
import {
  formatTokenUsageAnalyticsCost,
} from '~/utils/tokenUsageAnalyticsPresentation';

interface ChartGroup {
  name: string;
  value: number;
  rows: TokenUsageAnalyticsBreakdownRow[];
}

Chart.register(...registerables);
const props = defineProps<{
  result: TokenUsageAnalyticsResult;
  metric: TokenUsageAnalyticsMetric;
  grouping: TokenUsageAnalyticsGrouping;
}>();
const emit = defineEmits<{ 'update:grouping': [value: TokenUsageAnalyticsGrouping] }>();
const { t } = useLocalization();
const canvas = ref<HTMLCanvasElement | null>(null);
let chart: Chart<'bar'> | null = null;
const runtimeLabels: Record<string, string> = {
  autobyteus: 'Autobyteus',
  codex_app_server: 'Codex',
  claude_agent_sdk: 'Claude SDK',
};
const notAvailable = computed(() => t('settings.components.settings.TokenUsageAnalytics.notAvailable'));
const notComparable = computed(() => t('settings.components.settings.TokenUsageAnalytics.notComparable'));
const onGroupingChange = (event: Event) => emit(
  'update:grouping',
  (event.target as HTMLSelectElement).value as TokenUsageAnalyticsGrouping,
);
const runtime = (value: string) => runtimeLabels[value] ?? value;
const integer = (value: number) => new Intl.NumberFormat().format(value);
const percent = (value: number) => new Intl.NumberFormat(undefined, {
  style: 'percent', maximumFractionDigits: 1,
}).format(value);
const qualityLabel = (kind: string) => t(`settings.components.settings.TokenUsageAnalytics.quality${kind}`);
const label = (row: TokenUsageAnalyticsBreakdownRow) => {
  if (props.grouping === 'RUNTIME') return runtime(row.runtimeKind);
  if (props.grouping === 'PROVIDER') return row.providerDisplayName;
  if (props.grouping === 'MODEL') return row.modelDisplayName;
  return `${runtime(row.runtimeKind)} · ${row.modelDisplayName}`;
};
const metricValue = (row: TokenUsageAnalyticsBreakdownRow): number | null => {
  if (props.metric === 'TOKENS') return row.aggregate.totalTokens;
  if (!['COMPLETE', 'PARTIAL'].includes(row.costQuality.kind) || !row.costQuality.currency ||
    row.costQuality.currency !== props.result.selectedCostQuality.currency) return null;
  return row.aggregate.estimatedApiTotalCost;
};
const chartUnavailable = computed(() => props.metric === 'COST' &&
  props.result.selectedCostQuality.kind === 'MIXED_CURRENCY');
const grouped = computed<ChartGroup[]>(() => {
  const groups = new Map<string, ChartGroup>();
  for (const row of props.result.breakdownRows) {
    const amount = metricValue(row);
    if (amount == null) continue;
    const key = label(row);
    const group = groups.get(key) ?? { name: key, value: 0, rows: [] };
    group.value += amount;
    group.rows.push(row);
    groups.set(key, group);
  }
  return [...groups.values()].sort((left, right) => right.value - left.value || left.name.localeCompare(right.name));
});
const chartRows = computed<ChartGroup[]>(() => {
  if (grouped.value.length <= 8) return grouped.value;
  const visible = grouped.value.slice(0, 8);
  const remaining = grouped.value.slice(8);
  return [...visible, {
    name: t('settings.components.settings.TokenUsageAnalytics.other'),
    value: remaining.reduce((sum, row) => sum + row.value, 0),
    rows: remaining.flatMap((row) => row.rows),
  }];
});
const chartTotal = computed(() => grouped.value.reduce((sum, row) => sum + row.value, 0));
const groupValue = (group: ChartGroup) => props.metric === 'TOKENS'
  ? integer(group.value)
  : formatTokenUsageAnalyticsCost({
      value: group.value,
      currency: props.result.selectedCostQuality.currency,
      qualityKind: props.result.selectedCostQuality.kind,
      localLabel: t('settings.components.settings.TokenUsageAnalytics.localNoBill'),
      unpricedLabel: t('settings.components.settings.TokenUsageAnalytics.unpriced'),
      currencyUnavailableLabel: t('settings.components.settings.TokenUsageAnalytics.currencyUnavailable'),
    });
const groupEvidence = (group: ChartGroup) => {
  const qualities = [...new Set(group.rows.map((row) => qualityLabel(row.costQuality.kind)))].join(', ');
  const statuses = [...new Set(group.rows.map((row) => row.aggregate.apiCostStatus))].join(', ');
  const currencies = [...new Set(group.rows.map((row) => row.costQuality.currency).filter(Boolean))].join(', ') || notAvailable.value;
  return [
    `${t('settings.components.settings.TokenUsageAnalytics.share')}: ${chartTotal.value > 0 ? percent(group.value / chartTotal.value) : notComparable.value}`,
    `${t('settings.components.settings.TokenUsageAnalytics.costQuality')}: ${qualities}`,
    `${t('settings.components.settings.TokenUsageAnalytics.capturedApiCostStatus')}: ${statuses}`,
    `${t('settings.components.settings.TokenUsageAnalytics.currency')}: ${currencies}`,
  ];
};

const render = async () => {
  await nextTick();
  chart?.destroy();
  chart = null;
  if (!canvas.value || chartUnavailable.value || !chartRows.value.length) return;
  chart = new Chart(canvas.value, {
    type: 'bar',
    data: {
      labels: chartRows.value.map((row) => row.name),
      datasets: [{
        label: props.metric === 'TOKENS'
          ? t('settings.components.settings.TokenUsageAnalytics.tokens')
          : t('settings.components.settings.TokenUsageAnalytics.estimatedCost'),
        data: chartRows.value.map((row) => row.value),
        backgroundColor: '#0f766e',
        borderRadius: 5,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (item) => groupValue(chartRows.value[item.dataIndex]!),
            afterLabel: (item) => groupEvidence(chartRows.value[item.dataIndex]!),
          },
        },
      },
      scales: {
        x: { beginAtZero: true },
        y: { grid: { display: false } },
      },
    },
  });
};

onMounted(render);
watch(() => [props.result, props.metric, props.grouping], render, { deep: true });
onBeforeUnmount(() => chart?.destroy());
</script>
