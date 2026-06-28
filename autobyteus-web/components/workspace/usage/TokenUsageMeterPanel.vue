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
              <span class="text-sm font-semibold tabular-nums text-slate-900">{{ formatPercent(primarySummary.contextWindowUsagePercent) }}</span>
            </div>
            <div class="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div class="h-full rounded-full bg-blue-500" :style="{ width: formatProgressWidth(primarySummary.contextWindowUsagePercent) }" />
            </div>
            <p class="mt-2 text-xs text-slate-500">
              {{ formatInteger(primarySummary.latestPromptTokens || 0) }} /
              {{ formatInteger(primarySummary.effectiveContextWindowTokens || 0) }}
              {{ $t('shell.tokenUsage.contextTokens') }}
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
import { computed } from 'vue';
import TeamTokenUsageSummary from '~/components/workspace/usage/TeamTokenUsageSummary.vue';
import { createTokenUsageFormatter } from '~/components/workspace/usage/tokenUsageFormatting';
import { useTokenUsageWorkspaceScope } from '~/composables/useTokenUsageWorkspaceScope';
import type { TokenUsageRunSummary } from '~/types/tokenUsageMeter';

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

const hasCurrentPrompt = (summary: TokenUsageRunSummary): boolean => (
  Boolean(summary.effectiveContextWindowTokens) && summary.latestPromptTokens !== null && summary.contextWindowUsagePercent !== null
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

const primaryEmptyMessage = computed(() => {
  if (primaryUnavailable.value) return t('shell.tokenUsage.focusUnavailable');
  if (primaryLoading.value) return t('shell.tokenUsage.loading');
  if (primaryError.value) return t('shell.tokenUsage.unavailable');
  return t('shell.tokenUsage.empty');
});
</script>
