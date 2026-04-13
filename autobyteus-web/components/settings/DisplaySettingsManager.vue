<template>
  <section
    class="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    data-testid="settings-display-panel"
  >
    <div class="space-y-2 border-b border-slate-200 pb-4">
      <p class="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">{{ t('settings.display.eyebrow') }}</p>
      <h2 class="text-3xl font-semibold text-slate-900">{{ t('settings.display.title') }}</h2>
      <p class="text-sm text-slate-600">{{ t('settings.display.description') }}</p>
    </div>

    <div class="mt-6 space-y-4">
      <div>
        <div class="mb-3 block text-sm font-medium text-slate-900">
          {{ t('settings.display.fontSize.fieldLabel') }}
        </div>

        <div class="grid gap-3">
          <label
            v-for="option in presetOptions"
            :key="option.id"
            class="cursor-pointer rounded-xl border p-4 transition"
            :class="selectedPresetId === option.id
              ? 'border-blue-500 bg-blue-50 shadow-sm'
              : 'border-slate-200 bg-white hover:border-slate-300'"
            :data-testid="`settings-display-font-size-option-${option.id}`"
          >
            <input
              v-model="selectedPresetId"
              class="sr-only"
              type="radio"
              name="settings-display-font-size"
              :value="option.id"
              :data-testid="`settings-display-font-size-input-${option.id}`"
            >
            <div class="flex items-center justify-between gap-4">
              <div class="min-w-0">
                <div class="font-medium text-slate-900">{{ t(option.labelKey) }}</div>
                <p class="mt-1 text-sm text-slate-600">{{ t(option.summaryKey) }}</p>
              </div>
              <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                {{ option.rootPercent }}%
              </span>
            </div>
          </label>
        </div>
      </div>

      <div class="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600 sm:grid-cols-2">
        <div>
          <div class="font-medium text-slate-900">{{ t('settings.display.fontSize.currentPresetLabel') }}</div>
          <div data-testid="settings-display-font-size-current">{{ currentPresetLabel }}</div>
        </div>
        <div>
          <div class="font-medium text-slate-900">{{ t('settings.display.fontSize.appliedMetricsLabel') }}</div>
          <div data-testid="settings-display-font-size-applied-metrics">{{ appliedMetricsLabel }}</div>
        </div>
      </div>

      <p class="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        {{ t('settings.display.fontSize.help') }}
      </p>

      <div class="flex justify-end">
        <button
          type="button"
          class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="settings-display-font-size-reset"
          :disabled="!canReset"
          @click="appFontSizeStore.resetToDefault()"
        >
          {{ t('settings.display.fontSize.reset') }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useLocalization } from '~/composables/useLocalization';
import { useAppFontSizeStore } from '~/stores/appFontSizeStore';

const { t } = useLocalization();
const appFontSizeStore = useAppFontSizeStore();
const { currentPresetId, presetOptions, resolvedMetrics } = storeToRefs(appFontSizeStore);

const selectedPresetId = computed({
  get: () => currentPresetId.value,
  set: (nextPresetId: string) => {
    appFontSizeStore.setPreset(nextPresetId);
  },
});

const currentPresetLabel = computed(() => {
  const currentOption = presetOptions.value.find((option) => option.id === currentPresetId.value);
  return t(currentOption?.labelKey ?? 'settings.display.fontSize.options.default.label');
});

const appliedMetricsLabel = computed(() =>
  t('settings.display.fontSize.appliedMetrics', {
    percent: resolvedMetrics.value.rootPercent,
    editorPx: resolvedMetrics.value.editorFontPx,
    terminalPx: resolvedMetrics.value.terminalFontPx,
  }),
);

const canReset = computed(() => currentPresetId.value !== 'default');
</script>
