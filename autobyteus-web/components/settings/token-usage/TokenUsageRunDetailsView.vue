<template>
  <div class="h-full min-h-0 overflow-auto bg-slate-50">
    <div class="mx-auto max-w-[1600px] p-4 sm:p-5 lg:p-6">
      <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" :aria-label="t('settings.components.settings.TokenUsageAnalytics.runControls')">
        <div class="flex flex-wrap items-end gap-3">
          <div class="flex flex-wrap items-end gap-2">
            <label class="grid gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {{ t('settings.components.settings.TokenUsageStatistics.runsCreated') }}
              <input
                id="token-usage-start-date"
                v-model="startDate"
                type="date"
                class="rounded-lg border-slate-300 text-sm font-medium normal-case tracking-normal text-slate-800 focus:border-blue-500 focus:ring-blue-500"
                :aria-label="t('settings.components.settings.TokenUsageStatistics.startDateAriaLabel')"
                :max="endDate"
              >
            </label>
            <span class="pb-2 text-sm text-slate-400">{{ t('settings.components.settings.TokenUsageStatistics.rangeSeparator') }}</span>
            <label class="grid gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <span class="sr-only">{{ t('settings.components.settings.TokenUsageStatistics.endDateAriaLabel') }}</span>
              <input
                id="token-usage-end-date"
                v-model="endDate"
                type="date"
                class="rounded-lg border-slate-300 text-sm font-medium normal-case tracking-normal text-slate-800 focus:border-blue-500 focus:ring-blue-500"
                :aria-label="t('settings.components.settings.TokenUsageStatistics.endDateAriaLabel')"
                :min="startDate"
              >
            </label>
          </div>

          <div class="flex rounded-lg bg-slate-200/70 p-1 sm:ml-auto" role="radiogroup" :aria-label="t('settings.components.settings.TokenUsageStatistics.groupingSelectAriaLabel')">
            <button
              v-for="option in groupingOptions"
              :key="option.value"
              type="button"
              role="radio"
              :aria-checked="selectedGrouping === option.value"
              class="rounded-md px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              :class="selectedGrouping === option.value ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'"
              @click="selectedGrouping = option.value"
            >
              {{ option.label }}
            </button>
          </div>

          <button
            class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="store.isLoading"
            @click="fetchStatistics"
          >
            {{ store.isLoading ? t('settings.components.settings.TokenUsageStatistics.loadingStatistics') : t('settings.components.settings.TokenUsageStatistics.fetchStatistics') }}
          </button>
        </div>
        <p v-if="dateError" class="mt-3 text-sm text-rose-700" role="alert">{{ dateError }}</p>
        <p class="mt-3 flex items-start gap-2 text-sm text-slate-600">
          <svg aria-hidden="true" class="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9" /><path stroke-linecap="round" d="M12 11v5m0-8h.01" /></svg>
          {{ t('settings.components.settings.TokenUsageStatistics.rangeMeaning') }}
        </p>
      </section>

      <div v-if="store.isLoading" class="mt-4 flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-20 text-slate-600 shadow-sm" aria-busy="true">
        <div class="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-b-blue-600"></div>
        <div>{{ t('settings.components.settings.TokenUsageStatistics.loadingStatisticsLong') }}</div>
      </div>

      <div v-else-if="displayError" class="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900" role="alert">
        {{ displayError }}
      </div>

      <div v-else-if="selectedGrouping === 'task' && store.getTaskRows.length === 0" class="mt-4 rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
        <div class="font-semibold text-slate-900">{{ t('settings.components.settings.TokenUsageStatistics.noTaskUsage') }}</div>
        <div class="mt-1 text-sm">{{ t('settings.components.settings.TokenUsageStatistics.tryWiderRangeOrModel') }}</div>
      </div>

      <div v-else-if="selectedGrouping === 'model' && store.getModelRows.length === 0" class="mt-4 rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
        <div class="font-semibold text-slate-900">{{ t('settings.components.settings.TokenUsageStatistics.noModelUsage') }}</div>
      </div>

      <div v-else class="mt-4">
        <TokenUsageTaskStatisticsTable v-if="selectedGrouping === 'task'" :rows="store.getTaskRows" />
        <TokenUsageModelStatisticsTable v-else :rows="store.getModelRows" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import { useTokenUsageRunStatisticsStore } from '~/stores/tokenUsageRunStatistics';
import TokenUsageModelStatisticsTable from './TokenUsageModelStatisticsTable.vue';
import TokenUsageTaskStatisticsTable from './TokenUsageTaskStatisticsTable.vue';

const store = useTokenUsageRunStatisticsStore();
const { t } = useLocalization();
const startDate = ref('');
const endDate = ref('');
const selectedGrouping = ref<'task' | 'model'>('task');
const dateError = ref('');
const groupingOptions = computed<Array<{ value: 'task' | 'model'; label: string }>>(() => [
  { value: 'task', label: t('settings.components.settings.TokenUsageStatistics.groupingTask') },
  { value: 'model', label: t('settings.components.settings.TokenUsageStatistics.groupingModel') },
]);
const displayError = computed(() => store.getError?.includes('TOKEN_USAGE_HISTORY_MIGRATION_REQUIRED')
  ? t('settings.components.settings.TokenUsageStatistics.historyMigrationRequired')
  : store.getError);

const fetchStatistics = async (): Promise<void> => {
  dateError.value = '';
  if (!startDate.value || !endDate.value) {
    dateError.value = t('settings.components.settings.TokenUsageStatistics.selectDatesAlert');
    return;
  }
  if (startDate.value > endDate.value) {
    dateError.value = t('settings.components.settings.TokenUsageAnalytics.invalidDateOrder');
    return;
  }
  try {
    await store.fetchStatistics(startDate.value, endDate.value);
  } catch {
    // The store exposes the user-facing recoverable state.
  }
};

onMounted(() => {
  const today = new Date();
  const lastWeek = new Date(today);
  lastWeek.setDate(today.getDate() - 7);
  startDate.value = lastWeek.toISOString().split('T')[0] ?? '';
  endDate.value = today.toISOString().split('T')[0] ?? '';
  void fetchStatistics();
});
</script>
