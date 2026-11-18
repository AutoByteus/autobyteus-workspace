// autobyteus-525: on the phone page the app's font metrics come from the phone's Text size (root 16 px × step/17, code
// text 14 px × step/17); the desktop's Display preset is not read there, and its storage is not touched.
import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAppFontSizeStore } from '../appFontSizeStore';

const PHONE_KEY = 'autobyteus.phone.textSize';
const DESKTOP_KEY = 'autobyteus.display.app-font-size';
const root = () => document.documentElement;

beforeEach(() => {
  setActivePinia(createPinia());
  window.localStorage.clear();
  root().removeAttribute('style');
  root().removeAttribute('data-app-font-size');
  root().removeAttribute('data-phone-text-size');
});

describe('appFontSizeStore: the phone Text size source', () => {
  it('starts at the step kept on the phone and applies it to the document before anything renders', () => {
    window.localStorage.setItem(PHONE_KEY, 'largest');
    window.localStorage.setItem(DESKTOP_KEY, 'extra-large'); // never the phone's source
    const store = useAppFontSizeStore();
    store.initializePhoneTextSize();
    expect(store.phoneTextSizeStep).toBe('largest');
    expect(store.resolvedMetrics.rootPercent).toBeCloseTo(123.529, 3);
    expect(store.resolvedMetrics.editorFontPx).toBe(17);
    expect(parseFloat(root().style.fontSize)).toBeCloseTo(123.529, 3);
    expect(root().style.getPropertyValue('--app-editor-font-size-px')).toBe('17px');
    expect(root().getAttribute('data-phone-text-size')).toBe('largest');
    expect(root().hasAttribute('data-app-font-size')).toBe(false);
  });

  it('Standard by default: the root at 100 %, code text at 14 px, as before the setting existed', () => {
    const store = useAppFontSizeStore();
    store.initializePhoneTextSize();
    expect(store.phoneTextSizeStep).toBe('standard');
    expect(root().style.fontSize).toBe('100%');
    expect(store.resolvedMetrics).toEqual({ rootPercent: 100, editorFontPx: 14, terminalFontPx: 14 });
    expect(root().getAttribute('data-phone-text-size')).toBe('standard');
  });

  it('a chosen step applies at once and is kept on the phone; the desktop preset stays untouched', () => {
    const store = useAppFontSizeStore();
    store.initializePhoneTextSize();
    store.setPhoneTextSize('large');
    expect(store.phoneTextSizeStep).toBe('large');
    expect(parseFloat(root().style.fontSize)).toBeCloseTo(111.765, 3);
    expect(store.resolvedMetrics.editorFontPx).toBe(16);
    expect(root().getAttribute('data-phone-text-size')).toBe('large');
    expect(window.localStorage.getItem(PHONE_KEY)).toBe('large');
    expect(window.localStorage.getItem(DESKTOP_KEY)).toBeNull();
    expect(store.currentPresetId).toBe('default');
  });

  it('a phone that saved Small (autobyteus-534 REQ-003) starts at Standard; nothing stored changes', () => {
    window.localStorage.setItem(PHONE_KEY, 'small');
    window.localStorage.setItem(DESKTOP_KEY, 'large');
    const store = useAppFontSizeStore();
    expect(() => store.initializePhoneTextSize()).not.toThrow();
    expect(store.phoneTextSizeStep).toBe('standard');
    expect(root().style.fontSize).toBe('100%');
    expect(root().getAttribute('data-phone-text-size')).toBe('standard');
    expect(store.resolvedMetrics.editorFontPx).toBe(14);
    expect(window.localStorage.getItem(PHONE_KEY)).toBe('small');
    expect(window.localStorage.getItem(DESKTOP_KEY)).toBe('large');
  });

  it('refuses a phone step on a page whose source is the desktop preset (loud, never a silent default)', () => {
    const store = useAppFontSizeStore();
    store.initialize();
    expect(() => store.setPhoneTextSize('largest')).toThrow(/phone page/);
    expect(root().style.fontSize).toBe('100%');
    expect(root().hasAttribute('data-phone-text-size')).toBe(false);
    expect(window.localStorage.getItem(PHONE_KEY)).toBeNull();
  });
});
