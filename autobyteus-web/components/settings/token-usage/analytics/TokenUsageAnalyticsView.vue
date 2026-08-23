<template>
  <div class="min-h-0 flex-1 overflow-auto">
    <div class="mx-auto flex max-w-[1500px] flex-col gap-4 p-4 sm:p-6 lg:p-8">
      <TokenUsageAnalyticsControls v-model:metric="metric" @export="exportCsv" />
      <div class="sr-only" aria-live="polite">{{ liveStatus }}</div>
      <div v-if="store.loading" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
        <div v-for="index in 4" :key="index" class="h-28 animate-pulse rounded-xl bg-slate-200"></div>
      </div>
      <div v-else-if="store.error" class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900" role="alert">
        <p class="font-semibold">{{ displayError }}</p>
        <button class="mt-3 rounded-lg bg-rose-700 px-3 py-2 text-sm font-semibold text-white" @click="retry">{{ t('settings.components.settings.TokenUsageAnalytics.retry') }}</button>
      </div>
      <template v-else-if="store.result">
        <TokenUsageAnalyticsCoverage :result="store.result" />
        <div v-if="store.result.coverage.status === 'UNAVAILABLE'" class="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
          {{ t('settings.components.settings.TokenUsageAnalytics.unavailableEmpty') }}
        </div>
        <div v-else-if="store.result.selectedAggregate.usageReportCount === 0" class="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p class="font-semibold text-slate-900">{{ t('settings.components.settings.TokenUsageAnalytics.noTrackedUsage') }}</p>
          <p class="mt-1 text-sm text-slate-500">{{ t('settings.components.settings.TokenUsageAnalytics.widenOrClear') }}</p>
        </div>
        <template v-else>
          <TokenUsageAnalyticsSummaryCards :result="store.result" :metric="metric" />
          <div class="grid gap-4 xl:grid-cols-2">
            <TokenUsageTrendChart :result="store.result" :metric="metric" />
            <TokenUsagePaceChart :result="store.result" :metric="metric" />
          </div>
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
import { downloadTokenUsageAnalyticsCsv } from '~/utils/tokenUsageAnalyticsCsv';
import TokenUsageAnalyticsControls from './TokenUsageAnalyticsControls.vue';
import TokenUsageAnalyticsCoverage from './TokenUsageAnalyticsCoverage.vue';
import TokenUsageAnalyticsSummaryCards from './TokenUsageAnalyticsSummaryCards.vue';
import TokenUsageBreakdown from './TokenUsageBreakdown.vue';
import TokenUsagePaceChart from './TokenUsagePaceChart.vue';
import TokenUsageTrendChart from './TokenUsageTrendChart.vue';

const { t } = useLocalization(); const store = useTokenUsageAnalyticsStore();
const metric = ref<TokenUsageAnalyticsMetric>('TOKENS'); const grouping = ref<TokenUsageAnalyticsGrouping>('RUNTIME_MODEL');
const displayError = computed(() => store.error?.includes('TOKEN_USAGE_HISTORY_MIGRATION_REQUIRED') ? t('settings.components.settings.TokenUsageStatistics.historyMigrationRequired') : store.error);
const liveStatus = computed(() => store.loading ? t('settings.components.settings.TokenUsageAnalytics.loading') : store.error ? displayError.value : store.result ? t('settings.components.settings.TokenUsageAnalytics.loaded') : '');
const retry = () => void store.fetch().catch(() => undefined);
const exportCsv = () => { if (store.result) downloadTokenUsageAnalyticsCsv(store.result, grouping.value); };
onMounted(() => { if (!store.result) retry(); });
</script>
