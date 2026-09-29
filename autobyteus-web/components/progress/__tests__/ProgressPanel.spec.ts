import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import ProgressPanel from '../ProgressPanel.vue';

const sectionStub = (name: string) => defineComponent({
  name,
  props: { collapsed: Boolean },
  emits: ['toggle'],
  setup: (props, { emit }) => () => h('button', {
    'data-section': name,
    'data-collapsed': String(props.collapsed),
    onClick: () => emit('toggle'),
  }, name),
});

const mountPanel = () => mount(ProgressPanel, {
  global: { stubs: { BackgroundTaskPanel: sectionStub('BackgroundTaskPanel'), ActivityFeed: sectionStub('ActivityFeed') } },
});
const collapsed = (wrapper: ReturnType<typeof mountPanel>, name: string) =>
  wrapper.get(`[data-section="${name}"]`).attributes('data-collapsed');

describe('ProgressPanel', () => {
  it('shows Background Tasks above Activity with Activity expanded by default (AC-001, AC-002)', () => {
    const wrapper = mountPanel();

    expect(wrapper.findAll('[data-section]').map((section) => section.attributes('data-section')))
      .toEqual(['BackgroundTaskPanel', 'ActivityFeed']);
    expect(collapsed(wrapper, 'BackgroundTaskPanel')).toBe('true');
    expect(collapsed(wrapper, 'ActivityFeed')).toBe('false');
    expect(wrapper.text()).not.toMatch(/todo/i);
  });

  it('keeps the accordion interplay: expanding one section collapses the other, and toggling again collapses both', async () => {
    const wrapper = mountPanel();

    await wrapper.get('[data-section="BackgroundTaskPanel"]').trigger('click');
    expect(collapsed(wrapper, 'BackgroundTaskPanel')).toBe('false');
    expect(collapsed(wrapper, 'ActivityFeed')).toBe('true');

    await wrapper.get('[data-section="BackgroundTaskPanel"]').trigger('click');
    expect(collapsed(wrapper, 'BackgroundTaskPanel')).toBe('true');
    expect(collapsed(wrapper, 'ActivityFeed')).toBe('true');
  });
});
