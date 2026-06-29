<template>
  <div class="token-usage-statistics h-full flex flex-col overflow-hidden">
    <div class="flex items-center justify-between px-8 pt-8 pb-4 flex-shrink-0">
      <h2 class="text-xl font-semibold text-gray-900">{{ $t('settings.components.settings.TokenUsageStatistics.token_usage_statistics') }}</h2>
    </div>

    <div class="flex-1 overflow-auto p-8">
      <div class="mb-6 rounded-lg border border-gray-100 bg-gray-50 p-4">
        <div class="flex flex-wrap items-center gap-4">
          <label for="token-usage-start-date" class="block text-sm font-medium text-gray-700">
            {{ $t('settings.components.settings.TokenUsageStatistics.select_date_range') }}
          </label>
          <input
            id="token-usage-start-date"
            v-model="startDate"
            type="date"
            class="rounded-md border border-gray-300 p-2 text-sm focus:border-blue-500 focus:ring-blue-500"
            :max="endDate"
          >
          <div class="text-gray-400">{{ $t('settings.components.settings.TokenUsageStatistics.rangeSeparator') }}</div>
          <input
            v-model="endDate"
            type="date"
            class="rounded-md border border-gray-300 p-2 text-sm focus:border-blue-500 focus:ring-blue-500"
            :min="startDate"
          >
          <div class="rounded-md bg-white px-3 py-2 text-sm text-gray-600 ring-1 ring-gray-200">
            <span class="font-medium text-gray-800">{{ $t('settings.components.settings.TokenUsageStatistics.usageDuringPeriod') }}</span>
            <span class="ml-2">{{ $t('settings.components.settings.TokenUsageStatistics.usageDuringPeriodHelp') }}</span>
          </div>
          <button
            class="ml-auto rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="store.isLoading"
            @click="fetchStatistics"
          >
            {{ store.isLoading ? $t('settings.components.settings.TokenUsageStatistics.loadingStatistics') : $t('settings.components.settings.TokenUsageStatistics.fetchStatistics') }}
          </button>
        </div>
      </div>

      <div class="mb-6 flex border-b border-gray-200">
        <button
          type="button"
          class="border-b-2 px-4 py-2 text-sm font-medium"
          :class="activeTab === 'task' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'"
          @click="activeTab = 'task'"
        >
          {{ $t('settings.components.settings.TokenUsageStatistics.byTask') }}
        </button>
        <button
          type="button"
          class="border-b-2 px-4 py-2 text-sm font-medium"
          :class="activeTab === 'model' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'"
          @click="activeTab = 'model'"
        >
          {{ $t('settings.components.settings.TokenUsageStatistics.byModel') }}
        </button>
      </div>

      <div v-if="store.isLoading" class="flex flex-col items-center justify-center gap-3 py-20 text-gray-600">
        <div class="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
        <div>{{ $t('settings.components.settings.TokenUsageStatistics.loadingStatisticsLong') }}</div>
      </div>

      <div v-else-if="store.getError" class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        {{ store.getError }}
      </div>

      <div v-else-if="activeTab === 'task' && store.getTaskRows.length === 0" class="rounded-lg border border-gray-200 bg-white p-6 text-gray-600">
        <div class="font-medium text-gray-900">{{ $t('settings.components.settings.TokenUsageStatistics.noTaskUsage') }}</div>
        <div class="mt-1 text-sm">{{ $t('settings.components.settings.TokenUsageStatistics.tryWiderRangeOrByModel') }}</div>
      </div>

      <div v-else-if="activeTab === 'model' && store.getModelRows.length === 0" class="rounded-lg border border-gray-200 bg-white p-6 text-gray-600">
        <div class="font-medium text-gray-900">{{ $t('settings.components.settings.TokenUsageStatistics.noModelUsage') }}</div>
      </div>

      <TokenUsageTaskStatisticsTable
        v-else-if="activeTab === 'task'"
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
import { onMounted, ref } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import { useTokenUsageStatisticsStore } from '~/stores/tokenUsageStatistics';
import TokenUsageModelStatisticsTable from './token-usage/TokenUsageModelStatisticsTable.vue';
import TokenUsageTaskStatisticsTable from './token-usage/TokenUsageTaskStatisticsTable.vue';

const store = useTokenUsageStatisticsStore();
const { t: $t } = useLocalization();
const startDate = ref('');
const endDate = ref('');
const activeTab = ref<'task' | 'model'>('task');

const fetchStatistics = async (): Promise<void> => {
  if (!startDate.value || !endDate.value) {
    alert($t('settings.components.settings.TokenUsageStatistics.selectDatesAlert'));
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
