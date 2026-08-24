<template>
  <div class="rounded-lg border border-blue-100 bg-blue-50/40 p-4 text-sm text-gray-700">
    <div class="mb-3 flex flex-wrap items-center gap-3">
      <span class="font-semibold text-gray-900">{{ $t('settings.components.settings.TokenUsageStatistics.costBreakdown') }}</span>
      <span :class="formatter.statusClass(aggregate.apiCostStatus)">{{ formatter.formatStatus(aggregate.apiCostStatus) }}</span>
      <span class="text-gray-500">{{ $t('settings.components.settings.TokenUsageStatistics.usageReports', { count: aggregate.usageReportCount }) }}</span>
    </div>
    <div class="grid gap-4 md:grid-cols-2">
      <table class="min-w-full bg-white rounded border border-gray-100">
        <thead>
          <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <th class="px-3 py-2">{{ $t('settings.components.settings.TokenUsageStatistics.inputBreakdown') }}</th>
            <th class="px-3 py-2 text-right">{{ $t('settings.components.settings.TokenUsageStatistics.tokens') }}</th>
            <th class="px-3 py-2 text-right">{{ $t('settings.components.settings.TokenUsageStatistics.cost') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in inputRows" :key="row.label" class="border-t border-gray-100">
            <td class="px-3 py-2">{{ row.label }}</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ formatter.formatInteger(row.tokens) }}</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ formatter.formatCostCell(row.cost, aggregate.currency, aggregate.apiCostStatus) }}</td>
          </tr>
        </tbody>
      </table>
      <table class="min-w-full bg-white rounded border border-gray-100">
        <thead>
          <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <th class="px-3 py-2">{{ $t('settings.components.settings.TokenUsageStatistics.outputBreakdown') }}</th>
            <th class="px-3 py-2 text-right">{{ $t('settings.components.settings.TokenUsageStatistics.tokens') }}</th>
            <th class="px-3 py-2 text-right">{{ $t('settings.components.settings.TokenUsageStatistics.cost') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-t border-gray-100">
            <td class="px-3 py-2">{{ $t('settings.components.settings.TokenUsageStatistics.outputTokens') }}</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ formatter.formatInteger(aggregate.outputTokens) }}</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ formatter.formatCostCell(aggregate.estimatedApiOutputCost, aggregate.currency, aggregate.apiCostStatus) }}</td>
          </tr>
          <tr class="border-t border-gray-100">
            <td class="px-3 py-2">{{ $t('settings.components.settings.TokenUsageStatistics.thinkingIncludedPlain') }}</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ formatter.formatInteger(aggregate.reasoningOutputTokens) }}</td>
            <td class="px-3 py-2 text-right text-gray-500">{{ $t('settings.components.settings.TokenUsageStatistics.included') }}</td>
          </tr>
          <tr class="border-t border-gray-100 font-semibold">
            <td class="px-3 py-2">{{ $t('settings.components.settings.TokenUsageStatistics.estimatedApiCost') }}</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ formatter.formatInteger(aggregate.totalTokens) }}</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ formatter.formatCostCell(aggregate.estimatedApiTotalCost, aggregate.currency, aggregate.apiCostStatus) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="aggregate.missingPriceDimensions.length" class="mt-3 text-xs text-amber-700">
      {{ $t('settings.components.settings.TokenUsageStatistics.missingPriceDimensions') }}:
      {{ aggregate.missingPriceDimensions.join(', ') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import type { TokenUsageCostSummaryAggregate } from '~/types/tokenUsageStatistics';
import { createTokenUsageStatisticsFormatter } from './tokenUsageStatisticsUi';

const props = defineProps<{
  aggregate: TokenUsageCostSummaryAggregate;
}>();

const { t: $t } = useLocalization();
const formatter = createTokenUsageStatisticsFormatter($t);

const inputRows = computed(() => [
  {
    label: $t('shell.tokenUsage.uncachedInput'),
    tokens: props.aggregate.standardInputTokens,
    cost: props.aggregate.estimatedApiStandardInputCost,
  },
  {
    label: $t('shell.tokenUsage.cacheHits'),
    tokens: props.aggregate.cacheReadInputTokens,
    cost: props.aggregate.estimatedApiCacheReadInputCost,
  },
  {
    label: $t('shell.tokenUsage.cacheWrites'),
    tokens: props.aggregate.cacheCreationInputTokens,
    cost: props.aggregate.estimatedApiCacheCreationInputCost,
  },
  {
    label: $t('shell.tokenUsage.totalInputCost'),
    tokens: props.aggregate.grossInputTokens,
    cost: props.aggregate.estimatedApiInputCost,
  },
]);
</script>
