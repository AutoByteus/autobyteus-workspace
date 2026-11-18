import { defineStore } from 'pinia';
import { computed, readonly, ref } from 'vue';
import { applyAppFontSizeToDocument, applyPhoneTextSizeToDocument } from '~/display/fontSize/appFontSizeDom';
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
import {
  DEFAULT_PHONE_TEXT_SIZE_STEP,
  phoneTextSizeMetrics,
  readStoredPhoneTextSizeStep,
  writeStoredPhoneTextSizeStep,
  type PhoneTextSizeStep,
} from '~/display/fontSize/phoneTextSizeSteps';

/**
 * Where this page's font metrics come from: the desktop's Display preset, or the phone's Text size step. Plugin
 * `06.appFontSize` chooses it once, by runtime, before the app mounts (autobyteus-525).
 */
type AppFontSizeSource = 'displayPreset' | 'phoneTextSize';

export const useAppFontSizeStore = defineStore('appFontSize', () => {
  const initialized = ref(false);
  const source = ref<AppFontSizeSource>('displayPreset');
  const currentPresetId = ref<AppFontSizePresetId>(DEFAULT_APP_FONT_SIZE_PRESET_ID);
  const phoneTextSizeStep = ref<PhoneTextSizeStep>(DEFAULT_PHONE_TEXT_SIZE_STEP);

  const resolvedMetrics = computed(() => (source.value === 'phoneTextSize'
    ? phoneTextSizeMetrics(phoneTextSizeStep.value)
    : getResolvedAppFontMetrics(currentPresetId.value)));
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

  const applyPhoneTextSize = (step: PhoneTextSizeStep): void => {
    phoneTextSizeStep.value = step;
    applyPhoneTextSizeToDocument(step, phoneTextSizeMetrics(step));
  };

  /** The phone page: the step kept on this phone becomes the source of the app's font metrics. */
  const initializePhoneTextSize = (): void => {
    source.value = 'phoneTextSize';
    initialized.value = true;
    applyPhoneTextSize(readStoredPhoneTextSizeStep());
  };

  /** The phone's Text size choice: applied to every phone screen at once and kept on this phone. */
  const setPhoneTextSize = (step: PhoneTextSizeStep): void => {
    if (source.value !== 'phoneTextSize') {
      throw new Error('[appFontSize] The phone Text size is set only on the phone page, after initializePhoneTextSize().');
    }
    applyPhoneTextSize(step);
    writeStoredPhoneTextSizeStep(step);
  };

  return {
    initialized: readonly(initialized),
    currentPresetId: readonly(currentPresetId),
    phoneTextSizeStep: readonly(phoneTextSizeStep),
    resolvedMetrics,
    presetOptions,
    initialize,
    setPreset,
    resetToDefault,
    initializePhoneTextSize,
    setPhoneTextSize,
  };
});
