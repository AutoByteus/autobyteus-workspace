<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden bg-slate-50">
    <div class="border-b border-slate-100 bg-white px-6 pt-4">
      <div class="flex gap-7" role="tablist" :aria-label="t('settings.components.settings.TokenUsageAnalytics.viewLabel')">
        <button
          type="button"
          role="tab"
          :aria-selected="activeView === 'analytics'"
          class="border-b-2 bg-transparent px-0.5 pb-[11px] pt-[3px] text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          :class="activeView === 'analytics' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-600 hover:text-slate-900'"
          @click="activeView = 'analytics'"
        >
          {{ t('settings.components.settings.TokenUsageAnalytics.analytics') }}
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="activeView === 'runs'"
          class="border-b-2 bg-transparent px-0.5 pb-[11px] pt-[3px] text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          :class="activeView === 'runs' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-600 hover:text-slate-900'"
          @click="activeView = 'runs'"
        >
          {{ t('settings.components.settings.TokenUsageAnalytics.runDetails') }}
        </button>
      </div>
    </div>
    <TokenUsageAnalyticsView v-if="activeView === 'analytics'" />
    <TokenUsageRunDetailsView v-else />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import TokenUsageAnalyticsView from './token-usage/analytics/TokenUsageAnalyticsView.vue';
import TokenUsageRunDetailsView from './token-usage/TokenUsageRunDetailsView.vue';

const { t } = useLocalization();
const activeView = ref<'analytics' | 'runs'>('analytics');
</script>
