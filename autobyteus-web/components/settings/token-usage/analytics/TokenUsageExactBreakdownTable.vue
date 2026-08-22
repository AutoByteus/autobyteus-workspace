<template>
  <div>
    <h4 class="mt-6 font-semibold text-slate-900">{{ t('settings.components.settings.TokenUsageAnalytics.exactBreakdown') }}</h4>
    <div class="mt-2 overflow-x-auto rounded-lg border border-slate-200">
      <table class="min-w-[1250px] w-full text-sm">
        <thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th class="px-3 py-2">{{ t('settings.components.settings.TokenUsageAnalytics.runtime') }}</th>
            <th class="px-3 py-2">{{ t('settings.components.settings.TokenUsageAnalytics.provider') }}</th>
            <th class="px-3 py-2">{{ t('settings.components.settings.TokenUsageAnalytics.model') }}</th>
            <th class="px-3 py-2 text-right">{{ t('settings.components.settings.TokenUsageAnalytics.input') }}</th>
            <th class="px-3 py-2 text-right">{{ t('settings.components.settings.TokenUsageAnalytics.cached') }}</th>
            <th class="px-3 py-2 text-right">{{ t('settings.components.settings.TokenUsageAnalytics.output') }}</th>
            <th class="px-3 py-2 text-right">{{ t('settings.components.settings.TokenUsageAnalytics.totalTokens') }}</th>
            <th class="px-3 py-2 text-right">{{ t('settings.components.settings.TokenUsageAnalytics.estimatedCost') }}</th>
            <th class="px-3 py-2 text-right">{{ t('settings.components.settings.TokenUsageAnalytics.share') }}</th>
            <th class="px-3 py-2">{{ t('settings.components.settings.TokenUsageAnalytics.costQuality') }}</th>
            <th class="px-3 py-2">{{ t('settings.components.settings.TokenUsageAnalytics.capturedApiCostStatus') }}</th>
            <th class="px-3 py-2">{{ t('settings.components.settings.TokenUsageAnalytics.currency') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="row in result.breakdownRows" :key="row.rowKey" class="hover:bg-slate-50">
            <td class="px-3 py-2">{{ runtime(row.runtimeKind) }}</td>
            <td class="px-3 py-2">{{ row.providerDisplayName }}</td>
            <td class="px-3 py-2 font-medium text-slate-900">{{ row.modelDisplayName }}</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ integer(row.aggregate.grossInputTokens) }}</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ integer(row.aggregate.cacheReadInputTokens) }}</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ integer(row.aggregate.outputTokens) }}</td>
            <td class="px-3 py-2 text-right font-semibold tabular-nums">{{ integer(row.aggregate.totalTokens) }}</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ rowCost(row) }}</td>
            <td class="px-3 py-2 text-right tabular-nums">{{ rowShare(row) }}</td>
            <td class="px-3 py-2" :title="row.costQuality.missingPriceDimensions.join(', ')">
              {{ qualityLabel(row.costQuality.kind) }}
            </td>
            <td class="px-3 py-2">{{ row.aggregate.apiCostStatus }}</td>
            <td class="px-3 py-2">{{ row.costQuality.currency || notAvailable }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import type {
  TokenUsageAnalyticsBreakdownRow,
  TokenUsageAnalyticsMetric,
  TokenUsageAnalyticsResult,
} from '~/types/tokenUsageAnalytics';
import {
  formatTokenUsageAnalyticsCost,
  tokenUsageBreakdownShare,
} from '~/utils/tokenUsageAnalyticsPresentation';

const props = defineProps<{ result: TokenUsageAnalyticsResult; metric: TokenUsageAnalyticsMetric }>();
const { t } = useLocalization();
const runtimeLabels: Record<string, string> = {
  autobyteus: 'Autobyteus', codex_app_server: 'Codex', claude_agent_sdk: 'Claude SDK',
};
const notAvailable = computed(() => t('settings.components.settings.TokenUsageAnalytics.notAvailable'));
const notComparable = computed(() => t('settings.components.settings.TokenUsageAnalytics.notComparable'));
const runtime = (value: string) => runtimeLabels[value] ?? value;
const integer = (value: number) => new Intl.NumberFormat().format(value);
const qualityLabel = (kind: string) => t(`settings.components.settings.TokenUsageAnalytics.quality${kind}`);
const rowCost = (row: TokenUsageAnalyticsBreakdownRow) => formatTokenUsageAnalyticsCost({
  value: row.aggregate.estimatedApiTotalCost,
  currency: row.costQuality.currency,
  qualityKind: row.costQuality.kind,
  localLabel: t('settings.components.settings.TokenUsageAnalytics.localNoBill'),
  unpricedLabel: t('settings.components.settings.TokenUsageAnalytics.unpriced'),
  currencyUnavailableLabel: t('settings.components.settings.TokenUsageAnalytics.currencyUnavailable'),
});
const rowShare = (row: TokenUsageAnalyticsBreakdownRow) => {
  const share = tokenUsageBreakdownShare(props.result, row, props.metric);
  return share == null ? notComparable.value : new Intl.NumberFormat(undefined, {
    style: 'percent', maximumFractionDigits: 1,
  }).format(share);
};
</script>
