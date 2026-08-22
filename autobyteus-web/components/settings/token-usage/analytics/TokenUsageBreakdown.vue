<template>
  <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div class="flex flex-wrap items-center gap-3">
      <div><h3 class="font-bold text-slate-950">{{ t('settings.components.settings.TokenUsageAnalytics.whereUsageWent') }}</h3><p class="text-sm text-slate-500">{{ t('settings.components.settings.TokenUsageAnalytics.rankedDrivers') }}</p></div>
      <label class="ml-auto text-sm font-semibold text-slate-600">{{ t('settings.components.settings.TokenUsageAnalytics.groupBy') }}
        <select :value="grouping" class="ml-2 rounded-lg border-slate-300 bg-white text-sm" @change="onGroupingChange">
          <option value="RUNTIME_MODEL">{{ t('settings.components.settings.TokenUsageAnalytics.runtimeModel') }}</option><option value="RUNTIME">{{ t('settings.components.settings.TokenUsageAnalytics.runtime') }}</option><option value="PROVIDER">{{ t('settings.components.settings.TokenUsageAnalytics.provider') }}</option><option value="MODEL">{{ t('settings.components.settings.TokenUsageAnalytics.model') }}</option>
        </select>
      </label>
    </div>
    <p v-if="chartUnavailable" class="mt-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">{{ t('settings.components.settings.TokenUsageAnalytics.costChartUnavailable') }}</p>
    <div v-else-if="chartRows.length" class="mt-4 h-72"><canvas ref="canvas" role="img" tabindex="0" :aria-label="t('settings.components.settings.TokenUsageAnalytics.breakdownChartAria')"></canvas></div>
    <p v-else class="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">{{ t('settings.components.settings.TokenUsageAnalytics.noChartValues') }}</p>

    <h4 class="mt-6 font-semibold text-slate-900">{{ t('settings.components.settings.TokenUsageAnalytics.exactBreakdown') }}</h4>
    <div class="mt-2 overflow-x-auto rounded-lg border border-slate-200">
      <table class="min-w-[980px] w-full text-sm">
        <thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th class="px-3 py-2">{{ t('settings.components.settings.TokenUsageAnalytics.runtime') }}</th><th class="px-3 py-2">{{ t('settings.components.settings.TokenUsageAnalytics.provider') }}</th><th class="px-3 py-2">{{ t('settings.components.settings.TokenUsageAnalytics.model') }}</th><th class="px-3 py-2 text-right">{{ t('settings.components.settings.TokenUsageAnalytics.input') }}</th><th class="px-3 py-2 text-right">{{ t('settings.components.settings.TokenUsageAnalytics.cached') }}</th><th class="px-3 py-2 text-right">{{ t('settings.components.settings.TokenUsageAnalytics.output') }}</th><th class="px-3 py-2 text-right">{{ t('settings.components.settings.TokenUsageAnalytics.totalTokens') }}</th><th class="px-3 py-2 text-right">{{ t('settings.components.settings.TokenUsageAnalytics.estimatedCost') }}</th><th class="px-3 py-2">{{ t('settings.components.settings.TokenUsageAnalytics.status') }}</th></tr></thead>
        <tbody class="divide-y divide-slate-100"><tr v-for="row in result.breakdownRows" :key="row.rowKey" class="hover:bg-slate-50"><td class="px-3 py-2">{{ runtime(row.runtimeKind) }}</td><td class="px-3 py-2">{{ row.providerDisplayName }}</td><td class="px-3 py-2 font-medium text-slate-900">{{ row.modelDisplayName }}</td><td class="px-3 py-2 text-right tabular-nums">{{ integer(row.aggregate.grossInputTokens) }}</td><td class="px-3 py-2 text-right tabular-nums">{{ integer(row.aggregate.cacheReadInputTokens) }}</td><td class="px-3 py-2 text-right tabular-nums">{{ integer(row.aggregate.outputTokens) }}</td><td class="px-3 py-2 text-right font-semibold tabular-nums">{{ integer(row.aggregate.totalTokens) }}</td><td class="px-3 py-2 text-right tabular-nums">{{ cost(row.aggregate.estimatedApiTotalCost, row.costQuality.currency) }}</td><td class="px-3 py-2"><span class="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">{{ row.costQuality.kind }}</span></td></tr></tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Chart, registerables } from 'chart.js';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import type { TokenUsageAnalyticsGrouping, TokenUsageAnalyticsMetric, TokenUsageAnalyticsResult } from '~/types/tokenUsageAnalytics';
