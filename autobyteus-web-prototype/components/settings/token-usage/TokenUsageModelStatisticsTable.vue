<template>
  <div>
    <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table class="min-w-full divide-y divide-gray-200 text-sm">
        <thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th class="px-3 py-3">{{ $t('settings.components.settings.TokenUsageStatistics.runtime') }}</th>
            <th class="px-3 py-3">{{ $t('settings.components.settings.TokenUsageStatistics.llm_model') }}</th>
            <th class="px-3 py-3 text-right">{{ $t('settings.components.settings.TokenUsageStatistics.inputTokens') }}</th>
            <th class="px-3 py-3 text-right">{{ $t('settings.components.settings.TokenUsageStatistics.cachedInput') }}</th>
            <th class="px-3 py-3 text-right">{{ $t('settings.components.settings.TokenUsageStatistics.outputTokens') }}</th>
            <th class="px-3 py-3 text-right">{{ $t('settings.components.settings.TokenUsageStatistics.thinkingTokens') }}</th>
            <th class="px-3 py-3 text-right">{{ $t('settings.components.settings.TokenUsageStatistics.inputCost') }}</th>
            <th class="px-3 py-3 text-right">{{ $t('settings.components.settings.TokenUsageStatistics.outputCost') }}</th>
            <th class="px-3 py-3 text-right">{{ $t('settings.components.settings.TokenUsageStatistics.thinkingCost') }}</th>
            <th class="px-3 py-3 text-right">{{ $t('settings.components.settings.TokenUsageStatistics.total_cost') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 bg-white">
          <tr v-for="row in rows" :key="row.rowId" class="align-top hover:bg-gray-50">
            <td class="px-3 py-3">{{ formatter.formatRuntimeKind(row.runtimeKind) }}</td>
            <td class="px-3 py-3 font-medium text-gray-900">{{ row.modelDisplayName }}</td>
            <td class="px-3 py-3 text-right tabular-nums">{{ formatter.formatInteger(row.aggregate.grossInputTokens) }}</td>
            <td class="px-3 py-3 text-right tabular-nums">
              <div>{{ formatter.formatInteger(row.aggregate.cacheReadInputTokens) }}</div>
              <div class="text-xs text-gray-500">{{ formatter.cacheSubline(row.aggregate) }}</div>
            </td>
            <td class="px-3 py-3 text-right tabular-nums">{{ formatter.formatInteger(row.aggregate.outputTokens) }}</td>
            <td class="px-3 py-3 text-right tabular-nums">
              <div>{{ formatter.formatInteger(row.aggregate.reasoningOutputTokens) }}</div>
              <div v-if="row.aggregate.reasoningOutputTokens" class="text-xs text-gray-500">{{ $t('settings.components.settings.TokenUsageStatistics.includedDiagnostic') }}</div>
            </td>
            <td class="px-3 py-3 text-right tabular-nums">{{ formatter.formatCostCell(row.aggregate.estimatedApiInputCost, row.aggregate.currency, row.aggregate.apiCostStatus) }}</td>
            <td class="px-3 py-3 text-right tabular-nums">{{ formatter.formatCostCell(row.aggregate.estimatedApiOutputCost, row.aggregate.currency, row.aggregate.apiCostStatus) }}</td>
            <td class="px-3 py-3 text-right tabular-nums">{{ formatter.formatCostCell(row.aggregate.estimatedApiReasoningOutputCost, row.aggregate.currency, row.aggregate.apiCostStatus) }}</td>
            <td class="px-3 py-3 text-right font-semibold tabular-nums">{{ formatter.formatCostCell(row.aggregate.estimatedApiTotalCost, row.aggregate.currency, row.aggregate.apiCostStatus) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="mt-6 h-[400px]">
      <BarChart
        :labels="chartLabels"
        :data="chartData"
        :dataset-label="chartDatasetLabel"
        :x-axis-label="chartXAxisLabel"
        :y-axis-label="chartYAxisLabel"
        :tooltip-labels="chartTooltipLabels"
      />
    </div>
    <p v-if="hasOmittedUnpricedChartCosts" class="mt-2 text-sm text-gray-500">
      {{ $t('shell.tokenUsage.unpricedCostChartNote') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import BarChart from '~/components/common/BarChart.vue';
import type { TokenUsageRuntimeModelStatisticsRow } from '~/types/tokenUsageStatistics';
import { createTokenUsageStatisticsFormatter } from './tokenUsageStatisticsUi';

const props = defineProps<{
  rows: TokenUsageRuntimeModelStatisticsRow[];
}>();

const { t: $t } = useLocalization();
const formatter = createTokenUsageStatisticsFormatter($t);

const chartLabels = computed(() => props.rows.map((row) => `${formatter.formatRuntimeKind(row.runtimeKind)} · ${row.modelDisplayName}`));
const chartData = computed(() => props.rows.map((row) => row.aggregate.estimatedApiTotalCost));
const chartTooltipLabels = computed(() => props.rows.map((row) => (
  formatter.formatCostCell(row.aggregate.estimatedApiTotalCost, row.aggregate.currency, row.aggregate.apiCostStatus)
)));
const hasOmittedUnpricedChartCosts = computed(() => chartData.value.some((value) => value === null));
const chartDatasetLabel = computed(() => $t('settings.components.settings.TokenUsageStatistics.total_cost'));
const chartXAxisLabel = computed(() => $t('settings.components.settings.TokenUsageStatistics.runtimeModel'));
const chartCurrency = computed(() => {
  const currencies = new Set(
    props.rows
      .filter((row) => row.aggregate.estimatedApiTotalCost !== null && row.aggregate.currency)
      .map((row) => row.aggregate.currency as string),
  );
  return currencies.size === 1 ? [...currencies][0] : null;
});
const chartYAxisLabel = computed(() => chartCurrency.value
  ? `${chartDatasetLabel.value} (${chartCurrency.value})`
  : chartDatasetLabel.value);
</script>
