<template>
  <div class="flex h-full min-h-0 flex-col bg-slate-50">
    <div class="border-b border-slate-200 bg-white px-5 py-4">
      <h2 class="text-base font-semibold tracking-tight text-slate-950">{{ $t('shell.tokenUsage.title') }}</h2>
      <p class="mt-1 text-sm text-slate-500">{{ $t('shell.tokenUsage.subtitle') }}</p>
    </div>

    <div class="min-h-0 flex-1 overflow-auto">
      <div class="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-5">
        <section v-if="primarySummary" class="space-y-4">
          <div class="grid gap-3" style="grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));">
            <MetricPairCard
              :label="$t('shell.tokenUsage.input')"
              :token-label="$t('shell.tokenUsage.tokensLabel')"
              :cost-label="$t('shell.tokenUsage.costLabel')"
              :tokens="formatCompactInteger(primarySummary.inputTokens)"
              :token-detail="formatTokenDetail(primarySummary.inputTokens)"
              :cost="formatCost(primarySummary.estimatedApiInputCost, primarySummary.currency)"
            />
            <MetricPairCard
              :label="$t('shell.tokenUsage.output')"
              :token-label="$t('shell.tokenUsage.tokensLabel')"
              :cost-label="$t('shell.tokenUsage.costLabel')"
              :tokens="formatCompactInteger(primarySummary.outputTokens)"
              :token-detail="formatTokenDetail(primarySummary.outputTokens)"
              :cost="formatCost(primarySummary.estimatedApiOutputCost, primarySummary.currency)"
              :reasoning-line="reasoningLine"
              :reasoning-title="reasoningTitle"
            />
            <MetricPairCard
              :label="$t('shell.tokenUsage.total')"
              :token-label="$t('shell.tokenUsage.tokensLabel')"
              :cost-label="$t('shell.tokenUsage.estimateLabel')"
              :tokens="formatCompactInteger(primarySummary.totalTokens)"
              :token-detail="formatTokenDetail(primarySummary.totalTokens)"
              :cost="formatCost(primarySummary.estimatedApiTotalCost, primarySummary.currency)"
              emphasis
            />
          </div>
          <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <h3 class="text-sm font-semibold text-slate-900">{{ $t('shell.tokenUsage.priceStatus') }}</h3>
              <span :class="statusClass(primarySummary.apiCostStatus)">{{ formatStatus(primarySummary.apiCostStatus) }}</span>
            </div>
            <p class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
              <span class="font-medium text-slate-800" :title="primarySummary.latestModelIdentifier || t('shell.tokenUsage.unknown')">
                {{ primarySummary.latestModelIdentifier || t('shell.tokenUsage.unknown') }}
              </span>
              <span class="text-slate-300">·</span>
              <span :title="primarySummary.latestRuntimeKind || t('shell.tokenUsage.unknown')">
                {{ primarySummary.latestRuntimeKind || t('shell.tokenUsage.unknown') }}
              </span>
              <span class="text-slate-300">·</span>
              <span class="tabular-nums">{{ formatEventCount(primarySummary.eventCount) }}</span>
            </p>
          </div>
          <div v-if="hasKnownContextPressure(primarySummary)" class="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
            <div class="flex items-center justify-between gap-3">
              <span class="font-semibold text-slate-800">{{ $t('shell.tokenUsage.latestContextPressure') }}</span>
              <span class="font-semibold tabular-nums text-slate-900">{{ formatPercent(primarySummary.contextPressurePercent) }}</span>
            </div>
            <div class="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div class="h-full rounded-full bg-blue-500" :style="{ width: formatProgressWidth(primarySummary.contextPressurePercent) }" />
            </div>
            <p class="mt-2 text-xs text-slate-500">{{ formatInteger(primarySummary.latestContextInputTokens || 0) }} / {{ formatInteger(primarySummary.effectiveContextBudgetTokens) }} {{ $t('shell.tokenUsage.contextTokens') }}</p>
          </div>
        </section>

        <section
          v-if="teamSummary && focusedMemberSummary && focusedMemberSummary.runId !== teamSummary.runId"
          class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <h3 class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ $t('shell.tokenUsage.focusedMember') }}</h3>
          <dl class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div class="rounded-xl bg-slate-50 px-3 py-2">
              <dt class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{{ $t('shell.tokenUsage.memberTokens') }}</dt>
              <dd class="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                {{ formatCompactInteger(focusedMemberSummary.totalTokens) }}
                <span
                  v-if="shouldShowExactTokens(focusedMemberSummary.totalTokens)"
                  class="ml-1 align-middle text-xs font-medium text-slate-500"
                >
                  {{ formatInteger(focusedMemberSummary.totalTokens) }}
                </span>
              </dd>
            </div>
            <div class="rounded-xl bg-slate-50 px-3 py-2">
              <dt class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{{ $t('shell.tokenUsage.memberCost') }}</dt>
              <dd class="mt-1 text-lg font-semibold tabular-nums text-slate-900">{{ formatCost(focusedMemberSummary.estimatedApiTotalCost, focusedMemberSummary.currency) }}</dd>
            </div>
          </dl>
        </section>

        <div v-if="!primarySummary" class="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          {{ $t('shell.tokenUsage.empty') }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, watch } from 'vue';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useActiveContextStore } from '~/stores/activeContextStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useTokenUsageMeterStore } from '~/stores/tokenUsageMeterStore';
