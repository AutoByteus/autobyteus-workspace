import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import LanguageSettingsManager from '../LanguageSettingsManager.vue';
import type { LocalePreferenceMode } from '~/localization/runtime/types';

const preferenceMode = ref<LocalePreferenceMode>('system');
const resolvedLocale = ref<'en' | 'zh-CN'>('en');
const setPreference = vi.fn(async (mode: LocalePreferenceMode) => {
  preferenceMode.value = mode;
  resolvedLocale.value = mode === 'zh-CN' ? 'zh-CN' : 'en';
});

const translations: Record<string, string> = {
  'settings.language.eyebrow': 'Language',
  'settings.language.title': 'App language',
  'settings.language.description': 'Choose how product-owned UI text is shown throughout AutoByteus.',
  'settings.language.fieldLabel': 'Display language',
  'settings.language.currentModeLabel': 'Current preference',
  'settings.language.activeLocaleLabel': 'Resolved locale',
  'settings.language.help': 'System Default follows your host language when it is supported. Unsupported locales fall back to English.',
  'settings.language.options.system': 'System Default',
  'settings.language.options.en': 'English',
  'settings.language.options.zhCN': 'Simplified Chinese',
};

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    preferenceMode,
    resolvedLocale,
    setPreference,
    t: (key: string) => translations[key] ?? key,
  }),
}));

describe('LanguageSettingsManager', () => {
  beforeEach(() => {
    preferenceMode.value = 'system';
    resolvedLocale.value = 'en';
    vi.clearAllMocks();
  });

  it('renders all language options', () => {
    const wrapper = mount(LanguageSettingsManager, {
      global: {
        mocks: {
          $t: (key: string) => translations[key] ?? key,
        },
      },
    });

    expect(wrapper.text()).toContain('Language');
    expect(wrapper.text()).toContain('App language');
    expect(wrapper.findAll('option').map((option) => option.text())).toEqual([
      'System Default',
      'English',
      'Simplified Chinese',
    ]);
  });

  it('persists a changed preference through the runtime boundary', async () => {
    const wrapper = mount(LanguageSettingsManager, {
      global: {
        mocks: {
          $t: (key: string) => translations[key] ?? key,
        },
      },
    });

    await wrapper.get('[data-testid="settings-language-select"]').setValue('zh-CN');
    await nextTick();

    expect(setPreference).toHaveBeenCalledWith('zh-CN');
    expect(wrapper.get('[data-testid="settings-language-active-locale"]').text()).toBe('Simplified Chinese');
  });
});
