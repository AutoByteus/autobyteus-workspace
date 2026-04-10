import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import LanguageSettingsManager from '../LanguageSettingsManager.vue';
import { localizationRuntime } from '~/localization/runtime/localizationRuntime';

describe('LanguageSettingsManager integration', () => {
  const originalNavigator = globalThis.navigator;

  beforeEach(async () => {
    window.localStorage.clear();
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        languages: ['en-US'],
        language: 'en-US',
      },
    });

    await localizationRuntime.initialize();
    await localizationRuntime.setPreference('en');
  });

  afterEach(() => {
    if (originalNavigator) {
      Object.defineProperty(globalThis, 'navigator', { value: originalNavigator, configurable: true });
    }
  });

  it('renders real catalog copy and switches to Simplified Chinese with persisted override', async () => {
    const wrapper = mount(LanguageSettingsManager, {
      global: {
        mocks: {
          $t: (key: string, params?: Record<string, string | number>) =>
            localizationRuntime.translate(key, params),
        },
      },
    });

    expect(wrapper.text()).toContain('App language');
    expect(wrapper.text()).toContain('Simplified Chinese');

    await wrapper.get('[data-testid="settings-language-select"]').setValue('zh-CN');
    await nextTick();

    expect(wrapper.text()).toContain('应用语言');
    expect(wrapper.text()).toContain('系统默认');
    expect(wrapper.get('[data-testid="settings-language-current-mode"]').text()).toBe('简体中文');
    expect(wrapper.get('[data-testid="settings-language-active-locale"]').text()).toBe('简体中文');
    expect(window.localStorage.getItem('autobyteus.localization.preference-mode')).toBe('zh-CN');
  });
});
