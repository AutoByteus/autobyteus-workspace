<template>
  <div class="flex h-full min-h-0 flex-col bg-slate-50">
    <div class="border-b border-slate-200 bg-white px-5 py-4">
      <h2 class="text-base font-semibold tracking-tight text-slate-950">{{ $t('shell.tokenUsage.title') }}</h2>
      <p class="mt-1 text-sm text-slate-500">{{ $t('shell.tokenUsage.subtitle') }}</p>
    </div>

    <div class="min-h-0 flex-1 overflow-auto">
      <div class="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-5">
        <section v-if="primarySummary" class="space-y-4" data-test="token-usage-primary">
          <section v-if="hasCurrentPrompt(primarySummary)" class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div class="flex flex-wrap items-baseline justify-between gap-3">
              <h3 class="text-sm font-semibold text-slate-900" :title="t('shell.tokenUsage.latestPromptTooltip')">{{ $t('shell.tokenUsage.latestPrompt') }}</h3>
              <span v-if="hasKnownContextCapacity(primarySummary)" class="text-sm font-semibold tabular-nums text-slate-900">{{ formatPercent(primarySummary.contextWindowUsagePercent ?? 0) }}</span>
            </div>
            <div v-if="hasKnownContextCapacity(primarySummary)" class="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div class="h-full rounded-full bg-blue-500" :style="{ width: formatProgressWidth(primarySummary.contextWindowUsagePercent ?? 0) }" />
            </div>
            <p v-if="hasKnownContextCapacity(primarySummary)" class="mt-2 text-xs text-slate-500">
              {{ formatInteger(primarySummary.latestPromptTokens ?? 0) }} /
              {{ formatInteger(primarySummary.effectiveContextWindowTokens ?? 0) }}
              {{ $t('shell.tokenUsage.contextTokens') }}
            </p>
            <p v-else class="mt-2 text-sm text-slate-600" data-test="context-limit-unavailable">
              {{ formatInteger(primarySummary.latestPromptTokens ?? 0) }} · {{ $t('shell.tokenUsage.contextLimitUnavailable') }}
            </p>
          </section>

          <div class="grid gap-3" style="grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));">
            <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" data-test="gross-input-card">
              <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-500" :title="t('shell.tokenUsage.runTotalMetricTooltip')">{{ $t('shell.tokenUsage.grossInput') }}</p>
              <p class="mt-2 text-2xl font-semibold tabular-nums text-slate-950" :title="formatTokenDetail(primarySummary.grossInputTokens)">
                {{ formatCompactInteger(primarySummary.grossInputTokens) }}
                <span class="text-xs font-medium text-slate-500">{{ $t('shell.tokenUsage.tokensLabel') }}</span>
              </p>
              <p class="mt-2 text-xs font-medium text-blue-700" :title="t('shell.tokenUsage.cacheHitTooltip')">{{ cacheSubline(primarySummary) }}</p>
              <p class="mt-1 text-sm text-slate-600">{{ $t('shell.tokenUsage.costLabel') }} <strong class="tabular-nums text-slate-800">{{ formatCost(primarySummary.estimatedApiInputCost, primarySummary.currency, primarySummary.apiCostStatus) }}</strong></p>
            </article>

            <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" data-test="output-card">
              <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-500" :title="t('shell.tokenUsage.runTotalMetricTooltip')">{{ $t('shell.tokenUsage.output') }}</p>
              <p class="mt-2 text-2xl font-semibold tabular-nums text-slate-950" :title="formatTokenDetail(primarySummary.outputTokens)">
                {{ formatCompactInteger(primarySummary.outputTokens) }}
                <span class="text-xs font-medium text-slate-500">{{ $t('shell.tokenUsage.tokensLabel') }}</span>
              </p>
              <p v-if="primarySummary.reasoningOutputTokens > 0" class="mt-2 text-xs font-medium text-blue-700" :title="t('shell.tokenUsage.thinkingTokensTooltip')">
                {{ t('shell.tokenUsage.thinkingTokensIncluded', { tokens: formatInteger(primarySummary.reasoningOutputTokens) }) }}
              </p>
              <p class="mt-1 text-sm text-slate-600">{{ $t('shell.tokenUsage.costLabel') }} <strong class="tabular-nums text-slate-800">{{ formatCost(primarySummary.estimatedApiOutputCost, primarySummary.currency, primarySummary.apiCostStatus) }}</strong></p>
            </article>

            <article class="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm" data-test="total-estimate-card">
              <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-500" :title="t('shell.tokenUsage.runTotalEstimateTooltip')">{{ $t('shell.tokenUsage.totalEstimate') }}</p>
              <p class="mt-2 text-2xl font-semibold tabular-nums text-slate-950" :title="formatTokenDetail(primarySummary.totalTokens)">
                {{ formatCompactInteger(primarySummary.totalTokens) }}
                <span class="text-xs font-medium text-slate-500">{{ $t('shell.tokenUsage.tokensLabel') }}</span>
              </p>
              <p class="mt-2 text-sm text-slate-600">{{ $t('shell.tokenUsage.estimateLabel') }} <strong class="tabular-nums text-slate-900">{{ formatCost(primarySummary.estimatedApiTotalCost, primarySummary.currency, primarySummary.apiCostStatus) }}</strong></p>
              <span :class="[statusClass(primarySummary.apiCostStatus), 'mt-2']">{{ formatStatus(primarySummary.apiCostStatus) }}</span>
            </article>
          </div>

          <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 class="text-sm font-semibold text-slate-900">{{ $t('shell.tokenUsage.inputBreakdown') }}</h3>
            <dl class="mt-3 divide-y divide-slate-100 text-sm">
              <div v-for="row in inputBreakdownRows" :key="row.label" class="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 py-2">
                <dt class="min-w-0 text-slate-600">{{ row.label }}</dt>
                <dd class="tabular-nums text-slate-900">{{ row.tokens }}</dd>
                <dd class="min-w-[5rem] text-right tabular-nums text-slate-700">{{ row.cost }}</dd>
              </div>
            </dl>
          </section>

          <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 class="text-sm font-semibold text-slate-900">{{ $t('shell.tokenUsage.pricingDetails') }}</h3>
            <dl class="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
              <dt class="text-slate-500">{{ trimLabel($t('shell.tokenUsage.latestModel')) }}</dt>
              <dd class="min-w-0 truncate font-medium text-slate-800" :title="primarySummary.latestModelIdentifier || t('shell.tokenUsage.unknown')">{{ primarySummary.latestModelIdentifier || t('shell.tokenUsage.unknown') }}</dd>
              <dt class="text-slate-500">{{ trimLabel($t('shell.tokenUsage.runtime')) }}</dt>
              <dd class="min-w-0 truncate text-slate-800" :title="primarySummary.latestRuntimeKind || t('shell.tokenUsage.unknown')">{{ primarySummary.latestRuntimeKind || t('shell.tokenUsage.unknown') }}</dd>
              <dt class="text-slate-500">{{ $t('shell.tokenUsage.priceStatus') }}</dt>
              <dd><span :class="statusClass(primarySummary.apiCostStatus)">{{ formatStatus(primarySummary.apiCostStatus) }}</span></dd>
              <dt class="text-slate-500">{{ $t('shell.tokenUsage.usageReports') }}</dt>
              <dd class="tabular-nums text-slate-800" :title="t('shell.tokenUsage.usageReportsTooltip')">{{ t('shell.tokenUsage.usageReportsValue', { count: formatInteger(primarySummary.usageReportCount) }) }}</dd>
              <template v-if="primarySummary.missingPriceDimensions.length > 0">
                <dt class="text-slate-500">{{ $t('shell.tokenUsage.missingPriceDimensions') }}</dt>
                <dd class="text-slate-800">{{ primarySummary.missingPriceDimensions.join(', ') }}</dd>
              </template>
            </dl>

            <div class="mt-4 border-t border-slate-100 pt-3">
              <button
                type="button"
                class="flex w-full items-center gap-2 rounded-lg px-1 py-2 text-left text-sm font-semibold text-blue-700 transition-colors hover:bg-gray-50 active:bg-gray-100 focus:outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-gray-300"
                data-test="calculation-details-toggle"
                :aria-expanded="calculationDetailsExpanded"
                :aria-controls="calculationDetailsPanelId"
                @click="calculationDetailsExpanded = !calculationDetailsExpanded"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="shrink-0 text-gray-500 transition-transform duration-300 transform"
                  :class="calculationDetailsExpanded ? '' : '-rotate-90'"
                  aria-hidden="true"
                  data-test="calculation-details-chevron"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
                <span>{{ $t('shell.tokenUsage.calculationDetails') }}</span>
              </button>

              <div
                v-if="calculationDetailsExpanded"
                :id="calculationDetailsPanelId"
                class="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700 ring-1 ring-inset ring-slate-100"
                data-test="calculation-details-panel"
              >
                <p>{{ $t('shell.tokenUsage.calculationDetailsHelp') }}</p>
                <p class="mt-1 font-medium text-slate-800">{{ $t('shell.tokenUsage.calculationFormula') }}</p>
                <p v-if="primarySummary.apiCostStatus === 'mixed'" class="mt-2 text-xs text-amber-700">
                  {{ $t('shell.tokenUsage.mixedCalculationDetails') }}
                </p>
                <p v-else-if="primarySummary.apiCostStatus === 'local_no_api_bill'" class="mt-2 text-xs text-sky-700">
                  {{ $t('shell.tokenUsage.localNoUnitPrices') }}
                </p>

                <div class="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <div class="hidden grid-cols-[minmax(0,1.4fr)_minmax(6rem,0.8fr)_minmax(7rem,0.9fr)_minmax(5rem,0.7fr)] gap-3 border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:grid">
                    <span>{{ $t('shell.tokenUsage.component') }}</span>
                    <span class="text-right">{{ $t('shell.tokenUsage.tokensLabel') }}</span>
                    <span class="text-right">{{ $t('shell.tokenUsage.unitPrice') }}</span>
                    <span class="text-right">{{ $t('shell.tokenUsage.costLabel') }}</span>
                  </div>
                  <div class="divide-y divide-slate-100">
                    <div
                      v-for="row in calculationRows"
                      :key="row.key"
                      class="px-3 py-2"
                      :title="row.title"
                    >
                      <div class="grid gap-1 sm:grid-cols-[minmax(0,1.4fr)_minmax(6rem,0.8fr)_minmax(7rem,0.9fr)_minmax(5rem,0.7fr)] sm:gap-3">
                        <div class="font-medium text-slate-700">{{ row.label }}</div>
                        <div class="tabular-nums text-slate-900 sm:text-right">{{ row.tokens }}</div>
                        <div class="tabular-nums text-slate-700 sm:text-right">{{ row.unitPrice }}</div>
                        <div class="tabular-nums text-slate-900 sm:text-right">{{ row.cost }}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <dl class="mt-3 space-y-1 text-sm">
                  <div v-for="total in calculationTotals" :key="total.label" class="flex items-center justify-between gap-3">
                    <dt class="text-slate-600">{{ total.label }}</dt>
                    <dd class="tabular-nums font-semibold text-slate-900">{{ total.cost }}</dd>
                  </div>
                </dl>
                <p v-if="primarySummary.reasoningOutputTokens > 0" class="mt-2 text-xs text-slate-500">
                  {{ $t('shell.tokenUsage.thinkingTokensTooltip') }}
                </p>
                <p class="mt-2 text-xs text-slate-500">{{ $t('shell.tokenUsage.roundingNote') }}</p>
              </div>
            </div>
          </section>
        </section>

        <div v-if="!primarySummary" class="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          {{ primaryEmptyMessage }}
        </div>

        <TeamTokenUsageSummary
          v-if="isTeamContext"
          :rows="teamRows"
          :team-total-summary="teamTotalSummary"
          :team-total-loading="teamTotalLoading"
          :team-total-error="teamTotalError"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import TeamTokenUsageSummary from '~/components/workspace/usage/TeamTokenUsageSummary.vue';