import type { TokenUsageRunSummary } from '~/types/tokenUsageMeter';

const MetricPairCard = defineComponent({
  props: {
    label: { type: String, required: true },
    tokenLabel: { type: String, required: true },
    costLabel: { type: String, required: true },
    tokens: { type: String, required: true },
    tokenDetail: { type: String, required: true },
    cost: { type: String, required: true },
    reasoningLine: { type: String, required: false, default: '' },
    reasoningTitle: { type: String, required: false, default: '' },
    emphasis: { type: Boolean, required: false, default: false },
  },
  setup(props) {
    return () => h('article', {
      class: [
        'min-w-0 rounded-2xl border p-3.5 shadow-sm',
        props.emphasis ? 'border-blue-200 bg-blue-50/50' : 'border-slate-200 bg-white',
      ],
    }, [
      h('div', { class: 'text-[11px] font-semibold uppercase tracking-wide text-slate-500' }, props.label),
      h('div', { class: 'mt-2.5 min-w-0' }, [
        h('div', { class: 'flex min-w-0 items-end gap-2' }, [
          h('strong', {
            class: 'min-w-0 truncate text-xl font-semibold tracking-tight tabular-nums text-slate-950',
            title: props.tokenDetail,
          }, props.tokens),
          h('span', { class: 'pb-1 text-xs font-medium text-slate-500' }, props.tokenLabel),
        ]),
        h('div', {
          class: 'mt-2 flex min-w-0 items-baseline gap-1.5 text-sm text-slate-600',
          title: `${props.costLabel}: ${props.cost}`,
          'aria-label': `${props.costLabel}: ${props.cost}`,
        }, [
          h('span', { class: 'text-[11px] font-medium uppercase tracking-wide text-slate-400' }, props.costLabel),
          h('span', { class: 'min-w-0 truncate font-semibold tabular-nums text-slate-700' }, props.cost),
        ]),
        props.reasoningLine
          ? h('details', { class: 'group mt-2' }, [
              h('summary', {
                class: 'inline-flex cursor-pointer list-none items-center gap-1 whitespace-nowrap rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 transition-colors hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400/30 [&::-webkit-details-marker]:hidden',
                title: props.reasoningTitle,
                'aria-label': props.reasoningTitle ? `${props.reasoningLine}. ${props.reasoningTitle}` : props.reasoningLine,
              }, [
                h('svg', {
                  'aria-hidden': 'true',
                  class: 'h-3 w-3 shrink-0 transition-transform group-open:rotate-180',
                  fill: 'none',
                  viewBox: '0 0 20 20',
                }, [
                  h('path', {
                    d: 'M5.25 7.5L10 12.25L14.75 7.5',
                    stroke: 'currentColor',
                    'stroke-linecap': 'round',
                    'stroke-linejoin': 'round',
                    'stroke-width': '1.8',
                  }),
                ]),
                h('span', props.reasoningLine),
              ]),
              props.reasoningTitle
                ? h('p', { class: 'mt-1.5 rounded-lg bg-blue-50/70 px-2 py-1.5 text-[11px] leading-snug text-slate-600' }, props.reasoningTitle)
                : null,
            ])
          : null,
      ]),
    ]);
  },
});

