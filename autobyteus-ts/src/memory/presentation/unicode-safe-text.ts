const REPLACEMENT_CHARACTER = '\uFFFD';

const isHighSurrogate = (codeUnit: number): boolean =>
  codeUnit >= 0xD800 && codeUnit <= 0xDBFF;

const isLowSurrogate = (codeUnit: number): boolean =>
  codeUnit >= 0xDC00 && codeUnit <= 0xDFFF;

const isDisallowedControl = (codeUnit: number): boolean =>
  (codeUnit >= 0x0000 && codeUnit <= 0x0008)
  || codeUnit === 0x000B
  || codeUnit === 0x000C
  || (codeUnit >= 0x000E && codeUnit <= 0x001F)
  || codeUnit === 0x007F;

const normalizeIndex = (value: number, length: number): number => {
  if (!Number.isFinite(value)) {
    throw new RangeError('Provider-safe text boundaries require a finite index.');
  }
  return Math.max(0, Math.min(length, Math.floor(value)));
};

const normalizeLimit = (value: number): number => {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError('Provider-safe text limits must be non-negative and finite.');
  }
  return Math.floor(value);
};

export class ProviderSafeCompactionText {
  toProviderSafeText(value: string): string {
    const normalizedNewlines = value.replace(/\r\n?/g, '\n');
    let result = '';
    for (let index = 0; index < normalizedNewlines.length; index += 1) {
      const codeUnit = normalizedNewlines.charCodeAt(index);
      if (isDisallowedControl(codeUnit)) {
        continue;
      }
      if (isHighSurrogate(codeUnit)) {
        const nextCodeUnit = normalizedNewlines.charCodeAt(index + 1);
        if (isLowSurrogate(nextCodeUnit)) {
          result += normalizedNewlines[index] + normalizedNewlines[index + 1];
          index += 1;
        } else {
          result += REPLACEMENT_CHARACTER;
        }
        continue;
      }
      if (isLowSurrogate(codeUnit)) {
        result += REPLACEMENT_CHARACTER;
        continue;
      }
      result += normalizedNewlines[index];
    }
    return result;
  }

  isProviderSafeText(value: string): boolean {
    for (let index = 0; index < value.length; index += 1) {
      const codeUnit = value.charCodeAt(index);
      if (codeUnit === 0x000D || isDisallowedControl(codeUnit)) {
        return false;
      }
      if (isHighSurrogate(codeUnit)) {
        if (!isLowSurrogate(value.charCodeAt(index + 1))) {
          return false;
        }
        index += 1;
      } else if (isLowSurrogate(codeUnit)) {
        return false;
      }
    }
    return true;
  }

  finalize(value: string): string {
    const result = this.toProviderSafeText(value);
    if (!this.isProviderSafeText(result)) {
      throw new Error('Provider-safe text normalization did not satisfy its invariant.');
    }
    return result;
  }

  sliceEndWithoutSplittingSurrogate(value: string, requestedEnd: number): number {
    const end = normalizeIndex(requestedEnd, value.length);
    if (
      end > 0
      && end < value.length
      && isHighSurrogate(value.charCodeAt(end - 1))
      && isLowSurrogate(value.charCodeAt(end))
    ) {
      return end - 1;
    }
    return end;
  }

  sliceStartWithoutSplittingSurrogate(value: string, requestedStart: number): number {
    const start = normalizeIndex(requestedStart, value.length);
    if (
      start > 0
      && start < value.length
      && isHighSurrogate(value.charCodeAt(start - 1))
      && isLowSurrogate(value.charCodeAt(start))
    ) {
      return start + 1;
    }
    return start;
  }

  truncateEnd(value: string, requestedLimit: number): string {
    const safeValue = this.finalize(value);
    const limit = normalizeLimit(requestedLimit);
    if (safeValue.length <= limit) {
      return safeValue;
    }
    const end = this.sliceEndWithoutSplittingSurrogate(safeValue, limit);
    return safeValue.slice(0, end);
  }
}

export const providerSafeCompactionText = new ProviderSafeCompactionText();