import { createTokenUsageFormatter } from '~/components/workspace/usage/tokenUsageFormatting';
import { useTokenUsageWorkspaceScope } from '~/composables/useTokenUsageWorkspaceScope';
import type { TokenUsageRunSummary, TokenUsageUnitPriceSummary } from '~/types/tokenUsageMeter';

const { t } = useLocalization();
const {
  cacheSubline,
  formatCompactInteger,
  formatCost,
  formatInteger,
  formatPercent,
  formatProgressWidth,
  formatStatus,
  formatTokenDetail,
  formatUnitPrice,
  statusClass,
  tokenCell,
  trimLabel,
} = createTokenUsageFormatter(t);

const {
  isTeamContext,
  primaryError,
  primaryLoading,
  primarySummary,
  primaryUnavailable,
  teamRows,
  teamTotalError,
  teamTotalLoading,
  teamTotalSummary,
} = useTokenUsageWorkspaceScope();

const calculationDetailsExpanded = ref(false);
const calculationDetailsPanelId = 'token-usage-calculation-details';

const hasCurrentPrompt = (summary: TokenUsageRunSummary): boolean => (
  summary.latestPromptTokens !== null
);

const hasKnownContextCapacity = (summary: TokenUsageRunSummary): boolean => (
  summary.effectiveContextWindowTokens !== null
  && summary.effectiveContextWindowTokens > 0
  && summary.contextWindowUsagePercent !== null
);

