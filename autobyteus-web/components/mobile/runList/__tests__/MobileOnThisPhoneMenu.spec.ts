// autobyteus-525 REQ-001, QR-002 / AC-001, autobyteus-534 REQ-001…003: the run list's ⋮ opens the phone's preferences
// (accessible name "On this phone", not shown), headed "Text size" with three steps; a step applies at once and the menu
// stays open; Esc closes it and the focus goes back to the button.
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
  it('opens a menu headed "Text size" with three steps (no visible "On this phone"); the kept step is marked and focused', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'large');
    useAppFontSizeStore().initializePhoneTextSize();
    const wrapper = await mountOpen();
    const menu = wrapper.get('[data-testid="mobile-on-this-phone-menu"]');
    expect(menu.attributes('role')).toBe('menu');
    expect(wrapper.get('[data-testid="mobile-on-this-phone-button"]').attributes('aria-expanded')).toBe('true');
    expect(menu.attributes('aria-label')).toBe('On this phone');
    expect(menu.text()).not.toContain('On this phone');
    expect(wrapper.find('[data-testid="mobile-on-this-phone-title"]').exists()).toBe(false);
    expect(menu.get('[data-testid="mobile-text-size-header"]').text()).toBe('Text size');
    expect(menu.text().replace(/A/g, '').trim()).toBe('Text size');
    const group = menu.get('[data-testid="mobile-text-size"]');
    expect(group.attributes('role')).toBe('group');
    expect(group.attributes('aria-label')).toBe('Text size');
    const steps = group.findAll('button');
    expect(steps.map((step) => step.attributes('aria-label'))).toEqual(['Standard', 'Large', 'Largest']);
    expect(steps.map((step) => step.attributes('aria-pressed'))).toEqual(['false', 'true', 'false']);
    expect(steps.map((step) => step.text())).toEqual(['A', 'A', 'A']);
    expect(steps.map((step) => step.attributes('style'))).toEqual(['font-size: 16px;', 'font-size: 19px;', 'font-size: 22px;']);
    expect(group.get('.grid').classes()).toContain('grid-cols-3');
    expect(steps.every((step) => step.classes().includes('min-h-[44px]'))).toBe(true);
    expect(document.activeElement).toBe(steps[1]!.element);
  });

  it('a phone that saved Small opens with Standard marked (autobyteus-534 REQ-003)', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'small');
    useAppFontSizeStore().initializePhoneTextSize();
    const wrapper = await mountOpen();
    const steps = wrapper.findAll('[data-testid="mobile-text-size"] button');
    expect(steps.map((step) => step.attributes('aria-pressed'))).toEqual(['true', 'false', 'false']);
    expect(document.activeElement).toBe(steps[0]!.element);
  });

  it('a tapped step applies to the whole phone at once and is kept; the menu stays open', async () => {
    useAppFontSizeStore().initializePhoneTextSize();
    const wrapper = await mountOpen();
    const steps = wrapper.findAll('[data-testid="mobile-text-size"] button');
    expect(steps.map((step) => step.attributes('aria-pressed'))).toEqual(['true', 'false', 'false']);
    await steps[2]!.trigger('click');
    expect(steps.map((step) => step.attributes('aria-pressed'))).toEqual(['false', 'false', 'true']);
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
