import { defineStore } from 'pinia';
import { computed, readonly, ref } from 'vue';
import { applyAppFontSizeToDocument } from '~/display/fontSize/appFontSizeDom';
import {
  DEFAULT_APP_FONT_SIZE_PRESET_ID,
  getAppFontSizePresetOptions,
  getResolvedAppFontMetrics,
  isAppFontSizePresetId,
  type AppFontSizePresetId,
} from '~/display/fontSize/appFontSizePresets';
import {
  readStoredAppFontSizePresetId,
  writeStoredAppFontSizePresetId,
} from '~/display/fontSize/appFontSizePreferenceStorage';

export const useAppFontSizeStore = defineStore('appFontSize', () => {
  const initialized = ref(false);
  const currentPresetId = ref<AppFontSizePresetId>(DEFAULT_APP_FONT_SIZE_PRESET_ID);

  const resolvedMetrics = computed(() => getResolvedAppFontMetrics(currentPresetId.value));
  const presetOptions = computed(() => getAppFontSizePresetOptions());

  const applyPreset = (presetId: AppFontSizePresetId, persist: boolean): void => {
    currentPresetId.value = presetId;
    const nextMetrics = getResolvedAppFontMetrics(presetId);
    applyAppFontSizeToDocument(presetId, nextMetrics);

    if (persist) {
      writeStoredAppFontSizePresetId(presetId);
    }
  };

  const initialize = (): void => {
    if (initialized.value) {
      applyAppFontSizeToDocument(currentPresetId.value, resolvedMetrics.value);
      return;
    }

    initialized.value = true;
    const storedPresetId = readStoredAppFontSizePresetId();
    applyPreset(storedPresetId ?? DEFAULT_APP_FONT_SIZE_PRESET_ID, false);
  };

  const setPreset = (presetId: string): void => {
    if (!isAppFontSizePresetId(presetId)) {
      return;
    }

    if (!initialized.value) {
      initialized.value = true;
    }

    applyPreset(presetId, true);
  };

  const resetToDefault = (): void => {
    if (!initialized.value) {
      initialized.value = true;
    }

    applyPreset(DEFAULT_APP_FONT_SIZE_PRESET_ID, true);
  };

  return {
    initialized: readonly(initialized),
    currentPresetId: readonly(currentPresetId),
    resolvedMetrics,
    presetOptions,
    initialize,
    setPreset,
    resetToDefault,
  };
});