const inputBreakdownRows = computed(() => {
  const summary = primarySummary.value;
  if (!summary) return [];
  const rows = [
    {
      label: t('shell.tokenUsage.uncachedInput'),
      tokens: tokenCell(summary.standardInputTokens),
      cost: formatCost(summary.estimatedApiStandardInputCost, summary.currency, summary.apiCostStatus),
    },
  ];
  if (summary.cacheState === 'positive' || summary.cacheReadInputTokens > 0) {
    rows.push({
      label: t('shell.tokenUsage.cacheHits'),
      tokens: tokenCell(summary.cacheReadInputTokens),
      cost: formatCost(summary.estimatedApiCacheReadInputCost, summary.currency, summary.apiCostStatus),
    });
  }
  if (summary.cacheCreationInputTokens > 0) {
    rows.push({
      label: t('shell.tokenUsage.cacheWrites'),
      tokens: tokenCell(summary.cacheCreationInputTokens),
      cost: formatCost(summary.estimatedApiCacheCreationInputCost, summary.currency, summary.apiCostStatus),
    });
  }
  rows.push({
    label: t('shell.tokenUsage.totalInputCost'),
    tokens: '',
    cost: formatCost(summary.estimatedApiInputCost, summary.currency, summary.apiCostStatus),
  });
  return rows;
});

