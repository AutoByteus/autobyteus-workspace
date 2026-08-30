<template>
  <div class="min-h-0 flex-1 overflow-auto bg-slate-50">
    <div class="mx-auto flex max-w-[1600px] flex-col gap-4 p-4 sm:p-5 lg:p-6">
      <TokenUsageAnalyticsControls v-model:metric="metric" />
      <div class="sr-only" aria-live="polite">{{ liveStatus }}</div>

      <div v-if="store.loading" class="space-y-4" aria-busy="true" :aria-label="t('settings.components.settings.TokenUsageAnalytics.loading')">
        <div class="grid overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          <div v-for="index in 6" :key="index" class="h-32 animate-pulse border border-white bg-slate-100"></div>
        </div>
        <div class="h-80 animate-pulse rounded-2xl bg-slate-200"></div>
      </div>

      <div v-else-if="store.error" class="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-900" role="alert">
        <p class="font-semibold">{{ displayError }}</p>
        <button class="mt-3 rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-2" @click="retry">
          {{ t('settings.components.settings.TokenUsageAnalytics.retry') }}
        </button>
      </div>

      <template v-else-if="store.result">
        <template v-if="store.result.coverage.status === 'UNAVAILABLE'">
          <TokenUsageAnalyticsCoverage :result="store.result" />
          <div class="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-sm">
            {{ t('settings.components.settings.TokenUsageAnalytics.unavailableEmpty') }}
          </div>
        </template>
        <template v-else-if="store.result.selectedAggregate.usageReportCount === 0">
          <TokenUsageAnalyticsCoverage :result="store.result" />
          <div class="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p class="font-semibold text-slate-900">{{ t('settings.components.settings.TokenUsageAnalytics.noTrackedUsage') }}</p>
            <p class="mt-1 text-sm text-slate-500">{{ t('settings.components.settings.TokenUsageAnalytics.widenOrClear') }}</p>
          </div>
        </template>
        <template v-else>
          <TokenUsageAnalyticsSummaryCards :result="store.result" :metric="metric" />
          <TokenUsageTrendChart :result="store.result" :metric="metric" />
          <TokenUsageBreakdown v-model:grouping="grouping" :result="store.result" :metric="metric" />
        </template>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import { useTokenUsageAnalyticsStore } from '~/stores/tokenUsageAnalytics';
import type { TokenUsageAnalyticsGrouping, TokenUsageAnalyticsMetric } from '~/types/tokenUsageAnalytics';
import TokenUsageAnalyticsControls from './TokenUsageAnalyticsControls.vue';
import TokenUsageAnalyticsCoverage from './TokenUsageAnalyticsCoverage.vue';
import TokenUsageAnalyticsSummaryCards from './TokenUsageAnalyticsSummaryCards.vue';
import TokenUsageBreakdown from './TokenUsageBreakdown.vue';
import TokenUsageTrendChart from './TokenUsageTrendChart.vue';

const { t } = useLocalization();
const store = useTokenUsageAnalyticsStore();
const metric = ref<TokenUsageAnalyticsMetric>('TOKENS');
const grouping = ref<TokenUsageAnalyticsGrouping>('RUNTIME_MODEL');
const displayError = computed(() => store.error?.includes('TOKEN_USAGE_HISTORY_MIGRATION_REQUIRED')
  ? t('settings.components.settings.TokenUsageStatistics.historyMigrationRequired')
  : store.error);
const liveStatus = computed(() => store.loading
  ? t('settings.components.settings.TokenUsageAnalytics.loading')
  : store.error
    ? displayError.value
    : store.result
      ? t('settings.components.settings.TokenUsageAnalytics.loaded')
      : '');
const retry = () => void store.fetch().catch(() => undefined);

onMounted(() => { if (!store.result) retry(); });
</script>
