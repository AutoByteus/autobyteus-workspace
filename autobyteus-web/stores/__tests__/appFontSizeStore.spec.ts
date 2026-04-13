import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAppFontSizeStore } from '../appFontSizeStore';

const STORAGE_KEY = 'autobyteus.display.app-font-size';

const resetDocumentRoot = () => {
  document.documentElement.style.fontSize = '';
  document.documentElement.style.removeProperty('--app-font-size-scale');
  document.documentElement.style.removeProperty('--app-editor-font-size-px');
  document.documentElement.style.removeProperty('--app-terminal-font-size-px');
  document.documentElement.removeAttribute('data-app-font-size');
};

describe('appFontSizeStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    window.localStorage.clear();
    resetDocumentRoot();
  });

  it('hydrates a stored preset and applies the resolved document metrics', () => {
    window.localStorage.setItem(STORAGE_KEY, 'large');

    const store = useAppFontSizeStore();
    store.initialize();

    expect(store.currentPresetId).toBe('large');
    expect(store.resolvedMetrics.rootPercent).toBe(112.5);
    expect(store.resolvedMetrics.editorFontPx).toBe(16);
    expect(document.documentElement.style.fontSize).toBe('112.5%');
    expect(document.documentElement.getAttribute('data-app-font-size')).toBe('large');
    expect(document.documentElement.style.getPropertyValue('--app-font-size-scale')).toBe('1.125');
  });

  it('persists font-size changes and resets back to the default preset', () => {
    const store = useAppFontSizeStore();
    store.initialize();

    store.setPreset('extra-large');

    expect(store.currentPresetId).toBe('extra-large');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('extra-large');
    expect(document.documentElement.style.fontSize).toBe('125%');
    expect(document.documentElement.style.getPropertyValue('--app-editor-font-size-px')).toBe('18px');
    expect(document.documentElement.style.getPropertyValue('--app-terminal-font-size-px')).toBe('18px');

    store.resetToDefault();

    expect(store.currentPresetId).toBe('default');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('default');
    expect(document.documentElement.style.fontSize).toBe('100%');
    expect(document.documentElement.getAttribute('data-app-font-size')).toBe('default');
  });

  it('drops invalid persisted values and keeps the default preset active', () => {
    window.localStorage.setItem(STORAGE_KEY, 'giant');

    const store = useAppFontSizeStore();
    store.initialize();
    store.setPreset('giant');

    expect(store.currentPresetId).toBe('default');
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(document.documentElement.style.fontSize).toBe('100%');
  });
});
