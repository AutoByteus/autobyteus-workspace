// The run screen's ⋮ menu entries (autobyteus-458, autobyteus-522): Settings for every run, right after Activity; Messages
// and VNC Viewer when they apply.
import { afterEach, describe, expect, it } from 'vitest';
import { enableAutoUnmount, mount } from '@vue/test-utils';
import MobileRunMenu from '../MobileRunMenu.vue';

enableAutoUnmount(afterEach);

const entriesOf = async (props: { showMessages: boolean; showDesktop: boolean }) => {
  const wrapper = mount(MobileRunMenu, { props });
  await wrapper.get('[data-testid="mobile-run-menu-button"]').trigger('click');
  return wrapper.findAll('[role="menuitem"]').map((item) => item.text());
};

describe('the run menu\'s entries', () => {
  it.each([
    [{ showMessages: false, showDesktop: false }, ['Artifacts', 'Files', 'Activity', 'Settings']],
    [{ showMessages: true, showDesktop: false }, ['Artifacts', 'Files', 'Messages', 'Activity', 'Settings']],
    [{ showMessages: true, showDesktop: true }, ['Artifacts', 'Files', 'Messages', 'Activity', 'Settings', 'VNC Viewer']],
  ])('%j: Settings after Activity, always (autobyteus-522)', async (props, entries) => {
    expect(await entriesOf(props)).toEqual(entries);
  });
});
