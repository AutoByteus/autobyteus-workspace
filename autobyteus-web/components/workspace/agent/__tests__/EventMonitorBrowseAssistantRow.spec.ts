import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import EventMonitorBrowseAssistantRow from '../EventMonitorBrowseAssistantRow.vue';

const DisclosureStub = defineComponent({
  props: { content: { type: String, required: true } },
  data: () => ({ open: false }),
  render() {
    return h('button', { onClick: () => { this.open = !this.open; } }, `${this.content}:${this.open ? 'open' : 'closed'}`);
  },
});

describe('EventMonitorBrowseAssistantRow', () => {
  it('uses carried visual IDs as actual Vue keys so equal-content disclosure state stays with its source visual', async () => {
    const first = { kind: 'thinking' as const, visualId: 'v1', content: 'same' };
    const second = { kind: 'thinking' as const, visualId: 'v2', content: 'same' };
    const wrapper = mount(EventMonitorBrowseAssistantRow, {
      props: { visuals: [first, second] },
      global: {
        stubs: {
          ThinkSegment: DisclosureStub,
          TextSegment: true,
          ToolCallIndicator: true,
          MediaSegment: true,
        },
      },
    });
    await wrapper.get('[data-event-monitor-visual-key="v1"] button').trigger('click');
    await wrapper.setProps({
      visuals: [{ kind: 'thinking', visualId: 'v0', content: 'same' }, first, second],
    });
    expect(wrapper.get('[data-event-monitor-visual-key="v1"] button').text()).toBe('same:open');
    expect(wrapper.get('[data-event-monitor-visual-key="v2"] button').text()).toBe('same:closed');
  });
});