interface CalculationRow {
  key: string;
  label: string;
  tokens: string;
  unitPrice: string;
  cost: string;
  title: string;
}

const genericCacheCreationTokens = (summary: TokenUsageRunSummary): number => Math.max(
  summary.cacheCreationInputTokens - summary.cacheCreation5mInputTokens - summary.cacheCreation1hInputTokens,
  0,
);

const shouldShowCalculationRow = (tokens: number, cost: number | null): boolean => tokens > 0 || cost !== null;

const calculationRow = (
  summary: TokenUsageRunSummary,
  input: {
    key: string;
    label: string;
    tokens: number;
    unitPrice: TokenUsageUnitPriceSummary;
    cost: number | null;
    costStatus?: string;
    unitPriceText?: string;
    costText?: string;
  },
): CalculationRow => {
  const unitPrice = input.unitPriceText ?? formatUnitPrice(input.unitPrice, summary.currency);
  const cost = input.costText ?? formatCost(input.cost, summary.currency, input.costStatus ?? summary.apiCostStatus);
  return {
    key: input.key,
    label: input.label,
    tokens: tokenCell(input.tokens),
    unitPrice,
    cost,
    title: `${input.label}: ${formatInteger(input.tokens)} tokens · ${unitPrice} · ${cost}`,
  };
};

