import type { localizationRuntime } from '~/localization/runtime/localizationRuntime';
import type { TranslationKey, TranslationParams } from '~/localization/runtime/types';

declare module '#app' {
  interface NuxtApp {
    $localization: typeof localizationRuntime;
    $t: (key: TranslationKey, params?: TranslationParams) => string;
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $localization: typeof localizationRuntime;
    $t: (key: TranslationKey, params?: TranslationParams) => string;
  }
}

export {};
