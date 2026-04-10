import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import AppLocalizationGate from '../AppLocalizationGate.vue';

const isReadyForProductUi = ref(true);

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    isReadyForProductUi,
  }),
}));

describe('AppLocalizationGate', () => {
  beforeEach(() => {
    isReadyForProductUi.value = true;
  });

  it('renders product UI content when localization is ready', () => {
    const wrapper = mount(AppLocalizationGate, {
      slots: {
        default: '<div data-testid="localized-content">ready</div>',
      },
    });

    expect(wrapper.find('[data-testid="localized-content"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="app-localization-gate"]').exists()).toBe(false);
  });

  it('renders the neutral gate placeholder while localization is booting', () => {
    isReadyForProductUi.value = false;
    const wrapper = mount(AppLocalizationGate, {
      slots: {
        default: '<div data-testid="localized-content">ready</div>',
      },
    });

    expect(wrapper.find('[data-testid="localized-content"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="app-localization-gate"]').attributes('aria-hidden')).toBe('true');
  });
});
