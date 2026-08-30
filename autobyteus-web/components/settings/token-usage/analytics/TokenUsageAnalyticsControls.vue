<template>
  <section class="relative" :aria-label="t('settings.components.settings.TokenUsageAnalytics.controls')">
    <div class="flex min-h-11 flex-wrap items-center gap-2">
      <div class="relative">
        <button
          ref="rangeButton"
          type="button"
          class="inline-flex min-h-10 min-w-36 items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white px-3 text-left text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          :aria-expanded="rangeOpen"
          aria-haspopup="menu"
          @click="toggleRange"
          @keydown.esc="closeRange"
        >
          <span class="grid gap-0.5">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ t('settings.components.settings.TokenUsageAnalytics.utcRange') }}</span>
            <span>{{ activePresetLabel }}</span>
          </span>
          <svg aria-hidden="true" class="h-4 w-4 text-slate-500" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.51a.75.75 0 0 1-1.08 0l-4.25-4.51a.75.75 0 0 1 .02-1.06Z" clip-rule="evenodd" /></svg>
        </button>
        <div
          v-if="rangeOpen"
          class="absolute left-0 top-12 z-20 w-60 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
          role="menu"
          @keydown.esc="closeRange"
        >
          <button
            v-for="preset in presets"
            :key="preset.value"
            type="button"
            role="menuitem"
            class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            :class="store.selection.rangePreset === preset.value ? 'bg-blue-50 font-semibold text-blue-700' : ''"
            @click="selectPreset(preset.value)"
          >
            {{ preset.label }}
            <svg v-if="store.selection.rangePreset === preset.value" aria-hidden="true" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.704 5.292a1 1 0 0 1 .004 1.416l-7.2 7.242a1 1 0 0 1-1.42 0l-3.8-3.821a1 1 0 1 1 1.418-1.41l3.091 3.11 6.49-6.533a1 1 0 0 1 1.417-.004Z" clip-rule="evenodd" /></svg>
          </button>
          <p class="mx-2 mt-1 border-t border-slate-100 px-1 pb-1 pt-2 text-xs leading-5 text-slate-500">
            {{ t('settings.components.settings.TokenUsageAnalytics.utcRangeHelp') }}
          </p>
        </div>
      </div>

      <button
        ref="filterButton"
        type="button"
        class="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        :class="activeFilterCount ? 'border-blue-300 bg-blue-50 text-blue-700' : ''"
        :aria-expanded="filtersOpen"
        aria-controls="token-usage-filter-panel"
        @click="toggleFilters"
      >
        <svg aria-hidden="true" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" d="M4 6h16M7 12h10m-7 6h4" /></svg>
        {{ t('settings.components.settings.TokenUsageAnalytics.filters') }}
        <span v-if="activeFilterCount" class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">{{ activeFilterCount }}</span>
      </button>

      <div class="flex rounded-lg bg-slate-200/70 p-1" role="radiogroup" :aria-label="t('settings.components.settings.TokenUsageAnalytics.metric')">
        <button
          v-for="option in metrics"
          :key="option.value"
          type="button"
          role="radio"
          :aria-checked="metric === option.value"
          class="rounded-md px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          :class="metric === option.value ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'"
          @click="$emit('update:metric', option.value)"
        >
          {{ option.label }}
        </button>
      </div>

      <div class="min-w-0 text-sm text-slate-500 sm:ml-1">
        <span class="block max-w-80 truncate">{{ activeSummary }}</span>
      </div>
      <button
        v-if="activeFilterCount"
        type="button"
        class="text-sm font-semibold text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        @click="clearFilters"
      >
        {{ t('settings.components.settings.TokenUsageAnalytics.clearFilters') }}
      </button>
    </div>

    <div v-if="store.selection.rangePreset === 'CUSTOM'" class="mt-3 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <label class="grid gap-1 text-xs font-bold uppercase tracking-wider text-slate-500">
        {{ t('settings.components.settings.TokenUsageAnalytics.startDate') }}
        <input v-model="store.selection.startDate" type="date" :max="store.selection.endDate" class="rounded-lg border-slate-300 text-sm font-medium normal-case tracking-normal text-slate-800 focus:border-blue-500 focus:ring-blue-500">
      </label>
      <label class="grid gap-1 text-xs font-bold uppercase tracking-wider text-slate-500">
        {{ t('settings.components.settings.TokenUsageAnalytics.endDate') }}
        <input v-model="store.selection.endDate" type="date" :min="store.selection.startDate" class="rounded-lg border-slate-300 text-sm font-medium normal-case tracking-normal text-slate-800 focus:border-blue-500 focus:ring-blue-500">
      </label>
      <button type="button" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" :disabled="Boolean(validationError)" @click="apply">
        {{ t('settings.components.settings.TokenUsageAnalytics.apply') }}
      </button>
      <p v-if="validationError" class="w-full text-sm text-rose-700" role="alert">{{ validationError }}</p>
    </div>

    <section
      v-if="filtersOpen"
      id="token-usage-filter-panel"
      class="mt-3 rounded-xl border border-slate-300 bg-white p-4 shadow-lg shadow-blue-950/5"
      :aria-label="t('settings.components.settings.TokenUsageAnalytics.filters')"
      @keydown.esc="closeFilters"
    >
      <div class="flex items-start justify-between gap-4">
        <div>
          <h3 class="text-sm font-bold text-slate-950">{{ t('settings.components.settings.TokenUsageAnalytics.filterCurrentResult') }}</h3>
          <p class="mt-0.5 text-xs text-slate-500">{{ t('settings.components.settings.TokenUsageAnalytics.selectionRefetch') }}</p>
        </div>
        <button type="button" class="rounded text-xs font-semibold text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" @click="clearFilterDraft">
          {{ t('settings.components.settings.TokenUsageAnalytics.clearAll') }}
        </button>
      </div>
      <div class="mt-4 grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,1fr))_auto]">
        <label class="grid gap-1 text-xs font-bold uppercase tracking-wider text-slate-500">
          {{ t('settings.components.settings.TokenUsageAnalytics.runtime') }}
          <select v-model="filterDraft.runtimeKind" class="rounded-lg border-slate-300 bg-white text-sm font-medium normal-case tracking-normal text-slate-800 focus:border-blue-500 focus:ring-blue-500">
            <option :value="null">{{ t('settings.components.settings.TokenUsageAnalytics.allRuntimes') }}</option>
            <option v-for="runtime in store.filterOptions.runtimeKinds" :key="runtime" :value="runtime">{{ formatRuntime(runtime) }}</option>
          </select>
        </label>
        <label class="grid gap-1 text-xs font-bold uppercase tracking-wider text-slate-500">
          {{ t('settings.components.settings.TokenUsageAnalytics.provider') }}
          <select v-model="filterDraft.providerKey" class="rounded-lg border-slate-300 bg-white text-sm font-medium normal-case tracking-normal text-slate-800 focus:border-blue-500 focus:ring-blue-500">
            <option :value="null">{{ t('settings.components.settings.TokenUsageAnalytics.allProviders') }}</option>
            <option v-for="provider in store.filterOptions.providers" :key="provider.key" :value="provider.key">{{ provider.displayName }}</option>
          </select>
        </label>
        <label class="grid gap-1 text-xs font-bold uppercase tracking-wider text-slate-500">
          {{ t('settings.components.settings.TokenUsageAnalytics.model') }}
          <select v-model="filterDraft.modelKey" class="rounded-lg border-slate-300 bg-white text-sm font-medium normal-case tracking-normal text-slate-800 focus:border-blue-500 focus:ring-blue-500">
            <option :value="null">{{ t('settings.components.settings.TokenUsageAnalytics.allModels') }}</option>
            <option v-for="model in store.filterOptions.models" :key="model.key" :value="model.key">{{ model.displayName }}</option>
          </select>
        </label>
        <button type="button" class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2" @click="applyFilters">
          {{ t('settings.components.settings.TokenUsageAnalytics.applyFilters') }}
        </button>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import { useTokenUsageAnalyticsStore } from '~/stores/tokenUsageAnalytics';
