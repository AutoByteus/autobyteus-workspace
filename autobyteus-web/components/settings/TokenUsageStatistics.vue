<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden bg-slate-50">
    <div class="border-b border-slate-200 bg-white px-6 pt-4">
      <div class="flex gap-2" role="tablist" :aria-label="t('settings.components.settings.TokenUsageAnalytics.viewLabel')">
        <button
          role="tab"
          :aria-selected="activeView === 'analytics'"
          class="rounded-t-lg px-4 py-2.5 text-sm font-semibold transition"
          :class="activeView === 'analytics' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'"
          @click="activeView = 'analytics'"
        >
          {{ t('settings.components.settings.TokenUsageAnalytics.analytics') }}
        </button>
        <button
          role="tab"
          :aria-selected="activeView === 'runs'"
          class="rounded-t-lg px-4 py-2.5 text-sm font-semibold transition"
          :class="activeView === 'runs' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'"
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
