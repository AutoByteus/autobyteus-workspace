import type { LocalePreferenceMode, SupportedLocale } from './types';

function normalizeLocaleCandidate(candidate: string | null | undefined): SupportedLocale | null {
  if (!candidate || typeof candidate !== 'string') {
    return null;
  }

  const normalized = candidate.trim();
  if (!normalized) {
    return null;
  }

  const lower = normalized.toLowerCase();

  if (lower === 'en' || lower.startsWith('en-')) {
    return 'en';
  }

  if (lower === 'zh' || lower === 'zh-cn' || lower === 'zh-sg' || lower === 'zh-hans' || lower.startsWith('zh-hans-')) {
    return 'zh-CN';
  }

  if (
    lower === 'zh-tw' ||
    lower === 'zh-hk' ||
    lower === 'zh-mo' ||
    lower === 'zh-hant' ||
    lower.startsWith('zh-hant-')
  ) {
    return 'en';
  }

  return null;
}

async function getElectronLocaleCandidate(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!window.electronAPI?.getAppLocale) {
    return null;
  }

  try {
    const locale = await window.electronAPI.getAppLocale();
    return locale?.trim() ? locale : null;
  } catch (error) {
    console.warn('[localization] Failed to resolve Electron app locale.', error);
    return null;
  }
}

function getBrowserLocaleCandidates(): string[] {
  if (typeof navigator === 'undefined') {
    return [];
  }

  const candidates: string[] = [];

  if (Array.isArray(navigator.languages)) {
    for (const candidate of navigator.languages) {
      if (typeof candidate === 'string' && candidate.trim() && !candidates.includes(candidate)) {
        candidates.push(candidate);
      }
    }
  }

  if (typeof navigator.language === 'string' && navigator.language.trim() && !candidates.includes(navigator.language)) {
    candidates.push(navigator.language);
  }

  return candidates;
}

export async function resolveSystemLocale(preferenceMode: LocalePreferenceMode): Promise<SupportedLocale> {
  if (preferenceMode === 'en' || preferenceMode === 'zh-CN') {
    return preferenceMode;
  }

  const electronLocale = await getElectronLocaleCandidate();
  const candidates = electronLocale ? [electronLocale] : getBrowserLocaleCandidates();

  for (const candidate of candidates) {
    const normalized = normalizeLocaleCandidate(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return 'en';
}

export const systemLocaleResolver = {
  resolveSystemLocale,
  normalizeLocaleCandidate,
};