import type { TokenUsageAnalyticsMetric, TokenUsageAnalyticsRangePreset } from '~/types/tokenUsageAnalytics';

defineProps<{ metric: TokenUsageAnalyticsMetric }>();
defineEmits<{ 'update:metric': [value: TokenUsageAnalyticsMetric] }>();
const { t } = useLocalization();
const store = useTokenUsageAnalyticsStore();
const rangeOpen = ref(false);
const filtersOpen = ref(false);
const rangeButton = ref<HTMLButtonElement | null>(null);
const filterButton = ref<HTMLButtonElement | null>(null);
const filterDraft = reactive({ runtimeKind: null as string | null, providerKey: null as string | null, modelKey: null as string | null });
const presets = computed<Array<{ value: TokenUsageAnalyticsRangePreset; label: string }>>(() => [
  { value: 'THIS_MONTH', label: t('settings.components.settings.TokenUsageAnalytics.thisMonth') },
  { value: 'LAST_MONTH', label: t('settings.components.settings.TokenUsageAnalytics.lastMonth') },
  { value: 'LAST_3_MONTHS', label: t('settings.components.settings.TokenUsageAnalytics.last3Months') },
  { value: 'LAST_12_MONTHS', label: t('settings.components.settings.TokenUsageAnalytics.last12Months') },
  { value: 'CUSTOM', label: t('settings.components.settings.TokenUsageAnalytics.custom') },
]);
const metrics = computed<Array<{ value: TokenUsageAnalyticsMetric; label: string }>>(() => [
  { value: 'TOKENS', label: t('settings.components.settings.TokenUsageAnalytics.tokens') },
  { value: 'COST', label: t('settings.components.settings.TokenUsageAnalytics.cost') },
]);
const activePresetLabel = computed(() => presets.value.find((preset) => preset.value === store.selection.rangePreset)?.label ?? 'UTC');
const validationError = computed(() => {
  if (!store.selection.startDate || !store.selection.endDate) return t('settings.components.settings.TokenUsageAnalytics.chooseBothDates');
  if (store.selection.startDate > store.selection.endDate) return t('settings.components.settings.TokenUsageAnalytics.invalidDateOrder');
  return null;
});
const activeFilters = computed(() => store.result?.appliedFilters ?? store.selection);
const activeFilterCount = computed(() => [activeFilters.value.runtimeKind, activeFilters.value.providerKey, activeFilters.value.modelKey].filter(Boolean).length);
const activeSummary = computed(() => {
  const labels = [
    activeFilters.value.runtimeKind ? formatRuntime(activeFilters.value.runtimeKind) : null,
    activeFilters.value.providerKey
      ? store.filterOptions.providers.find((item) => item.key === activeFilters.value.providerKey)?.displayName ?? activeFilters.value.providerKey
      : null,
    activeFilters.value.modelKey
      ? store.filterOptions.models.find((item) => item.key === activeFilters.value.modelKey)?.displayName ?? activeFilters.value.modelKey
      : null,
  ].filter(Boolean);
  return labels.length ? labels.join(' · ') : t('settings.components.settings.TokenUsageAnalytics.allUsage');
});
const runtimeLabels: Record<string, string> = { autobyteus: 'Autobyteus', codex_app_server: 'Codex', claude_agent_sdk: 'Claude SDK' };
const formatRuntime = (value: string) => runtimeLabels[value] ?? value;
const apply = () => { if (!validationError.value) void store.fetch().catch(() => undefined); };
const selectPreset = (preset: TokenUsageAnalyticsRangePreset) => {
  store.setPreset(preset);
  closeRange();
  if (preset !== 'CUSTOM') apply();
};
const closeRange = () => {
  rangeOpen.value = false;
  void nextTick(() => rangeButton.value?.focus());
};
const toggleRange = () => {
  if (rangeOpen.value) {
    closeRange();
    return;
  }
  filtersOpen.value = false;
  rangeOpen.value = true;
};
const closeFilters = () => {
  filtersOpen.value = false;
  void nextTick(() => filterButton.value?.focus());
};
const syncFilterDraft = () => {
  const source = store.result?.appliedFilters ?? store.selection;
  filterDraft.runtimeKind = source.runtimeKind ?? null;
  filterDraft.providerKey = source.providerKey ?? null;
  filterDraft.modelKey = source.modelKey ?? null;
};
const toggleFilters = () => {
  if (filtersOpen.value) {
    closeFilters();
    return;
  }
  rangeOpen.value = false;
  syncFilterDraft();
  filtersOpen.value = true;
};
const clearFilterDraft = () => {
  filterDraft.runtimeKind = null;
  filterDraft.providerKey = null;
  filterDraft.modelKey = null;
};
const clearFilters = () => {
  store.clearFilters();
  clearFilterDraft();
  apply();
};
const applyFilters = () => {
  store.selection.runtimeKind = filterDraft.runtimeKind;
  store.selection.providerKey = filterDraft.providerKey;
  store.selection.modelKey = filterDraft.modelKey;
  apply();
  closeFilters();
};
</script>
