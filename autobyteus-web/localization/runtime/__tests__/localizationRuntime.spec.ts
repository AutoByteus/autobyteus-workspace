import { afterEach, describe, expect, it, vi } from 'vitest';

type SupportedLocale = 'en' | 'zh-CN';
type LocalePreferenceMode = 'system' | SupportedLocale;

async function loadRuntimeHarness(options?: {
  storedPreference?: LocalePreferenceMode | null;
  resolverResult?: SupportedLocale;
  resolverError?: Error;
}) {
  vi.resetModules();

  const writeStoredLocalePreference = vi.fn();
  const resolveSystemLocale = options?.resolverError
    ? vi.fn().mockRejectedValue(options.resolverError)
    : vi.fn().mockResolvedValue(options?.resolverResult ?? 'en');

  vi.doMock('../catalogRegistry', () => ({
    getCatalog: (locale: SupportedLocale) =>
      locale === 'zh-CN'
        ? {
            'settings.language.title': '应用语言',
            'settings.language.help': '系统默认会跟随受支持的主机语言。',
          }
        : {
            'settings.language.title': 'App language',
            'settings.language.help': 'System Default follows your supported host language.',
          },
  }));

  vi.doMock('../catalogMerge', () => ({
    mergeCatalogs: (baseCatalog: Record<string, string>, overrideCatalog: Record<string, string>) => ({
      ...baseCatalog,
      ...overrideCatalog,
    }),
  }));

  vi.doMock('../preferenceStorage', () => ({
    readStoredLocalePreference: vi.fn(() => options?.storedPreference ?? null),
    writeStoredLocalePreference,
  }));

  vi.doMock('../systemLocaleResolver', () => ({
    resolveSystemLocale,
  }));

  const module = await import('../localizationRuntime');

  return {
    localizationRuntime: module.localizationRuntime,
    resolveSystemLocale,
    writeStoredLocalePreference,
  };
}

describe('localizationRuntime', () => {
  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('initializes from system mode and activates the resolved locale catalog', async () => {
    const { localizationRuntime, resolveSystemLocale, writeStoredLocalePreference } =
      await loadRuntimeHarness({ resolverResult: 'zh-CN' });

    await localizationRuntime.initialize();

    expect(resolveSystemLocale).toHaveBeenCalledWith('system');
    expect(writeStoredLocalePreference).toHaveBeenCalledWith('system');
    expect(localizationRuntime.preferenceMode.value).toBe('system');
    expect(localizationRuntime.resolvedLocale.value).toBe('zh-CN');
    expect(localizationRuntime.bootstrapState.value).toBe('ready');
    expect(localizationRuntime.translate('settings.language.title')).toBe('应用语言');
  });

  it('falls back to English and releases the product UI gate when initialization fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const failure = new Error('boom');
    const { localizationRuntime, resolveSystemLocale } = await loadRuntimeHarness({
      resolverError: failure,
    });

    await localizationRuntime.initialize();

    expect(resolveSystemLocale).toHaveBeenCalledWith('system');
    expect(localizationRuntime.bootstrapState.value).toBe('failed');
    expect(localizationRuntime.isReadyForProductUi.value).toBe(true);
    expect(localizationRuntime.preferenceMode.value).toBe('system');
    expect(localizationRuntime.resolvedLocale.value).toBe('en');
    expect(localizationRuntime.translate('settings.language.title')).toBe('App language');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('persists manual overrides and rerenders from the new locale catalog', async () => {
    const { localizationRuntime, resolveSystemLocale, writeStoredLocalePreference } =
      await loadRuntimeHarness({ storedPreference: 'en', resolverResult: 'en' });

    await localizationRuntime.initialize();
    resolveSystemLocale.mockResolvedValueOnce('zh-CN');

    await localizationRuntime.setPreference('zh-CN');

    expect(resolveSystemLocale).toHaveBeenLastCalledWith('zh-CN');
    expect(writeStoredLocalePreference).toHaveBeenLastCalledWith('zh-CN');
    expect(localizationRuntime.preferenceMode.value).toBe('zh-CN');
    expect(localizationRuntime.resolvedLocale.value).toBe('zh-CN');
    expect(localizationRuntime.bootstrapState.value).toBe('ready');
    expect(localizationRuntime.translate('settings.language.help')).toBe('系统默认会跟随受支持的主机语言。');
  });
});
