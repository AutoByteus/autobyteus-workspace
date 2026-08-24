import { localizationRuntime } from '~/localization/runtime/localizationRuntime';
import type { LocalePreferenceMode, TranslationKey, TranslationParams } from '~/localization/runtime/types';

export function useLocalization() {
  const t = (key: TranslationKey, params?: TranslationParams): string =>
    localizationRuntime.translate(key, params);

  const setPreference = async (mode: LocalePreferenceMode): Promise<void> => {
    await localizationRuntime.setPreference(mode);
  };

  return {
    t,
    setPreference,
    bootstrapState: localizationRuntime.bootstrapState,
    preferenceMode: localizationRuntime.preferenceMode,
    resolvedLocale: localizationRuntime.resolvedLocale,
    isReadyForProductUi: localizationRuntime.isReadyForProductUi,
  };
}
