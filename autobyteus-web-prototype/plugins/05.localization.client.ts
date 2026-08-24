import { localizationRuntime } from '~/localization/runtime/localizationRuntime';
import type { TranslationKey, TranslationParams } from '~/localization/runtime/types';

export default defineNuxtPlugin(async () => {
  await localizationRuntime.initialize();

  return {
    provide: {
      localization: localizationRuntime,
      t: (key: TranslationKey, params?: TranslationParams) => localizationRuntime.translate(key, params),
    },
  };
});
