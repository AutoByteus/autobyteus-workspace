// autobyteus-525 REQ-001, REQ-002, QR-002 / AC-001: the run list's ⋮ opens "On this phone" with the Text size group; a
// step applies at once and the menu stays open; Esc closes it and the focus goes back to the button.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { enableAutoUnmount, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import MobileOnThisPhoneMenu from '../MobileOnThisPhoneMenu.vue';
import { useAppFontSizeStore } from '~/stores/appFontSizeStore';

enableAutoUnmount(afterEach);

const STORAGE_KEY = 'autobyteus.phone.textSize';

beforeEach(() => {
  setActivePinia(createPinia());
  window.localStorage.clear();
  document.documentElement.removeAttribute('style');
});

const mountOpen = async () => {
  const wrapper = mount(MobileOnThisPhoneMenu, { attachTo: document.body });
  const button = wrapper.get('[data-testid="mobile-on-this-phone-button"]');
  expect(button.attributes('aria-label')).toBe('On this phone');
  expect(button.attributes('aria-expanded')).toBe('false');
  await button.trigger('click');
  await nextTick();
  return wrapper;
};

describe('MobileOnThisPhoneMenu', () => {
  it('opens a menu headed "On this phone" with the Text size group; the kept step is marked and focused', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'large');
    useAppFontSizeStore().initializePhoneTextSize();
    const wrapper = await mountOpen();
    const menu = wrapper.get('[data-testid="mobile-on-this-phone-menu"]');
    expect(menu.attributes('role')).toBe('menu');
    expect(wrapper.get('[data-testid="mobile-on-this-phone-button"]').attributes('aria-expanded')).toBe('true');
    const heading = wrapper.get('[data-testid="mobile-on-this-phone-title"]');
    expect(heading.text()).toBe('On this phone');
    expect(menu.attributes('aria-labelledby')).toBe(heading.attributes('id'));
    const group = menu.get('[data-testid="mobile-text-size"]');
    expect(group.attributes('role')).toBe('group');
    expect(group.attributes('aria-label')).toBe('Text size');
    const steps = group.findAll('button');
    expect(steps.map((step) => step.attributes('aria-label'))).toEqual(['Small', 'Standard', 'Large', 'Largest']);
    expect(steps.map((step) => step.attributes('aria-pressed'))).toEqual(['false', 'false', 'true', 'false']);
    expect(steps.map((step) => step.text())).toEqual(['A', 'A', 'A', 'A']);
    expect(steps.map((step) => step.attributes('style'))).toEqual(['font-size: 13px;', 'font-size: 16px;', 'font-size: 19px;', 'font-size: 22px;']);
    expect(steps.every((step) => step.classes().includes('min-h-[44px]'))).toBe(true);
    expect(document.activeElement).toBe(steps[2]!.element);
  });

  it('a tapped step applies to the whole phone at once and is kept; the menu stays open', async () => {
    useAppFontSizeStore().initializePhoneTextSize();
    const wrapper = await mountOpen();
    const steps = wrapper.findAll('[data-testid="mobile-text-size"] button');
    expect(steps.map((step) => step.attributes('aria-pressed'))).toEqual(['false', 'true', 'false', 'false']);
    await steps[3]!.trigger('click');
    expect(steps.map((step) => step.attributes('aria-pressed'))).toEqual(['false', 'false', 'false', 'true']);
    expect(document.documentElement.getAttribute('data-phone-text-size')).toBe('largest');
    expect(parseFloat(document.documentElement.style.fontSize)).toBeCloseTo(123.529, 3);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('largest');
    expect(wrapper.find('[data-testid="mobile-on-this-phone-menu"]').exists()).toBe(true);
  });

  it('Esc closes the menu and returns the focus to the button; a tap outside closes it', async () => {
    useAppFontSizeStore().initializePhoneTextSize();
    const wrapper = await mountOpen();
    await wrapper.get('[data-testid="mobile-on-this-phone-menu"]').trigger('keydown', { key: 'Escape' });
    expect(wrapper.find('[data-testid="mobile-on-this-phone-menu"]').exists()).toBe(false);
    expect(document.activeElement).toBe(wrapper.get('[data-testid="mobile-on-this-phone-button"]').element);
    await wrapper.get('[data-testid="mobile-on-this-phone-button"]').trigger('click');
    const outside = wrapper.get('button[aria-label="Close menu"]');
    await outside.trigger('click');
    expect(wrapper.find('[data-testid="mobile-on-this-phone-menu"]').exists()).toBe(false);
  });
});