Chart.register(...registerables);
const props = defineProps<{ result: TokenUsageAnalyticsResult; metric: TokenUsageAnalyticsMetric; grouping: TokenUsageAnalyticsGrouping }>();
const emit = defineEmits<{ 'update:grouping': [value: TokenUsageAnalyticsGrouping] }>();
const { t } = useLocalization(); const canvas = ref<HTMLCanvasElement | null>(null); let chart: Chart<'bar'> | null = null;
const runtimeLabels: Record<string, string> = { autobyteus: 'Autobyteus', codex_app_server: 'Codex', claude_agent_sdk: 'Claude SDK' };
const onGroupingChange = (event: Event) => emit('update:grouping', (event.target as HTMLSelectElement).value as TokenUsageAnalyticsGrouping);
const runtime = (value: string) => runtimeLabels[value] ?? value; const integer = (value: number) => new Intl.NumberFormat().format(value);
const cost = (value: number | null | undefined, currency: string | null | undefined) => value == null ? t('settings.components.settings.TokenUsageAnalytics.unpriced') : new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 4 }).format(value);
const label = (row: TokenUsageAnalyticsResult['breakdownRows'][number]) => props.grouping === 'RUNTIME' ? runtime(row.runtimeKind) : props.grouping === 'PROVIDER' ? row.providerDisplayName : props.grouping === 'MODEL' ? row.modelDisplayName : `${runtime(row.runtimeKind)} · ${row.modelDisplayName}`;
const chartUnavailable = computed(() => props.metric === 'COST' && props.result.selectedCostQuality.kind === 'MIXED_CURRENCY');
const grouped = computed(() => { const groups = new Map<string, number>(); for (const row of props.result.breakdownRows) { const amount = props.metric === 'TOKENS' ? row.aggregate.totalTokens : row.aggregate.estimatedApiTotalCost; if (amount == null) continue; const key = label(row); groups.set(key, (groups.get(key) ?? 0) + amount); } return [...groups.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name)); });
const chartRows = computed(() => { if (grouped.value.length <= 8) return grouped.value; const visible = grouped.value.slice(0, 8); return [...visible, { name: t('settings.components.settings.TokenUsageAnalytics.other'), value: grouped.value.slice(8).reduce((sum, row) => sum + row.value, 0) }]; });
const render = async () => { await nextTick(); chart?.destroy(); chart = null; if (!canvas.value || chartUnavailable.value || !chartRows.value.length) return; const total = grouped.value.reduce((sum, row) => sum + row.value, 0); chart = new Chart(canvas.value, { type: 'bar', data: { labels: chartRows.value.map((row) => row.name), datasets: [{ label: props.metric === 'TOKENS' ? t('settings.components.settings.TokenUsageAnalytics.tokens') : t('settings.components.settings.TokenUsageAnalytics.estimatedCost'), data: chartRows.value.map((row) => row.value), backgroundColor: '#0f766e', borderRadius: 5 }] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (item) => { const value = Number(item.raw); return `${props.metric === 'TOKENS' ? integer(value) : cost(value, props.result.selectedCostQuality.currency)} · ${total ? (value / total * 100).toFixed(1) : '0'}%`; } } } }, scales: { x: { beginAtZero: true }, y: { grid: { display: false } } } } }); };
onMounted(render); watch(() => [props.result, props.metric, props.grouping], render, { deep: true }); onBeforeUnmount(() => chart?.destroy());
</script>
