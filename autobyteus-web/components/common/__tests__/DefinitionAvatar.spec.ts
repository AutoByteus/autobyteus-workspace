import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DefinitionAvatar from '../DefinitionAvatar.vue';
import { resetAvatarObjectUrlsForTests } from '~/composables/useAvatarObjectUrl';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';

vi.mock('@iconify/vue', () => ({ Icon: { props: ['icon'], template: '<span :data-icon="icon" />' } }));

const NODE = 'http://127.0.0.1:29695';

beforeEach(() => {
  setActivePinia(createPinia());
  resetAvatarObjectUrlsForTests();
  useWindowNodeContextStore().initializeFromWindowContext({ windowId: 1, entryId: 'embedded-local' }, NODE);
});
afterEach(() => resetAvatarObjectUrlsForTests());

// autobyteus-669 W-1 (REQ-003, REQ-004, REQ-007): one avatar for an agent, team or org; the picture in the caller's slot.
describe('DefinitionAvatar', () => {
  it('shows the definition\'s picture in the slot the caller sized, against the bound node', () => {
    const wrapper = mount(DefinitionAvatar, {
      props: { kind: 'agent', name: 'Writer', avatarUrl: '/rest/definition-avatars/agent/writer?v=1' },
      attrs: { class: 'h-8 w-8 rounded-full' },
    });
    const root = wrapper.get('[data-test="definition-avatar"]');
    expect(root.classes()).toEqual(expect.arrayContaining(['h-8', 'w-8', 'rounded-full', 'overflow-hidden']));
    expect(root.attributes('data-avatar-state')).toBe('picture');
    const image = wrapper.get('[data-test="definition-avatar-image"]');
    expect(image.attributes('src')).toBe(`${NODE}/rest/definition-avatars/agent/writer?v=1`);
    expect(image.attributes('alt')).toBe('Writer avatar');
    expect(image.classes()).toEqual(expect.arrayContaining(['h-full', 'w-full', 'object-cover']));
  });

  it.each([
    ['agent', 'Lead Writer', '[data-test="definition-avatar-initials"]', 'LW'],
    ['team', 'Crew', '[data-icon="heroicons:user-group-20-solid"]', ''],
    ['org', 'Studio', '[data-icon="heroicons:building-office-2-20-solid"]', ''],
  ] as const)('a %s with no picture shows its fallback', (kind, name, selector, text) => {
    const wrapper = mount(DefinitionAvatar, { props: { kind, name, avatarUrl: null } });
    expect(wrapper.get('[data-test="definition-avatar"]').attributes('data-avatar-state')).toBe('fallback');
    expect(wrapper.get(selector).text()).toBe(text);
    expect(wrapper.find('img').exists()).toBe(false);
  });

  it('a picture that cannot be shown falls back, and a late error of a replaced one changes nothing', async () => {
    const wrapper = mount(DefinitionAvatar, { props: { kind: 'team', name: 'Crew', avatarUrl: '/old.png' } });
    const old = wrapper.get('img');
    await wrapper.setProps({ avatarUrl: '/new.png' });
    await old.trigger('error');
    expect(wrapper.get('img').attributes('src')).toBe('/new.png');
    await wrapper.get('img').trigger('error');
    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.find('[data-icon="heroicons:user-group-20-solid"]').exists()).toBe(true);
  });

  it('a caller\'s own fallback replaces the default', () => {
    const wrapper = mount(DefinitionAvatar, {
      props: { kind: 'agent', name: 'Writer' },
      slots: { fallback: '<span data-test="own-fallback">W</span>' },
    });
    expect(wrapper.get('[data-test="own-fallback"]').text()).toBe('W');
  });
});
