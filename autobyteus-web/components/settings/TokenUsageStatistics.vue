<template>
  <div class="token-usage-statistics h-full flex flex-col overflow-hidden">
    <div class="flex items-center justify-between px-8 pt-8 pb-4 flex-shrink-0">
      <h2 class="text-xl font-semibold text-gray-900">{{ $t('settings.components.settings.TokenUsageStatistics.token_usage_statistics') }}</h2>
    </div>

    <div class="flex-1 overflow-auto p-8">
      <div class="flex items-center mb-8 bg-gray-50 p-4 rounded-lg border border-gray-100">
        <label for="date-range" class="block text-sm font-medium text-gray-700 mr-4">{{ $t('settings.components.settings.TokenUsageStatistics.select_date_range') }}</label>
        <input 
          type="date" 
          v-model="startDate" 
          class="border border-gray-300 rounded-md p-2 mr-4 text-sm focus:ring-blue-500 focus:border-blue-500"
          :max="endDate"
        >
        <div class="text-gray-400 mr-4">{{ $t('settings.components.settings.TokenUsageStatistics.rangeSeparator') }}</div>
        <input 
          type="date" 
          v-model="endDate" 
          class="border border-gray-300 rounded-md p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          :min="startDate"
        >
        <button 
          @click="fetchStatistics" 
          class="ml-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium transition-colors"
          :disabled="store.isLoading"
        >
          {{ store.isLoading ? $t('settings.components.settings.TokenUsageStatistics.loading') : $t('settings.components.settings.TokenUsageStatistics.fetchStatistics') }}
        </button>
      </div>

      <div v-if="store.isLoading" class="flex justify-center items-center py-20">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>

      <div v-else-if="store.getError" class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
        {{ store.getError }}
      </div>

      <div v-else-if="store.getStatistics.length === 0" class="text-gray-600 p-4">{{ $t('settings.components.settings.TokenUsageStatistics.no_data_available_for_the_selected') }}</div>

      <div v-else>
      <table class="min-w-full bg-white">
        <thead>
          <tr>
            <th class="py-2 px-4 border">{{ $t('settings.components.settings.TokenUsageStatistics.llm_model') }}</th>
            <th class="py-2 px-4 border">{{ $t('settings.components.settings.TokenUsageStatistics.prompt_tokens') }}</th>
            <th class="py-2 px-4 border">{{ $t('settings.components.settings.TokenUsageStatistics.assistant_tokens') }}</th>
            <th class="py-2 px-4 border">{{ $t('settings.components.settings.TokenUsageStatistics.prompt_tokens_cost') }}</th>
            <th class="py-2 px-4 border">{{ $t('settings.components.settings.TokenUsageStatistics.assistant_tokens_cost') }}</th>
            <th class="py-2 px-4 border">{{ $t('settings.components.settings.TokenUsageStatistics.total_cost') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="stat in store.getStatistics" :key="stat.llmModel">
            <td class="py-2 px-4 border">{{ stat.llmModel }}</td>
            <td class="py-2 px-4 border">{{ stat.promptTokens.toLocaleString() }}</td>
            <td class="py-2 px-4 border">{{ stat.assistantTokens.toLocaleString() }}</td>
            <td class="py-2 px-4 border">{{ formatCost(costAggregate(stat.promptCost, stat.currency, stat.apiCostStatus)) }}</td>
            <td class="py-2 px-4 border">{{ formatCost(costAggregate(stat.assistantCost, stat.currency, stat.apiCostStatus)) }}</td>
            <td class="py-2 px-4 border">{{ formatCost(costAggregate(stat.totalCost, stat.currency, stat.apiCostStatus)) }}</td>
          </tr>
          <!-- Total Row -->
          <tr class="font-semibold bg-gray-50">
            <td class="py-2 px-4 border">{{ $t('settings.components.settings.TokenUsageStatistics.total') }}</td>
            <td class="py-2 px-4 border">{{ getTotalPromptTokens().toLocaleString() }}</td>
            <td class="py-2 px-4 border">{{ getTotalAssistantTokens().toLocaleString() }}</td>
            <td class="py-2 px-4 border">{{ formatCost(getTotalPromptCost()) }}</td>
            <td class="py-2 px-4 border">{{ formatCost(getTotalAssistantCost()) }}</td>
            <td class="py-2 px-4 border">{{ formatCost(store.getTotalCost) }}</td>
          </tr>
        </tbody>
      </table>

      <div class="mt-6 h-[400px]">
        <BarChart
          :labels="chartLabels"
          :data="chartData"
          :dataset-label="chartDatasetLabel"
          :x-axis-label="chartXAxisLabel"
          :y-axis-label="chartYAxisLabel"
          :tooltip-labels="chartTooltipLabels"
        />
      </div>
      <p v-if="hasOmittedUnpricedChartCosts" class="mt-2 text-sm text-gray-500">
        {{ $t('shell.tokenUsage.unpricedCostChartNote') }}
      </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import { useTokenUsageStatisticsStore } from '~/stores/tokenUsageStatistics';
import type { TokenUsageCostAggregate } from '~/stores/tokenUsageStatistics';
import BarChart from '~/components/common/BarChart.vue';

const store = useTokenUsageStatisticsStore();
const { t: $t } = useLocalization();
const startDate = ref('');
const endDate = ref('');

const chartLabels = computed(() => store.getStatistics.map(stat => stat.llmModel));
const chartCostAggregates = computed(() => store.getStatistics.map(stat =>
  costAggregate(stat.totalCost, stat.currency, stat.apiCostStatus)
));
const chartData = computed(() => chartCostAggregates.value.map(cost => cost.amount));
const chartTooltipLabels = computed(() => chartCostAggregates.value.map(formatCost));
const hasOmittedUnpricedChartCosts = computed(() => chartCostAggregates.value.some(cost => cost.amount === null));
const chartCurrency = computed(() => {
  const currencies = new Set(
    chartCostAggregates.value
      .filter(cost => cost.amount !== null && cost.currency)
      .map(cost => cost.currency as string),
  );
  return currencies.size === 1 ? [...currencies][0] : null;
});
const chartDatasetLabel = computed(() => $t('settings.components.settings.TokenUsageStatistics.total_cost'));
const chartXAxisLabel = computed(() => $t('settings.components.settings.TokenUsageStatistics.llm_model'));
const chartYAxisLabel = computed(() => chartCurrency.value
  ? `${chartDatasetLabel.value} (${chartCurrency.value})`
  : chartDatasetLabel.value
);

const formatNumber = (value: number): string => {
  return value.toLocaleString('en-US', { 
    minimumFractionDigits: 0,
    maximumFractionDigits: 20  // This will show all decimal places up to 20
  });
};

const costAggregate = (
  amount: number | null,
  currency: string | null,
  status: TokenUsageCostAggregate['status'],
): TokenUsageCostAggregate => ({ amount, currency, status });

const aggregateCosts = (
  values: TokenUsageCostAggregate[],
): TokenUsageCostAggregate => values.reduce<TokenUsageCostAggregate>((aggregate, next, index) => {
  const amount = aggregate.amount === null && next.amount === null
    ? null
    : (aggregate.amount ?? 0) + (next.amount ?? 0);
  const currency = !next.currency
    ? aggregate.currency
    : !aggregate.currency || aggregate.currency === next.currency
      ? next.currency
      : null;
  const status = index === 0 || aggregate.status === next.status ? next.status : 'mixed';
  return { amount, currency, status };
}, { amount: null, currency: null, status: 'price_missing' });

const formatCost = (cost: TokenUsageCostAggregate): string => {
  if (cost.amount === null) return $t('shell.tokenUsage.unpriced');
  const formattedAmount = cost.currency
    ? new Intl.NumberFormat(undefined, { style: 'currency', currency: cost.currency, maximumFractionDigits: 4 }).format(cost.amount)
    : formatNumber(cost.amount);
  if (cost.status === 'partial_price_missing') {
    return `${formattedAmount} ${$t('shell.tokenUsage.partialEstimateSuffix')}`;
  }
  if (cost.status === 'mixed') {
    return `${formattedAmount} ${$t('shell.tokenUsage.mixedEstimateSuffix')}`;
  }
  return `${formattedAmount} ${$t('shell.tokenUsage.headerEstimateSuffix')}`;
};

const getTotalPromptTokens = (): number => {
  return store.getStatistics.reduce((sum, stat) => sum + stat.promptTokens, 0);
};

const getTotalAssistantTokens = (): number => {
  return store.getStatistics.reduce((sum, stat) => sum + stat.assistantTokens, 0);
};

const getTotalPromptCost = (): TokenUsageCostAggregate => {
  return aggregateCosts(
    store.getStatistics.map((stat) => costAggregate(stat.promptCost, stat.currency, stat.apiCostStatus)),
  );
};

const getTotalAssistantCost = (): TokenUsageCostAggregate => {
  return aggregateCosts(
    store.getStatistics.map((stat) => costAggregate(stat.assistantCost, stat.currency, stat.apiCostStatus)),
  );
};

const fetchStatistics = async () => {
  if (!startDate.value || !endDate.value) {
    alert($t('settings.components.settings.TokenUsageStatistics.selectDatesAlert'));
    return;
  }
  try {
    await store.fetchStatistics(startDate.value, endDate.value);
  } catch (error) {
    console.error('Error fetching statistics:', error);
  }
};

onMounted(() => {
  const today = new Date();
  const lastWeek = new Date(today);
  lastWeek.setDate(today.getDate() - 7);

  startDate.value = lastWeek.toISOString().split('T')[0];
  endDate.value = today.toISOString().split('T')[0];
  fetchStatistics();
});
</script>
