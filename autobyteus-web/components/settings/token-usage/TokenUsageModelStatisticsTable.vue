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
  </div>
</template>

<script setup lang="ts">
import { useLocalization } from '~/composables/useLocalization';
import type { TokenUsageRuntimeModelStatisticsRow } from '~/types/tokenUsageRunStatistics';
import { createTokenUsageStatisticsFormatter } from './tokenUsageStatisticsUi';

defineProps<{
  rows: TokenUsageRuntimeModelStatisticsRow[];
}>();

const { t: $t } = useLocalization();
const formatter = createTokenUsageStatisticsFormatter($t);

</script>
