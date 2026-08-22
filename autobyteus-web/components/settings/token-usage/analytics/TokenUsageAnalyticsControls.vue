<template>
  <section class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm" :aria-label="t('settings.components.settings.TokenUsageAnalytics.controls')">
    <div class="flex flex-wrap items-center gap-2">
      <button
        v-for="preset in presets"
        :key="preset.value"
        type="button"
        class="rounded-full px-3 py-1.5 text-sm font-medium transition"
        :class="store.selection.rangePreset === preset.value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'"
        @click="selectPreset(preset.value)"
      >{{ preset.label }}</button>
      <span class="ml-auto rounded-full bg-slate-900 px-2.5 py-1 text-xs font-bold tracking-wide text-white">UTC</span>
    </div>

    <div v-if="store.selection.rangePreset === 'CUSTOM'" class="mt-3 flex flex-wrap items-end gap-3">
      <label class="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {{ t('settings.components.settings.TokenUsageAnalytics.startDate') }}
        <input v-model="store.selection.startDate" type="date" :max="store.selection.endDate" class="mt-1 block rounded-lg border-slate-300 text-sm">
      </label>
      <label class="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {{ t('settings.components.settings.TokenUsageAnalytics.endDate') }}
        <input v-model="store.selection.endDate" type="date" :min="store.selection.startDate" class="mt-1 block rounded-lg border-slate-300 text-sm">
      </label>
      <button type="button" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" :disabled="Boolean(validationError)" @click="apply">
        {{ t('settings.components.settings.TokenUsageAnalytics.apply') }}
      </button>
      <p v-if="validationError" class="w-full text-sm text-rose-700" role="alert">{{ validationError }}</p>
    </div>

    <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label class="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {{ t('settings.components.settings.TokenUsageAnalytics.runtime') }}
        <select v-model="store.selection.runtimeKind" class="mt-1 block w-full rounded-lg border-slate-300 bg-white text-sm" @change="apply">
          <option :value="null">{{ t('settings.components.settings.TokenUsageAnalytics.all') }}</option>
          <option v-for="runtime in store.filterOptions.runtimeKinds" :key="runtime" :value="runtime">{{ formatRuntime(runtime) }}</option>
        </select>
      </label>
      <label class="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {{ t('settings.components.settings.TokenUsageAnalytics.provider') }}
        <select v-model="store.selection.providerKey" class="mt-1 block w-full rounded-lg border-slate-300 bg-white text-sm" @change="apply">
          <option :value="null">{{ t('settings.components.settings.TokenUsageAnalytics.all') }}</option>
          <option v-for="provider in store.filterOptions.providers" :key="provider.key" :value="provider.key">{{ provider.displayName }}</option>
        </select>
      </label>
      <label class="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {{ t('settings.components.settings.TokenUsageAnalytics.model') }}
        <select v-model="store.selection.modelKey" class="mt-1 block w-full rounded-lg border-slate-300 bg-white text-sm" @change="apply">
          <option :value="null">{{ t('settings.components.settings.TokenUsageAnalytics.all') }}</option>
          <option v-for="model in store.filterOptions.models" :key="model.key" :value="model.key">{{ model.displayName }}</option>
        </select>
      </label>
      <div>
        <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ t('settings.components.settings.TokenUsageAnalytics.metric') }}</span>
        <div class="mt-1 flex rounded-lg bg-slate-100 p-1" role="radiogroup">
          <button v-for="option in metrics" :key="option.value" type="button" role="radio" :aria-checked="metric === option.value" class="flex-1 rounded-md px-2 py-1.5 text-sm font-semibold" :class="metric === option.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'" @click="$emit('update:metric', option.value)">
            {{ option.label }}
          </button>
        </div>
      </div>
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
      <p class="text-sm text-slate-600">{{ activeSummary }}</p>
      <button v-if="hasFilters" type="button" class="text-sm font-semibold text-blue-700 hover:underline" @click="clearFilters">{{ t('settings.components.settings.TokenUsageAnalytics.clearFilters') }}</button>
      <button type="button" class="ml-auto rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50" :disabled="!store.result || store.loading" @click="$emit('export')">
        {{ t('settings.components.settings.TokenUsageAnalytics.exportCsv') }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import { useTokenUsageAnalyticsStore } from '~/stores/tokenUsageAnalytics';
import type { TokenUsageAnalyticsMetric, TokenUsageAnalyticsRangePreset } from '~/types/tokenUsageAnalytics';

const props = defineProps<{ metric: TokenUsageAnalyticsMetric }>();
defineEmits<{ 'update:metric': [value: TokenUsageAnalyticsMetric]; export: [] }>();
const { t } = useLocalization();
const store = useTokenUsageAnalyticsStore();
const presets: Array<{ value: TokenUsageAnalyticsRangePreset; label: string }> = [
  { value: 'THIS_MONTH', label: t('settings.components.settings.TokenUsageAnalytics.thisMonth') },
  { value: 'LAST_MONTH', label: t('settings.components.settings.TokenUsageAnalytics.lastMonth') },
  { value: 'LAST_3_MONTHS', label: t('settings.components.settings.TokenUsageAnalytics.last3Months') },
  { value: 'LAST_12_MONTHS', label: t('settings.components.settings.TokenUsageAnalytics.last12Months') },
  { value: 'CUSTOM', label: t('settings.components.settings.TokenUsageAnalytics.custom') },
];
const metrics: Array<{ value: TokenUsageAnalyticsMetric; label: string }> = [
  { value: 'TOKENS', label: t('settings.components.settings.TokenUsageAnalytics.tokens') },
  { value: 'COST', label: t('settings.components.settings.TokenUsageAnalytics.estimatedCost') },
];
const validationError = computed(() => {
  if (!store.selection.startDate || !store.selection.endDate) return t('settings.components.settings.TokenUsageAnalytics.chooseBothDates');
  if (store.selection.startDate > store.selection.endDate) return t('settings.components.settings.TokenUsageAnalytics.invalidDateOrder');
  return null;
});
const hasFilters = computed(() => Boolean(store.selection.runtimeKind || store.selection.providerKey || store.selection.modelKey));
const activeSummary = computed(() => hasFilters.value
  ? t('settings.components.settings.TokenUsageAnalytics.filtersActive')
  : t('settings.components.settings.TokenUsageAnalytics.allUsage'));
const runtimeLabels: Record<string, string> = { autobyteus: 'Autobyteus', codex_app_server: 'Codex', claude_agent_sdk: 'Claude SDK' };
const formatRuntime = (value: string) => runtimeLabels[value] ?? value;
const apply = () => { if (!validationError.value) void store.fetch().catch(() => undefined); };
const selectPreset = (preset: TokenUsageAnalyticsRangePreset) => {
  store.setPreset(preset);
  if (preset !== 'CUSTOM') apply();
};
const clearFilters = () => { store.clearFilters(); apply(); };
</script>
