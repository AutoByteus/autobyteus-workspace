// The run screen's ⋮ menu (autobyteus-458, autobyteus-522, autobyteus-525 REQ-003, autobyteus-534 REQ-005): Settings for
// every run, the last entry; Messages and VNC Viewer when they apply; no Text size (the phone's Text size is on the run
// list).
import { afterEach, describe, expect, it } from 'vitest';
import { enableAutoUnmount, mount } from '@vue/test-utils';
import MobileRunMenu from '../MobileRunMenu.vue';

enableAutoUnmount(afterEach);

const mountMenu = async (props: { showMessages: boolean; showDesktop: boolean }) => {
  const wrapper = mount(MobileRunMenu, { props });
  await wrapper.get('[data-testid="mobile-run-menu-button"]').trigger('click');
  return wrapper;
};
const entriesOf = async (props: { showMessages: boolean; showDesktop: boolean }) =>
  (await mountMenu(props)).findAll('[role="menuitem"]').map((item) => item.text());

describe('the run menu\'s entries', () => {
  it.each([
    [{ showMessages: false, showDesktop: false }, ['Artifacts', 'Files', 'Activity', 'Settings']],
    [{ showMessages: true, showDesktop: false }, ['Artifacts', 'Files', 'Messages', 'Activity', 'Settings']],
    [{ showMessages: false, showDesktop: true }, ['Artifacts', 'Files', 'Activity', 'VNC Viewer', 'Settings']],
    [{ showMessages: true, showDesktop: true }, ['Artifacts', 'Files', 'Messages', 'Activity', 'VNC Viewer', 'Settings']],
  ])('%j: Settings always, and last (autobyteus-522, autobyteus-534)', async (props, entries) => {
    expect(await entriesOf(props)).toEqual(entries);
  });

  it('has no Text size, and fits the phone\'s width (autobyteus-525)', async () => {
    const wrapper = await mountMenu({ showMessages: true, showDesktop: true });
    expect(wrapper.find('[data-testid="mobile-text-size"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Text size');
    expect(wrapper.get('[data-testid="mobile-run-menu"]').classes()).toContain('max-w-[calc(100vw-1rem)]');
  });
});
