const INVALID_NAME_CODE = 'CUSTOM_PROVIDER_NAME_INVALID';

export const normalizeProviderName = (value: string): string =>
  value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase();

export const buildCustomProviderId = (displayName: string): string => {
  const canonicalName = normalizeProviderName(displayName);
  const parts: string[] = [];
  let asciiWord = '';

  const flushAsciiWord = (): void => {
    if (!asciiWord) return;
    parts.push(asciiWord);
    asciiWord = '';
  };

  for (const codePoint of canonicalName.normalize('NFKD')) {
    if (/\p{M}/u.test(codePoint)) continue;
    if (/^[a-z0-9]$/.test(codePoint)) {
      asciiWord += codePoint;
      continue;
    }

    flushAsciiWord();
    if (codePoint.codePointAt(0)! <= 0x7f) continue;
    parts.push(`u${codePoint.codePointAt(0)!.toString(16)}`);
  }
  flushAsciiWord();

  const body = parts.filter(Boolean).join('_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  if (!body) throw new Error(INVALID_NAME_CODE);
  return `provider_${body}`;
};

export const CUSTOM_PROVIDER_NAME_INVALID = INVALID_NAME_CODE;
