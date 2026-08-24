import { isAppFontSizePresetId, type AppFontSizePresetId } from './appFontSizePresets';

const STORAGE_KEY = 'autobyteus.display.app-font-size';

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function readStoredAppFontSizePresetId(): AppFontSizePresetId | null {
  if (!canUseLocalStorage()) {
    return null;
  }

  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (isAppFontSizePresetId(value)) {
      return value;
    }

    if (value !== null) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch (error) {
    console.warn('[appFontSize] Failed to read font-size preference from localStorage.', error);
  }

  return null;
}

export function writeStoredAppFontSizePresetId(presetId: AppFontSizePresetId): void {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, presetId);
  } catch (error) {
    console.warn('[appFontSize] Failed to persist font-size preference.', error);
  }
}
