<template>
  <div class="rounded-lg border border-blue-100 bg-blue-50/40 p-4 text-sm text-slate-700">
    <div class="mb-3 flex flex-wrap items-center gap-3">
      <span class="font-semibold text-slate-900">{{ $t('settings.components.settings.TokenUsageStatistics.costBreakdown') }}</span>
      <span :class="formatter.statusClass(aggregate.apiCostStatus)">{{ formatter.formatStatus(aggregate.apiCostStatus) }}</span>
      <span class="text-slate-500">{{ $t('settings.components.settings.TokenUsageStatistics.usageReports', { count: aggregate.usageReportCount }) }}</span>
    </div>
    <div class="grid gap-4 md:grid-cols-2">
      <table class="min-w-full bg-white rounded border border-slate-100">
        <thead>
          <tr class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <th class="px-3 py-2">{{ $t('settings.components.settings.TokenUsageStatistics.inputBreakdown') }}</th>
            <th class="px-3 py-2 text-right">{{ $t('settings.components.settings.TokenUsageStatistics.tokens') }}</th>
            <th class="px-3 py-2 text-right">{{ $t('settings.components.settings.TokenUsageStatistics.cost') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in inputRows" :key="row.label" class="border-t border-slate-100">
            <td class="px-3 py-2">{{ row.label }}</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ formatter.formatInteger(row.tokens) }}</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ formatter.formatCostCell(row.cost, aggregate.currency, aggregate.apiCostStatus) }}</td>
          </tr>
        </tbody>
      </table>
      <table class="min-w-full bg-white rounded border border-slate-100">
        <thead>
          <tr class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <th class="px-3 py-2">{{ $t('settings.components.settings.TokenUsageStatistics.outputBreakdown') }}</th>
            <th class="px-3 py-2 text-right">{{ $t('settings.components.settings.TokenUsageStatistics.tokens') }}</th>
            <th class="px-3 py-2 text-right">{{ $t('settings.components.settings.TokenUsageStatistics.cost') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-t border-slate-100">
            <td class="px-3 py-2">{{ $t('settings.components.settings.TokenUsageStatistics.outputTokens') }}</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ formatter.formatInteger(aggregate.outputTokens) }}</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ formatter.formatCostCell(aggregate.estimatedApiOutputCost, aggregate.currency, aggregate.apiCostStatus) }}</td>
          </tr>
          <tr class="border-t border-slate-100">
            <td class="px-3 py-2">{{ $t('settings.components.settings.TokenUsageStatistics.thinkingIncludedPlain') }}</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ formatter.formatInteger(aggregate.reasoningOutputTokens) }}</td>
            <td class="px-3 py-2 text-right text-slate-500">{{ $t('settings.components.settings.TokenUsageStatistics.included') }}</td>
          </tr>
          <tr class="border-t border-slate-100 font-semibold">
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
import type { TokenUsageCostSummaryAggregate } from '~/types/tokenUsageRunStatistics';
import { createTokenUsageStatisticsFormatter } from './tokenUsageStatisticsUi';

const props = defineProps<{
  aggregate: TokenUsageCostSummaryAggregate;
}>();

const { t: $t, resolvedLocale } = useLocalization();
const formatter = createTokenUsageStatisticsFormatter($t, () => resolvedLocale.value);

interface InputRow {
  label: string;
  tokens: number;
  cost: number | null;
}

// Cache-write rows follow TokenUsageMeterPanel: 5-minute and 1-hour writes get their own rows;
// the unsplit "Cache writes" row keeps tokens outside the split, priced as the part of the
// cache-write cost the split rows do not carry.
const cacheWriteRows = (aggregate: TokenUsageCostSummaryAggregate): InputRow[] => {
  const split5m = aggregate.cacheCreation5mInputTokens;
  const split1h = aggregate.cacheCreation1hInputTokens;
  const unsplitTokens = Math.max(aggregate.cacheCreationInputTokens - split5m - split1h, 0);
  const unsplitCost = aggregate.estimatedApiCacheCreationInputCost === null
    ? null
    : Math.max(
      aggregate.estimatedApiCacheCreationInputCost
        - (aggregate.estimatedApiCacheCreation5mInputCost ?? 0)
        - (aggregate.estimatedApiCacheCreation1hInputCost ?? 0),
      0,
    );
  const rows: InputRow[] = [];
  if ((split5m === 0 && split1h === 0) || unsplitTokens > 0) {
    rows.push({ label: $t('shell.tokenUsage.cacheWrites'), tokens: unsplitTokens, cost: unsplitCost });
  }
  if (split5m > 0 || aggregate.estimatedApiCacheCreation5mInputCost !== null) {
    rows.push({ label: $t('shell.tokenUsage.cacheWrite5m'), tokens: split5m, cost: aggregate.estimatedApiCacheCreation5mInputCost });
  }
  if (split1h > 0 || aggregate.estimatedApiCacheCreation1hInputCost !== null) {
    rows.push({ label: $t('shell.tokenUsage.cacheWrite1h'), tokens: split1h, cost: aggregate.estimatedApiCacheCreation1hInputCost });
  }
  return rows;
};

const inputRows = computed<InputRow[]>(() => [
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
  ...cacheWriteRows(props.aggregate),
  {
    label: $t('shell.tokenUsage.totalInputCost'),
    tokens: props.aggregate.grossInputTokens,
    cost: props.aggregate.estimatedApiInputCost,
  },
]);
</script>
