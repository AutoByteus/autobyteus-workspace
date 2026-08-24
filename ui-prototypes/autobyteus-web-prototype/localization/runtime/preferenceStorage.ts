import type { LocalePreferenceMode } from './types';

const STORAGE_KEY = 'autobyteus.localization.preference-mode';

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function readStoredLocalePreference(): LocalePreferenceMode | null {
  if (!canUseLocalStorage()) {
    return null;
  }

  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (value === 'system' || value === 'en' || value === 'zh-CN') {
      return value;
    }
  } catch (error) {
    console.warn('[localization] Failed to read locale preference from localStorage.', error);
  }

  return null;
}

export function writeStoredLocalePreference(mode: LocalePreferenceMode): void {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch (error) {
    console.warn('[localization] Failed to persist locale preference to localStorage.', error);
  }
}
