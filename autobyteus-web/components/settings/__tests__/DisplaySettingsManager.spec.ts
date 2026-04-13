import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import DisplaySettingsManager from '../DisplaySettingsManager.vue';
import { useAppFontSizeStore } from '~/stores/appFontSizeStore';

const translations: Record<string, string> = {
  'settings.display.eyebrow': 'Display',
  'settings.display.title': 'App font size',
  'settings.display.description': 'Scale product text across the workspace and shared viewer surfaces.',
  'settings.display.fontSize.fieldLabel': 'Font size',
  'settings.display.fontSize.currentPresetLabel': 'Current preset',
  'settings.display.fontSize.appliedMetricsLabel': 'Applied metrics',
  'settings.display.fontSize.help': 'Changes apply immediately and stay saved for future sessions.',
  'settings.display.fontSize.reset': 'Reset to Default',
  'settings.display.fontSize.options.default.label': 'Default',
  'settings.display.fontSize.options.default.summary': 'Baseline sizing for the current layout.',
  'settings.display.fontSize.options.large.label': 'Large',
  'settings.display.fontSize.options.large.summary': 'Increase UI text to 112.5% with larger editor and terminal text.',
  'settings.display.fontSize.options.extraLarge.label': 'Extra Large',
  'settings.display.fontSize.options.extraLarge.summary': 'Increase UI text to 125% with the largest V1 editor and terminal text.',
};

const interpolate = (template: string, params?: Record<string, string | number>) => {
  if (!params) {
    return template;
  }

  return Object.entries(params).reduce(
    (value, [key, replacement]) => value.replaceAll(`{{${key}}}`, String(replacement)),
    template,
  );
};

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      interpolate(
        translations[key]
          ?? {
            'settings.display.fontSize.appliedMetrics': 'Root {{percent}}% · Editor {{editorPx}}px · Terminal {{terminalPx}}px',
          }[key]
          ?? key,
        params,
      ),
  }),
}));

const resetDocumentRoot = () => {
  document.documentElement.style.fontSize = '';
  document.documentElement.style.removeProperty('--app-font-size-scale');
  document.documentElement.style.removeProperty('--app-editor-font-size-px');
  document.documentElement.style.removeProperty('--app-terminal-font-size-px');
  document.documentElement.removeAttribute('data-app-font-size');
};

describe('DisplaySettingsManager', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    window.localStorage.clear();
    resetDocumentRoot();
    vi.clearAllMocks();
  });

  it('renders all preset options and shows the default summary by default', () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const wrapper = mount(DisplaySettingsManager, {
      global: {
        plugins: [pinia],
      },
    });

    expect(wrapper.text()).toContain('App font size');
    expect(wrapper.text()).toContain('Default');
    expect(wrapper.text()).toContain('Large');
    expect(wrapper.text()).toContain('Extra Large');
    expect(wrapper.get('[data-testid="settings-display-font-size-current"]').text()).toBe('Default');
  });

  it('updates the authoritative store when a larger preset is selected', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useAppFontSizeStore();
    store.initialize();

    const wrapper = mount(DisplaySettingsManager, {
      global: {
        plugins: [pinia],
      },
    });

    await wrapper.get('[data-testid="settings-display-font-size-input-large"]').setValue(true);

    expect(store.currentPresetId).toBe('large');
    expect(window.localStorage.getItem('autobyteus.display.app-font-size')).toBe('large');
    expect(document.documentElement.style.fontSize).toBe('112.5%');
    expect(wrapper.get('[data-testid="settings-display-font-size-current"]').text()).toBe('Large');
    expect(wrapper.get('[data-testid="settings-display-font-size-applied-metrics"]').text()).toContain('Editor 16px');
  });

  it('resets the selected preset back to the default option', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useAppFontSizeStore();
    store.initialize();
    store.setPreset('extra-large');

    const wrapper = mount(DisplaySettingsManager, {
      global: {
        plugins: [pinia],
      },
    });

    await wrapper.get('[data-testid="settings-display-font-size-reset"]').trigger('click');

    expect(store.currentPresetId).toBe('default');
    expect(document.documentElement.style.fontSize).toBe('100%');
    expect(wrapper.get('[data-testid="settings-display-font-size-current"]').text()).toBe('Default');
  });
});
