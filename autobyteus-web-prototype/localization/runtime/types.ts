export const SUPPORTED_LOCALES = ['en', 'zh-CN'] as const;

export const LOCALE_PREFERENCE_MODES = ['system', ...SUPPORTED_LOCALES] as const;

export const LOCALIZATION_BOOTSTRAP_STATES = ['booting', 'ready', 'failed'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export type LocalePreferenceMode = (typeof LOCALE_PREFERENCE_MODES)[number];
export type LocalizationBootstrapState = (typeof LOCALIZATION_BOOTSTRAP_STATES)[number];
export type TranslationCatalog = Record<string, string>;
export type TranslationParams = Record<string, string | number>;
export type TranslationKey = string;

export type LocalizedOption<T extends string = string> = {
  labelKey: TranslationKey;
  value: T;
};

export type PublicLocalizationState = {
  bootstrapState: Readonly<import('vue').Ref<LocalizationBootstrapState>>;
  preferenceMode: Readonly<import('vue').Ref<LocalePreferenceMode>>;
  resolvedLocale: Readonly<import('vue').Ref<SupportedLocale>>;
};
