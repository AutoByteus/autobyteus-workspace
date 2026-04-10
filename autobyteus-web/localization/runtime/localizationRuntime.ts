import { computed, readonly, shallowRef, ref } from 'vue';
import { getCatalog } from './catalogRegistry';
import { mergeCatalogs } from './catalogMerge';
import { readStoredLocalePreference, writeStoredLocalePreference } from './preferenceStorage';
import { resolveSystemLocale } from './systemLocaleResolver';
import type {
  LocalePreferenceMode,
  LocalizationBootstrapState,
  SupportedLocale,
  TranslationCatalog,
  TranslationKey,
  TranslationParams,
} from './types';

function interpolateMessage(template: string, params?: TranslationParams): string {
  if (!params) {
    return template;
  }

  return Object.entries(params).reduce((message, [key, value]) => {
    const replacement = String(value);
    return message
      .replaceAll(`{{${key}}}`, replacement)
      .replaceAll(`{${key}}`, replacement);
  }, template);
}

function resolveMessage(catalog: TranslationCatalog, key: TranslationKey): string | null {
  return catalog[key] ?? null;
}

class LocalizationRuntime {
  private readonly bootstrapStateRef = ref<LocalizationBootstrapState>('booting');
  private readonly preferenceModeRef = ref<LocalePreferenceMode>('system');
  private readonly resolvedLocaleRef = ref<SupportedLocale>('en');
  private readonly activeCatalogRef = shallowRef<TranslationCatalog>(getCatalog('en'));
  private initializePromise: Promise<void> | null = null;
  private hasInitialized = false;

  readonly bootstrapState = readonly(this.bootstrapStateRef);
  readonly preferenceMode = readonly(this.preferenceModeRef);
  readonly resolvedLocale = readonly(this.resolvedLocaleRef);
  readonly isReadyForProductUi = computed(() => this.bootstrapStateRef.value !== 'booting');

  async initialize(): Promise<void> {
    if (this.hasInitialized) {
      return;
    }

    if (!this.initializePromise) {
      this.initializePromise = this.performInitialization().finally(() => {
        this.hasInitialized = true;
      });
    }

    return this.initializePromise;
  }

  async setPreference(mode: LocalePreferenceMode): Promise<void> {
    this.preferenceModeRef.value = mode;
    writeStoredLocalePreference(mode);
    await this.activateForMode(mode);

    if (this.bootstrapStateRef.value !== 'failed') {
      this.bootstrapStateRef.value = 'ready';
    }
  }

  translate(key: TranslationKey, params?: TranslationParams): string {
    const activeMessage = resolveMessage(this.activeCatalogRef.value, key);
    if (activeMessage) {
      return interpolateMessage(activeMessage, params);
    }

    const fallbackMessage = resolveMessage(getCatalog('en'), key);
    if (fallbackMessage) {
      return interpolateMessage(fallbackMessage, params);
    }

    return key;
  }

  getActiveCatalog(): TranslationCatalog {
    return this.activeCatalogRef.value;
  }

  private async performInitialization(): Promise<void> {
    this.bootstrapStateRef.value = 'booting';

    try {
      const storedPreference = readStoredLocalePreference();
      const nextPreference = storedPreference ?? 'system';
      this.preferenceModeRef.value = nextPreference;
      writeStoredLocalePreference(nextPreference);
      await this.activateForMode(nextPreference);
      this.bootstrapStateRef.value = 'ready';
    } catch (error) {
      console.error('[localization] Initialization failed. Falling back to English.', error);
      this.preferenceModeRef.value = 'system';
      this.resolvedLocaleRef.value = 'en';
      this.activeCatalogRef.value = getCatalog('en');
      this.bootstrapStateRef.value = 'failed';
    }
  }

  private async activateForMode(mode: LocalePreferenceMode): Promise<void> {
    const resolvedLocale = await resolveSystemLocale(mode);
    this.resolvedLocaleRef.value = resolvedLocale;
    this.activeCatalogRef.value = mergeCatalogs(getCatalog('en'), getCatalog(resolvedLocale));
  }
}

export const localizationRuntime = new LocalizationRuntime();