const selectionStore = useAgentSelectionStore();
const activeContextStore = useActiveContextStore();
const teamContextsStore = useAgentTeamContextsStore();
const meterStore = useTokenUsageMeterStore();
const { t } = useLocalization();

const activeRunId = computed(() => activeContextStore.activeAgentContext?.state.runId ?? null);
const activeTeamRunId = computed(() => teamContextsStore.activeTeamContext?.teamRunId ?? null);

const teamSummary = computed(() => selectionStore.selectedType === 'team' ? meterStore.getTeamSummary(activeTeamRunId.value) : null);
const focusedMemberSummary = computed(() => activeRunId.value ? meterStore.getRunSummary(activeRunId.value) : null);
const primarySummary = computed(() => teamSummary.value ?? focusedMemberSummary.value);
const reasoningLine = computed(() => {
  const tokens = primarySummary.value?.reasoningOutputTokens ?? 0;
  return tokens > 0
    ? t('shell.tokenUsage.thinkingTokensIncluded', { tokens: formatInteger(tokens) })
    : '';
});
const reasoningTitle = computed(() => reasoningLine.value ? t('shell.tokenUsage.thinkingTokensTooltip') : '');

watch(activeRunId, (runId) => {
  if (runId) void meterStore.fetchAgentRunSummary(runId).catch(() => undefined);
}, { immediate: true });

watch(activeTeamRunId, (teamRunId) => {
  if (teamRunId) void meterStore.fetchTeamRunSummary(teamRunId).catch(() => undefined);
}, { immediate: true });

const formatInteger = (value: number): string => new Intl.NumberFormat().format(value);
const formatCompactInteger = (value: number): string => {
  const absoluteValue = Math.abs(value);
  if (absoluteValue < 10_000) return formatInteger(value);
  return new Intl.NumberFormat(undefined, {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: absoluteValue >= 1_000_000 ? 2 : 1,
  }).format(value);
};
const formatTokenDetail = (value: number): string => `${formatInteger(value)} ${t('shell.tokenUsage.tokensLabel')}`;
const formatCost = (value: number | null, currency: string | null): string => {
  if (value === null) return t('shell.tokenUsage.unpriced');
  const fractionDigits = Math.abs(value) >= 1 ? 2 : 4;
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency || 'USD',
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
};
const formatPercent = (value: number | null): string => value === null ? t('shell.tokenUsage.unknown') : `${value.toFixed(1)}%`;
const formatProgressWidth = (value: number | null): string => `${Math.min(Math.max(value ?? 0, 0), 100)}%`;
const formatStatus = (status: string): string => status.replace(/_/g, ' ');
const trimLabel = (label: string): string => label.replace(/[:：]\s*$/, '');
const formatEventCount = (count: number): string => {
  const label = trimLabel(t('shell.tokenUsage.events')).toLowerCase();
  const singularLabel = count === 1 && label.endsWith('s') ? label.slice(0, -1) : label;
  return `${formatInteger(count)} ${singularLabel}`;
};
const shouldShowExactTokens = (value: number): boolean => Math.abs(value) >= 10_000;
const hasKnownContextPressure = (summary: TokenUsageRunSummary): boolean => (
  Boolean(summary.effectiveContextBudgetTokens) && summary.contextPressurePercent !== null
);
const statusClass = (status: string): string => {
  if (status === 'estimated') {
    return 'inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-100';
  }
  if (status === 'mixed') {
    return 'inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200';
  }
  return 'inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-100';
};
</script>
