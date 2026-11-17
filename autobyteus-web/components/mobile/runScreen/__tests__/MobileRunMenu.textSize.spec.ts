// autobyteus-506 REQ-002: the ⋮ menu's Text size block; the phone-wide step, applied at once and kept on the phone.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, mount } from '@vue/test-utils';

enableAutoUnmount(afterEach);

const STORAGE_KEY = 'autobyteus.phone.textSize';

const freshTextSize = async () => {
  vi.resetModules();
  return import('~/composables/mobile/usePhoneTextSize');
};
const mountMenu = async () => {
  const { default: MobileRunMenu } = await import('../MobileRunMenu.vue');
  const wrapper = mount(MobileRunMenu, { props: { showMessages: true, showDesktop: false } });
  await wrapper.get('[data-testid="mobile-run-menu-button"]').trigger('click');
  return wrapper;
};

beforeEach(() => { window.localStorage.removeItem(STORAGE_KEY); });

describe('the phone Text size (autobyteus-506)', () => {
  it('starts at Standard 17 px; an unknown stored value is Standard too', async () => {
    let size = (await freshTextSize()).usePhoneTextSize();
    expect([size.step.value, size.px.value]).toEqual(['standard', 17]);
    window.localStorage.setItem(STORAGE_KEY, 'huge');
    size = (await freshTextSize()).usePhoneTextSize();
    expect([size.step.value, size.px.value]).toEqual(['standard', 17]);
  });

  it('keeps a chosen step on the phone and reads it back after a reload; every user of it sees the change at once', async () => {
    const module = await freshTextSize();
    const first = module.usePhoneTextSize(), second = module.usePhoneTextSize();
    first.set('largest');
    expect(second.px.value).toBe(21);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('largest');
    const reloaded = (await freshTextSize()).usePhoneTextSize();
    expect([reloaded.step.value, reloaded.px.value]).toEqual(['largest', 21]);
    expect((await freshTextSize()).PHONE_TEXT_SIZE_STEPS.map((entry) => entry.px)).toEqual([15, 17, 19, 21]);
  });

  it('the menu: Settings after Activity, then the Text size group of four pressed-state buttons', async () => {
    await freshTextSize();
    const wrapper = await mountMenu();
    expect(wrapper.findAll('[role="menuitem"]').map((item) => item.text())).toEqual(['Artifacts', 'Files', 'Messages', 'Activity', 'Settings']);
    const group = wrapper.get('[data-testid="mobile-text-size"]');
    expect(group.attributes('role')).toBe('group');
    expect(group.attributes('aria-label')).toBe('Text size');
    const steps = group.findAll('button');
    expect(steps.map((step) => step.attributes('aria-label'))).toEqual(['Small', 'Standard', 'Large', 'Largest']);
    expect(steps.map((step) => step.attributes('aria-pressed'))).toEqual(['false', 'true', 'false', 'false']);
    expect(steps.map((step) => step.text())).toEqual(['A', 'A', 'A', 'A']);
    await steps[2]!.trigger('click');
    expect(steps.map((step) => step.attributes('aria-pressed'))).toEqual(['false', 'false', 'true', 'false']);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('large');
    // The menu stays open: the conversation behind it reflows at once.
    expect(wrapper.find('[data-testid="mobile-run-menu"]').exists()).toBe(true);
  });
});
