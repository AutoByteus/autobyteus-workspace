<template>
  <div class="token-usage-statistics h-full flex flex-col overflow-hidden">
    <div class="flex-1 overflow-auto p-8">
      <div class="mb-6 rounded-lg border border-gray-100 bg-gray-50 p-4">
        <div class="flex flex-wrap items-center gap-3">
          <select
            id="token-usage-grouping"
            v-model="selectedGrouping"
            class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-blue-500 focus:ring-blue-500"
            :aria-label="t('settings.components.settings.TokenUsageStatistics.groupingSelectAriaLabel')"
          >
            <option value="task">{{ t('settings.components.settings.TokenUsageStatistics.groupingTask') }}</option>
            <option value="model">{{ t('settings.components.settings.TokenUsageStatistics.groupingModel') }}</option>
          </select>
          <input
            id="token-usage-start-date"
            v-model="startDate"
            type="date"
            class="rounded-md border border-gray-300 p-2 text-sm focus:border-blue-500 focus:ring-blue-500"
            :aria-label="t('settings.components.settings.TokenUsageStatistics.startDateAriaLabel')"
            :max="endDate"
          >
          <div class="text-gray-400">{{ t('settings.components.settings.TokenUsageStatistics.rangeSeparator') }}</div>
          <input
            id="token-usage-end-date"
            v-model="endDate"
            type="date"
            class="rounded-md border border-gray-300 p-2 text-sm focus:border-blue-500 focus:ring-blue-500"
            :aria-label="t('settings.components.settings.TokenUsageStatistics.endDateAriaLabel')"
            :min="startDate"
          >
          <button
            class="ml-auto rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="store.isLoading"
            @click="fetchStatistics"
          >
            {{ store.isLoading ? t('settings.components.settings.TokenUsageStatistics.loadingStatistics') : t('settings.components.settings.TokenUsageStatistics.fetchStatistics') }}
          </button>
        </div>
        <p class="mt-3 text-sm text-gray-600">
          {{ t('settings.components.settings.TokenUsageStatistics.rangeMeaning') }}
        </p>
      </div>

      <div v-if="store.isLoading" class="flex flex-col items-center justify-center gap-3 py-20 text-gray-600">
        <div class="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
        <div>{{ t('settings.components.settings.TokenUsageStatistics.loadingStatisticsLong') }}</div>
      </div>

      <div v-else-if="displayError" class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900" role="alert">
        {{ displayError }}
      </div>

      <div v-else-if="selectedGrouping === 'task' && store.getTaskRows.length === 0" class="rounded-lg border border-gray-200 bg-white p-6 text-gray-600">
        <div class="font-medium text-gray-900">{{ t('settings.components.settings.TokenUsageStatistics.noTaskUsage') }}</div>
        <div class="mt-1 text-sm">{{ t('settings.components.settings.TokenUsageStatistics.tryWiderRangeOrModel') }}</div>
      </div>

      <div v-else-if="selectedGrouping === 'model' && store.getModelRows.length === 0" class="rounded-lg border border-gray-200 bg-white p-6 text-gray-600">
        <div class="font-medium text-gray-900">{{ t('settings.components.settings.TokenUsageStatistics.noModelUsage') }}</div>
      </div>

      <TokenUsageTaskStatisticsTable
        v-else-if="selectedGrouping === 'task'"
        :rows="store.getTaskRows"
      />
      <TokenUsageModelStatisticsTable
        v-else
        :rows="store.getModelRows"
      />
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
const displayError = computed(() => store.getError?.includes('TOKEN_USAGE_HISTORY_MIGRATION_REQUIRED')
  ? t('settings.components.settings.TokenUsageStatistics.historyMigrationRequired')
  : store.getError);

const fetchStatistics = async (): Promise<void> => {
  if (!startDate.value || !endDate.value) {
    alert(t('settings.components.settings.TokenUsageStatistics.selectDatesAlert'));
    return;
  }
  try {
    await store.fetchStatistics(startDate.value, endDate.value);
  } catch (error) {
    console.error('Error fetching token usage statistics:', error);
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
