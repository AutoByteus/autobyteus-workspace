// The run's ⋮ menu (autobyteus-458, autobyteus-525 REQ-003): its views, Settings after Activity, and no Text size (the
// phone's Text size is on the run list).
import { afterEach, describe, expect, it } from 'vitest';
import { enableAutoUnmount, mount } from '@vue/test-utils';
import MobileRunMenu from '../MobileRunMenu.vue';

enableAutoUnmount(afterEach);

const mountMenu = async (showSettings = true) => {
  const wrapper = mount(MobileRunMenu, { props: { showMessages: true, showDesktop: false, showSettings } });
  await wrapper.get('[data-testid="mobile-run-menu-button"]').trigger('click');
  return wrapper;
};

describe('MobileRunMenu', () => {
  it('lists the views with Settings after Activity, and no Text size', async () => {
    const wrapper = await mountMenu();
    expect(wrapper.findAll('[role="menuitem"]').map((item) => item.text())).toEqual(['Artifacts', 'Files', 'Messages', 'Activity', 'Settings']);
    expect(wrapper.find('[data-testid="mobile-text-size"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Text size');
    expect(wrapper.get('[data-testid="mobile-run-menu"]').classes()).toContain('max-w-[calc(100vw-1rem)]');
  });

  it('has no Settings entry for a run it does not serve', async () => {
    const wrapper = await mountMenu(false);
    expect(wrapper.findAll('[role="menuitem"]').map((item) => item.text())).not.toContain('Settings');
  });
});
