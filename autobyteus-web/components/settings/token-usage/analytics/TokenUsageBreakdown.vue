<template>
  <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" data-testid="detailed-usage-section">
    <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
      <div>
        <h3 class="text-base font-bold tracking-tight text-slate-950">{{ t('settings.components.settings.TokenUsageAnalytics.detailedUsage') }}</h3>
        <p class="mt-1 text-xs text-slate-500">{{ t('settings.components.settings.TokenUsageAnalytics.detailedUsageHelp') }}</p>
      </div>
      <label class="flex items-center gap-2 text-xs font-bold text-slate-600">
        {{ t('settings.components.settings.TokenUsageAnalytics.groupBy') }}
        <select
          :value="grouping"
          class="rounded-lg border-slate-300 bg-white text-sm font-medium text-slate-800 focus:border-blue-500 focus:ring-blue-500"
          @change="onGroupingChange"
        >
          <option value="RUNTIME_MODEL">{{ t('settings.components.settings.TokenUsageAnalytics.runtimeModel') }}</option>
          <option value="RUNTIME">{{ t('settings.components.settings.TokenUsageAnalytics.runtime') }}</option>
          <option value="PROVIDER">{{ t('settings.components.settings.TokenUsageAnalytics.provider') }}</option>
          <option value="MODEL">{{ t('settings.components.settings.TokenUsageAnalytics.model') }}</option>
        </select>
      </label>
    </div>

    <div class="overflow-x-auto border-t border-slate-200">
      <table class="w-full min-w-[720px] text-sm">
        <thead class="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
          <tr>
            <th class="px-4 py-3 sm:px-5">{{ groupingLabel }}</th>
            <th class="px-4 py-3 text-right">{{ t('settings.components.settings.TokenUsageAnalytics.tokens') }}</th>
            <th class="px-4 py-3 text-right">{{ t('settings.components.settings.TokenUsageAnalytics.estimatedApiCost') }}</th>
            <th class="px-4 py-3 text-right">{{ t('settings.components.settings.TokenUsageAnalytics.share') }}</th>
            <th class="px-4 py-3 text-right">{{ t('settings.components.settings.TokenUsageAnalytics.details') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <template v-for="row in displayRows" :key="row.key">
            <tr class="hover:bg-slate-50/80">
              <td class="px-4 py-3 sm:px-5">
                <span class="block font-semibold text-slate-900">{{ row.label }}</span>
                <span class="mt-0.5 block text-xs text-slate-500">{{ row.context }}</span>
              </td>
              <td class="px-4 py-3 text-right font-medium tabular-nums text-slate-900">{{ integer(row.aggregate.totalTokens) }}</td>
              <td class="px-4 py-3 text-right tabular-nums">
                <span class="block text-slate-900">{{ rowCost(row) }}</span>
                <span class="mt-0.5 block text-xs text-slate-500">{{ qualityLabel(row.costQuality.kind) }}</span>
                <span v-if="row.costQuality.missingPriceDimensions.length" class="mt-0.5 block text-xs text-amber-700">
                  {{ t('settings.components.settings.TokenUsageAnalytics.missingDimensions') }}: {{ row.costQuality.missingPriceDimensions.join(', ') }}
                </span>
              </td>
              <td class="px-4 py-3 text-right tabular-nums text-slate-700">{{ rowShare(row) }}</td>
              <td class="px-4 py-3 text-right">
                <button
                  type="button"
                  class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  :aria-expanded="expandedRows.has(row.key)"
                  :aria-controls="detailsId(row.key)"
                  @click="toggleRow(row.key)"
                >
                  {{ expandedRows.has(row.key) ? t('settings.components.settings.TokenUsageAnalytics.hideDetails') : t('settings.components.settings.TokenUsageAnalytics.details') }}
                  <svg aria-hidden="true" class="h-3.5 w-3.5 transition-transform" :class="expandedRows.has(row.key) ? 'rotate-180' : ''" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.51a.75.75 0 0 1-1.08 0l-4.25-4.51a.75.75 0 0 1 .02-1.06Z" clip-rule="evenodd" /></svg>
                </button>
              </td>
            </tr>
            <tr v-if="expandedRows.has(row.key)" :id="detailsId(row.key)" class="bg-blue-50/50">
              <td colspan="5" class="px-4 py-4 sm:px-5">
                <dl class="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
                  <div v-for="detail in exactDetails(row)" :key="detail.label">
                    <dt class="text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ detail.label }}</dt>
                    <dd class="mt-1 font-semibold tabular-nums text-slate-900">{{ detail.value }}</dd>
                  </div>
                </dl>
                <p class="mt-3 text-xs text-slate-500">
                  {{ t('settings.components.settings.TokenUsageAnalytics.costEvidence', { status: row.aggregate.apiCostStatus, currency: row.costQuality.currency || notAvailable }) }}
                </p>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import type {
  TokenUsageAnalyticsBreakdownRow,
  TokenUsageAnalyticsGrouping,
  TokenUsageAnalyticsMetric,
  TokenUsageAnalyticsResult,
} from '~/types/tokenUsageAnalytics';
import {
  formatTokenUsageAnalyticsCost,
  mergeTokenUsageAnalyticsCostQualities,
} from '~/utils/tokenUsageAnalyticsPresentation';

type DetailedUsageAggregate = Pick<TokenUsageAnalyticsBreakdownRow['aggregate'],
  'grossInputTokens' | 'standardInputTokens' | 'cacheReadInputTokens' | 'cacheCreationInputTokens' |
  'outputTokens' | 'reasoningOutputTokens' | 'totalTokens' | 'estimatedApiTotalCost' | 'apiCostStatus'>;

type DetailedUsageRow = {
  key: string;
  label: string;
  context: string;
  aggregate: DetailedUsageAggregate;
  costQuality: TokenUsageAnalyticsBreakdownRow['costQuality'];
  sourceRows: TokenUsageAnalyticsBreakdownRow[];
};

const props = defineProps<{
  result: TokenUsageAnalyticsResult;
  metric: TokenUsageAnalyticsMetric;
  grouping: TokenUsageAnalyticsGrouping;
}>();
const emit = defineEmits<{ 'update:grouping': [value: TokenUsageAnalyticsGrouping] }>();
const { t, resolvedLocale } = useLocalization();
const expandedRows = reactive(new Set<string>());
const runtimeLabels: Record<string, string> = { autobyteus: 'Autobyteus', codex_app_server: 'Codex', claude_agent_sdk: 'Claude SDK' };
const notAvailable = computed(() => t('settings.components.settings.TokenUsageAnalytics.notAvailable'));
const integer = (value: number) => new Intl.NumberFormat(resolvedLocale.value).format(value);
const percent = (value: number) => new Intl.NumberFormat(resolvedLocale.value, { style: 'percent', maximumFractionDigits: 1 }).format(value);
const runtime = (value: string) => runtimeLabels[value] ?? value;
const groupingLabel = computed(() => props.grouping === 'RUNTIME_MODEL'
  ? t('settings.components.settings.TokenUsageAnalytics.runtimeModel')
  : t(`settings.components.settings.TokenUsageAnalytics.${props.grouping.toLowerCase()}`));
const onGroupingChange = (event: Event) => emit('update:grouping', (event.target as HTMLSelectElement).value as TokenUsageAnalyticsGrouping);
const identity = (row: TokenUsageAnalyticsBreakdownRow) => {
  if (props.grouping === 'RUNTIME') return { key: row.runtimeKind, label: runtime(row.runtimeKind), context: t('settings.components.settings.TokenUsageAnalytics.runtime') };
  if (props.grouping === 'PROVIDER') return { key: row.providerKey, label: row.providerDisplayName, context: t('settings.components.settings.TokenUsageAnalytics.provider') };
  if (props.grouping === 'MODEL') return { key: row.modelKey, label: row.modelDisplayName, context: t('settings.components.settings.TokenUsageAnalytics.model') };
  return { key: `${row.runtimeKind}:${row.modelKey}`, label: `${runtime(row.runtimeKind)} · ${row.modelDisplayName}`, context: t('settings.components.settings.TokenUsageAnalytics.runtimeModel') };
};
const toDetailedAggregate = (row: TokenUsageAnalyticsBreakdownRow): DetailedUsageAggregate => ({
  grossInputTokens: row.aggregate.grossInputTokens,
  standardInputTokens: row.aggregate.standardInputTokens,
  cacheReadInputTokens: row.aggregate.cacheReadInputTokens,
  cacheCreationInputTokens: row.aggregate.cacheCreationInputTokens,
  outputTokens: row.aggregate.outputTokens,
  reasoningOutputTokens: row.aggregate.reasoningOutputTokens,
  totalTokens: row.aggregate.totalTokens,
  estimatedApiTotalCost: row.aggregate.estimatedApiTotalCost,
  apiCostStatus: row.aggregate.apiCostStatus,
});
const displayRows = computed<DetailedUsageRow[]>(() => {
  const groups = new Map<string, DetailedUsageRow>();
  for (const sourceRow of props.result.breakdownRows) {
    const rowIdentity = identity(sourceRow);
    const current = groups.get(rowIdentity.key);
    if (!current) {
      groups.set(rowIdentity.key, {
        ...rowIdentity,
        aggregate: toDetailedAggregate(sourceRow),
        costQuality: sourceRow.costQuality,
        sourceRows: [sourceRow],
      });
      continue;
    }
    current.sourceRows.push(sourceRow);
    current.aggregate.grossInputTokens += sourceRow.aggregate.grossInputTokens;
    current.aggregate.standardInputTokens += sourceRow.aggregate.standardInputTokens;
    current.aggregate.cacheReadInputTokens += sourceRow.aggregate.cacheReadInputTokens;
    current.aggregate.cacheCreationInputTokens += sourceRow.aggregate.cacheCreationInputTokens;
    current.aggregate.outputTokens += sourceRow.aggregate.outputTokens;
    current.aggregate.reasoningOutputTokens += sourceRow.aggregate.reasoningOutputTokens;
    current.aggregate.totalTokens += sourceRow.aggregate.totalTokens;
    if (sourceRow.aggregate.estimatedApiTotalCost != null) {
      current.aggregate.estimatedApiTotalCost = (current.aggregate.estimatedApiTotalCost ?? 0) + sourceRow.aggregate.estimatedApiTotalCost;
    }
    current.costQuality = mergeTokenUsageAnalyticsCostQualities(current.sourceRows.map((row) => row.costQuality));
    const statuses = new Set(current.sourceRows.map((row) => row.aggregate.apiCostStatus));
    current.aggregate.apiCostStatus = statuses.size === 1 ? [...statuses][0]! : 'mixed';
  }
  return [...groups.values()].sort((left, right) => (
    right.aggregate.totalTokens - left.aggregate.totalTokens || left.label.localeCompare(right.label, resolvedLocale.value)
  ));
});
const qualityLabel = (kind: string) => t(`settings.components.settings.TokenUsageAnalytics.quality${kind}`);
const rowCost = (row: DetailedUsageRow) => formatTokenUsageAnalyticsCost({
  value: row.aggregate.estimatedApiTotalCost,
  currency: row.costQuality.currency,
  qualityKind: row.costQuality.kind,
  localLabel: t('settings.components.settings.TokenUsageAnalytics.localNoBill'),
  unpricedLabel: t('settings.components.settings.TokenUsageAnalytics.unpriced'),
  currencyUnavailableLabel: t('settings.components.settings.TokenUsageAnalytics.currencyUnavailable'),
  locale: resolvedLocale.value,
});
const rowShare = (row: DetailedUsageRow) => {
  const rowValue = props.metric === 'TOKENS' ? row.aggregate.totalTokens : row.aggregate.estimatedApiTotalCost;
  const totalValue = props.metric === 'TOKENS' ? props.result.selectedAggregate.totalTokens : props.result.selectedAggregate.estimatedApiTotalCost;
  if (rowValue == null || totalValue == null || totalValue === 0 || (props.metric === 'COST' && (
    !['COMPLETE', 'PARTIAL'].includes(row.costQuality.kind) ||
    !['COMPLETE', 'PARTIAL'].includes(props.result.selectedCostQuality.kind) ||
    !row.costQuality.currency ||
    row.costQuality.currency !== props.result.selectedCostQuality.currency
  ))) return notAvailable.value;
  return percent(rowValue / totalValue);
};
const exactDetails = (row: DetailedUsageRow) => [
  { label: t('settings.components.settings.TokenUsageAnalytics.uncachedInput'), value: integer(row.aggregate.standardInputTokens) },
  { label: t('settings.components.settings.TokenUsageAnalytics.cachedInput'), value: integer(row.aggregate.cacheReadInputTokens) },
  { label: t('settings.components.settings.TokenUsageAnalytics.cacheWrite'), value: integer(row.aggregate.cacheCreationInputTokens) },
  { label: t('settings.components.settings.TokenUsageAnalytics.grossInput'), value: integer(row.aggregate.grossInputTokens) },
  { label: t('settings.components.settings.TokenUsageAnalytics.output'), value: integer(row.aggregate.outputTokens) },
  { label: t('settings.components.settings.TokenUsageAnalytics.reasoningIncluded'), value: integer(row.aggregate.reasoningOutputTokens) },
];
const toggleRow = (key: string) => expandedRows.has(key) ? expandedRows.delete(key) : expandedRows.add(key);
const detailsId = (key: string) => `token-usage-details-${key.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
watch(() => props.grouping, () => expandedRows.clear());
</script>
