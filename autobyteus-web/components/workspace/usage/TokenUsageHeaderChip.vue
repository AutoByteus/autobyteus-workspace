<template>
  <button
    v-if="summary"
    type="button"
    class="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
    :title="title"
    @click="openUsageTab"
  >
    <span>{{ formatTokens(summary.totalTokens) }} {{ t('shell.tokenUsage.headerTokenSuffix') }}</span>
    <span class="mx-1 text-slate-300">·</span>
    <span>{{ costLabel }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTokenUsageMeterStore } from '~/stores/tokenUsageMeterStore';
import { useRightSideTabs } from '~/composables/useRightSideTabs';
import { useRightPanel } from '~/composables/useRightPanel';

const props = defineProps<{
  runId?: string | null;
  teamRunId?: string | null;
}>();

const store = useTokenUsageMeterStore();
const { setActiveTab } = useRightSideTabs();
const { isRightPanelVisible, toggleRightPanel } = useRightPanel();
const { t } = useLocalization();

const summary = computed(() => {
  if (props.teamRunId) return store.getTeamSummary(props.teamRunId);
  if (props.runId) return store.getRunSummary(props.runId);
  return null;
});

const formatTokens = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
};

const costLabel = computed(() => {
  const current = summary.value;
  if (!current) return '';
  if (current.apiCostStatus === 'local_no_api_bill') return t('shell.tokenUsage.priceStatusLocal');
  if (current.apiCostStatus === 'mixed') return t('shell.tokenUsage.priceStatusMixed');
  if (current.estimatedApiTotalCost === null || current.apiCostStatus === 'price_missing') return t('shell.tokenUsage.unpriced');
  const currency = current.currency || 'USD';
  const formatted = new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 4 }).format(current.estimatedApiTotalCost);
  return `${formatted} ${current.apiCostStatus === 'partial_price_missing' ? t('shell.tokenUsage.partialEstimateSuffix') : t('shell.tokenUsage.headerEstimateSuffix')}`;
});

const title = computed(() => summary.value
  ? t('shell.tokenUsage.headerTitleWithTokens', { tokens: summary.value.totalTokens })
  : t('shell.tokenUsage.headerTitle'));

const openUsageTab = () => {
  setActiveTab('usage');
  if (!isRightPanelVisible.value) {
    toggleRightPanel();
  }
};
</script>