const calculationRows = computed<CalculationRow[]>(() => {
  const summary = primarySummary.value;
  if (!summary) return [];
  const rows: CalculationRow[] = [];
  const genericCacheWriteTokens = genericCacheCreationTokens(summary);

  if (shouldShowCalculationRow(summary.standardInputTokens, summary.estimatedApiStandardInputCost)) {
    rows.push(calculationRow(summary, {
      key: 'standard-input',
      label: t('shell.tokenUsage.uncachedInput'),
      tokens: summary.standardInputTokens,
      unitPrice: summary.unitPrices.standardInput,
      cost: summary.estimatedApiStandardInputCost,
    }));
  }
  if (shouldShowCalculationRow(summary.cacheReadInputTokens, summary.estimatedApiCacheReadInputCost)) {
    rows.push(calculationRow(summary, {
      key: 'cache-read-input',
      label: t('shell.tokenUsage.cacheHits'),
      tokens: summary.cacheReadInputTokens,
      unitPrice: summary.unitPrices.cacheReadInput,
      cost: summary.estimatedApiCacheReadInputCost,
    }));
  }
  if (shouldShowCalculationRow(genericCacheWriteTokens, summary.estimatedApiCacheCreationInputCost) && summary.cacheCreation5mInputTokens === 0 && summary.cacheCreation1hInputTokens === 0) {
    rows.push(calculationRow(summary, {
      key: 'cache-creation-input',
      label: t('shell.tokenUsage.cacheWrites'),
      tokens: genericCacheWriteTokens,
      unitPrice: summary.unitPrices.cacheCreationInput,
      cost: summary.estimatedApiCacheCreationInputCost,
    }));
  }
  if (shouldShowCalculationRow(summary.cacheCreation5mInputTokens, summary.estimatedApiCacheCreation5mInputCost)) {
    rows.push(calculationRow(summary, {
      key: 'cache-creation-5m-input',
      label: t('shell.tokenUsage.cacheWrite5m'),
      tokens: summary.cacheCreation5mInputTokens,
      unitPrice: summary.unitPrices.cacheCreation5mInput,
      cost: summary.estimatedApiCacheCreation5mInputCost,
    }));
  }
  if (shouldShowCalculationRow(summary.cacheCreation1hInputTokens, summary.estimatedApiCacheCreation1hInputCost)) {
    rows.push(calculationRow(summary, {
      key: 'cache-creation-1h-input',
      label: t('shell.tokenUsage.cacheWrite1h'),
      tokens: summary.cacheCreation1hInputTokens,
      unitPrice: summary.unitPrices.cacheCreation1hInput,
      cost: summary.estimatedApiCacheCreation1hInputCost,
    }));
  }
  const outputTokens = summary.billableOutputTokens > 0 ? summary.billableOutputTokens : summary.outputTokens;
  if (shouldShowCalculationRow(outputTokens, summary.estimatedApiOutputCost)) {
    rows.push(calculationRow(summary, {
      key: 'output',
      label: t('shell.tokenUsage.output'),
      tokens: outputTokens,
      unitPrice: summary.unitPrices.output,
      cost: summary.estimatedApiOutputCost,
    }));
  }
  if (summary.reasoningOutputTokens > 0) {
    const reasoningUnitPrice = summary.unitPrices.reasoningOutput.status === 'single'
      ? t('shell.tokenUsage.sameAsOutputPrice')
      : formatUnitPrice(summary.unitPrices.reasoningOutput, summary.currency);
    rows.push(calculationRow(summary, {
      key: 'reasoning-output',
      label: t('shell.tokenUsage.thinkingReasoning'),
      tokens: summary.reasoningOutputTokens,
      unitPrice: summary.unitPrices.reasoningOutput,
      cost: summary.estimatedApiReasoningOutputCost,
      unitPriceText: reasoningUnitPrice,
      costText: t('shell.tokenUsage.includedInOutputCost'),
    }));
  }

  return rows;
});

const calculationTotals = computed(() => {
  const summary = primarySummary.value;
  if (!summary) return [];
  return [
    {
      label: t('shell.tokenUsage.inputCost'),
      cost: formatCost(summary.estimatedApiInputCost, summary.currency, summary.apiCostStatus),
    },
    {
      label: t('shell.tokenUsage.outputCost'),
      cost: formatCost(summary.estimatedApiOutputCost, summary.currency, summary.apiCostStatus),
    },
    {
      label: t('shell.tokenUsage.totalEstimate'),
      cost: formatCost(summary.estimatedApiTotalCost, summary.currency, summary.apiCostStatus),
    },
  ];
});

const primaryEmptyMessage = computed(() => {
  if (primaryUnavailable.value) return t('shell.tokenUsage.focusUnavailable');
  if (primaryLoading.value) return t('shell.tokenUsage.loading');
  if (primaryError.value) return t('shell.tokenUsage.unavailable');
  return t('shell.tokenUsage.empty');
});
</script>
