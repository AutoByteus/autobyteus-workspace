<template>
  <div class="flex h-full min-h-0 flex-col bg-white">
    <div class="border-b border-slate-200 px-4 py-3">
      <h2 class="text-sm font-semibold text-slate-900">{{ $t('shell.tokenUsage.title') }}</h2>
      <p class="mt-1 text-xs text-slate-500">{{ $t('shell.tokenUsage.subtitle') }}</p>
    </div>

    <div class="flex-1 min-h-0 overflow-auto p-4 space-y-4">
      <section v-if="primarySummary" class="space-y-3">
        <div class="grid grid-cols-3 gap-2">
          <MetricCard :label="$t('shell.tokenUsage.input')" :value="formatInteger(primarySummary.inputTokens)" />
          <MetricCard :label="$t('shell.tokenUsage.output')" :value="formatInteger(primarySummary.outputTokens)" />
          <MetricCard :label="$t('shell.tokenUsage.total')" :value="formatInteger(primarySummary.totalTokens)" />
        </div>
        <div class="grid grid-cols-3 gap-2">
          <MetricCard :label="$t('shell.tokenUsage.inputCost')" :value="formatCost(primarySummary.estimatedApiInputCost, primarySummary.currency)" />
          <MetricCard :label="$t('shell.tokenUsage.outputCost')" :value="formatCost(primarySummary.estimatedApiOutputCost, primarySummary.currency)" />
          <MetricCard :label="$t('shell.tokenUsage.totalEstimate')" :value="formatCost(primarySummary.estimatedApiTotalCost, primarySummary.currency)" />
        </div>
        <div class="rounded-lg border border-slate-200 p-3 text-xs text-slate-600">
          <div class="flex items-center justify-between gap-3">
            <span class="font-medium text-slate-700">{{ $t('shell.tokenUsage.priceStatus') }}</span>
            <span :class="statusClass(primarySummary.apiCostStatus)">{{ primarySummary.apiCostStatus }}</span>
          </div>
          <div class="mt-2 grid grid-cols-1 gap-1">
            <div>{{ $t('shell.tokenUsage.latestModel') }} <span class="font-medium">{{ primarySummary.latestModelIdentifier || t('shell.tokenUsage.unknown') }}</span></div>
            <div>{{ $t('shell.tokenUsage.runtime') }} <span class="font-medium">{{ primarySummary.latestRuntimeKind || t('shell.tokenUsage.unknown') }}</span></div>
            <div>{{ $t('shell.tokenUsage.events') }} <span class="font-medium">{{ primarySummary.eventCount }}</span></div>
          </div>
        </div>
        <div v-if="primarySummary.effectiveContextBudgetTokens" class="rounded-lg border border-slate-200 p-3 text-xs text-slate-600">
          <div class="flex items-center justify-between">
            <span class="font-medium text-slate-700">{{ $t('shell.tokenUsage.latestContextPressure') }}</span>
            <span>{{ formatPercent(primarySummary.contextPressurePercent) }}</span>
          </div>
          <div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div class="h-full rounded-full bg-blue-500" :style="{ width: `${Math.min(primarySummary.contextPressurePercent || 0, 100)}%` }" />
          </div>
          <p class="mt-2">{{ formatInteger(primarySummary.latestContextInputTokens || 0) }} / {{ formatInteger(primarySummary.effectiveContextBudgetTokens) }} {{ $t('shell.tokenUsage.contextTokens') }}</p>
        </div>
      </section>

      <section v-if="teamSummary && focusedMemberSummary && focusedMemberSummary.runId !== teamSummary.runId" class="space-y-2">
        <h3 class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ $t('shell.tokenUsage.focusedMember') }}</h3>
        <div class="rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
          <div class="flex justify-between"><span>{{ $t('shell.tokenUsage.memberTokens') }}</span><strong>{{ formatInteger(focusedMemberSummary.totalTokens) }}</strong></div>
          <div class="mt-1 flex justify-between"><span>{{ $t('shell.tokenUsage.memberCost') }}</span><strong>{{ formatCost(focusedMemberSummary.estimatedApiTotalCost, focusedMemberSummary.currency) }}</strong></div>
        </div>
      </section>

      <div v-if="!primarySummary" class="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
        {{ $t('shell.tokenUsage.empty') }}
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

const MetricCard = defineComponent({
  props: { label: { type: String, required: true }, value: { type: String, required: true } },
  setup(props) {
    return () => h('div', { class: 'rounded-lg border border-slate-200 bg-slate-50 p-3' }, [
      h('div', { class: 'text-[11px] font-medium uppercase tracking-wide text-slate-500' }, props.label),
      h('div', { class: 'mt-1 text-sm font-semibold text-slate-900' }, props.value),
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

watch(activeRunId, (runId) => {
  if (runId) void meterStore.fetchAgentRunSummary(runId).catch(() => undefined);
}, { immediate: true });

watch(activeTeamRunId, (teamRunId) => {
  if (teamRunId) void meterStore.fetchTeamRunSummary(teamRunId).catch(() => undefined);
}, { immediate: true });

const formatInteger = (value: number): string => new Intl.NumberFormat().format(value);
const formatCost = (value: number | null, currency: string | null): string => {
  if (value === null) return t('shell.tokenUsage.unpriced');
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 4 }).format(value);
};
const formatPercent = (value: number | null): string => value === null ? t('shell.tokenUsage.unknown') : `${value.toFixed(1)}%`;
const statusClass = (status: string): string => status === 'estimated'
  ? 'rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700'
  : 'rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700';
</script>
