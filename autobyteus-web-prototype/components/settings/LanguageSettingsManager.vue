<template>
  <section class="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div class="space-y-2 border-b border-slate-200 pb-4">
      <p class="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">{{ $t('settings.language.eyebrow') }}</p>
      <h2 class="text-3xl font-semibold text-slate-900">{{ $t('settings.language.title') }}</h2>
      <p class="text-sm text-slate-600">{{ $t('settings.language.description') }}</p>
    </div>

    <div class="mt-6 space-y-4">
      <label for="settings-language-mode" class="block text-sm font-medium text-slate-900">
        {{ $t('settings.language.fieldLabel') }}
      </label>

      <select
        id="settings-language-mode"
        v-model="selectedMode"
        class="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        data-testid="settings-language-select"
      >
        <option v-for="option in localeOptions" :key="option.value" :value="option.value">
          {{ $t(option.labelKey) }}
        </option>
      </select>

      <div class="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600 sm:grid-cols-2">
        <div>
          <div class="font-medium text-slate-900">{{ $t('settings.language.currentModeLabel') }}</div>
          <div data-testid="settings-language-current-mode">{{ currentModeLabel }}</div>
        </div>
        <div>
          <div class="font-medium text-slate-900">{{ $t('settings.language.activeLocaleLabel') }}</div>
          <div data-testid="settings-language-active-locale">{{ activeLocaleLabel }}</div>
        </div>
      </div>

      <p class="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
        {{ $t('settings.language.help') }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { LocalePreferenceMode, LocalizedOption } from '~/localization/runtime/types';

const { preferenceMode, resolvedLocale, setPreference, t } = useLocalization();

const localeOptions: LocalizedOption<LocalePreferenceMode>[] = [
  { labelKey: 'settings.language.options.system', value: 'system' },
  { labelKey: 'settings.language.options.en', value: 'en' },
  { labelKey: 'settings.language.options.zhCN', value: 'zh-CN' },
];

const selectedMode = computed({
  get: () => preferenceMode.value,
  set: (nextMode: LocalePreferenceMode) => {
    void setPreference(nextMode);
  },
});

const currentModeLabel = computed(() => {
  const key = localeOptions.find((option) => option.value === preferenceMode.value)?.labelKey ?? 'settings.language.options.system';
  return t(key);
});

const activeLocaleLabel = computed(() =>
  resolvedLocale.value === 'zh-CN' ? t('settings.language.options.zhCN') : t('settings.language.options.en'),
);
</script>
