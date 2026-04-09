import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveSystemLocale, systemLocaleResolver } from '../systemLocaleResolver';

describe('systemLocaleResolver', () => {
  const originalNavigator = globalThis.navigator;
  const originalWindow = globalThis.window;

  afterEach(() => {
    if (originalNavigator) {
      Object.defineProperty(globalThis, 'navigator', { value: originalNavigator, configurable: true });
    }
    if (originalWindow) {
      Object.defineProperty(globalThis, 'window', { value: originalWindow, configurable: true });
    }
    vi.restoreAllMocks();
  });

  it('normalizes supported Chinese variants to zh-CN', () => {
    expect(systemLocaleResolver.normalizeLocaleCandidate('zh')).toBe('zh-CN');
    expect(systemLocaleResolver.normalizeLocaleCandidate('zh-Hans-SG')).toBe('zh-CN');
    expect(systemLocaleResolver.normalizeLocaleCandidate('zh-SG')).toBe('zh-CN');
  });

  it('falls back unsupported Traditional Chinese variants to English', () => {
    expect(systemLocaleResolver.normalizeLocaleCandidate('zh-TW')).toBe('en');
    expect(systemLocaleResolver.normalizeLocaleCandidate('zh-Hant-HK')).toBe('en');
  });

  it('prefers Electron locale when available in system mode', async () => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        electronAPI: {
          getAppLocale: vi.fn().mockResolvedValue('zh-CN'),
        },
      },
    });
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        languages: ['en-US'],
        language: 'en-US',
      },
    });

    await expect(resolveSystemLocale('system')).resolves.toBe('zh-CN');
  });

  it('uses browser locales when Electron locale is unavailable', async () => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {},
    });
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        languages: ['de-DE', 'en-US'],
        language: 'de-DE',
      },
    });

    await expect(resolveSystemLocale('system')).resolves.toBe('en');
  });
});
