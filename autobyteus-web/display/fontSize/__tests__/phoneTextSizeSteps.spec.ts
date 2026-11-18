// autobyteus-525 REQ-004…006: the phone's four Text size steps, their metrics and the step kept on the phone.
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  PHONE_TEXT_SIZE_STEPS,
  PHONE_TEXT_SIZE_STORAGE_KEY,
  isPhoneTextSizeStep,
  phoneTextSizeMetrics,
  readStoredPhoneTextSizeStep,
  writeStoredPhoneTextSizeStep,
} from '../phoneTextSizeSteps';

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.removeItem(PHONE_TEXT_SIZE_STORAGE_KEY);
});

describe('phoneTextSizeSteps', () => {
  it('has three steps, Standard the smallest (autobyteus-534), under the same storage key', () => {
    expect(PHONE_TEXT_SIZE_STEPS.map((entry) => [entry.step, entry.px])).toEqual([['standard', 17], ['large', 19], ['largest', 21]]);
    expect(PHONE_TEXT_SIZE_STORAGE_KEY).toBe('autobyteus.phone.textSize');
    expect(isPhoneTextSizeStep('largest')).toBe(true);
    expect(isPhoneTextSizeStep('extra-large')).toBe(false);
    expect(isPhoneTextSizeStep('small')).toBe(false);
  });

  it('Standard is today\'s sizes; every step scales the root by px/17 so 1.0625rem is the step\'s px; code text 14 × px/17', () => {
    expect(phoneTextSizeMetrics('standard')).toEqual({ rootPercent: 100, editorFontPx: 14, terminalFontPx: 14 });
    for (const { step, px } of PHONE_TEXT_SIZE_STEPS) {
      const metrics = phoneTextSizeMetrics(step);
      expect(16 * (metrics.rootPercent / 100) * 1.0625).toBeCloseTo(px, 9);
    }
    expect(PHONE_TEXT_SIZE_STEPS.map(({ step }) => phoneTextSizeMetrics(step).editorFontPx)).toEqual([14, 16, 17]);
    expect(phoneTextSizeMetrics('largest').rootPercent).toBeCloseTo(123.529, 3);
    expect(phoneTextSizeMetrics('large').rootPercent).toBeCloseTo(111.765, 3);
  });

  it('reads the kept step (a beta.9 choice carries over); none, unknown or unreadable storage is Standard', () => {
    expect(readStoredPhoneTextSizeStep()).toBe('standard');
    window.localStorage.setItem(PHONE_TEXT_SIZE_STORAGE_KEY, 'largest');
    expect(readStoredPhoneTextSizeStep()).toBe('largest');
    window.localStorage.setItem(PHONE_TEXT_SIZE_STORAGE_KEY, 'huge');
    expect(readStoredPhoneTextSizeStep()).toBe('standard');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    expect(readStoredPhoneTextSizeStep()).toBe('standard');
  });

  it('a saved Small (no longer a step, autobyteus-534 REQ-003) reads as Standard; the reader writes nothing', () => {
    window.localStorage.setItem(PHONE_TEXT_SIZE_STORAGE_KEY, 'small');
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem');
    expect(readStoredPhoneTextSizeStep()).toBe('standard');
    expect(window.localStorage.getItem(PHONE_TEXT_SIZE_STORAGE_KEY)).toBe('small');
    expect(setItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
  });

  it('keeps a step; a storage that refuses the write does not throw', () => {
    writeStoredPhoneTextSizeStep('large');
    expect(window.localStorage.getItem(PHONE_TEXT_SIZE_STORAGE_KEY)).toBe('large');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });
    expect(() => writeStoredPhoneTextSizeStep('largest')).not.toThrow();
  });
});
