import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import EventMonitorBrowseAssistantRow from '../EventMonitorBrowseAssistantRow.vue';
import { buildEventMonitorActiveTraceBrowsePresentation } from '~/services/eventMonitor/eventMonitorActiveTraceBrowsePresentation';

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

  it('renders a standalone child\'s earlier-events delivery as "From <Sender>:" (REQ-007, CR-002)', () => {
    const [item] = buildEventMonitorActiveTraceBrowsePresentation([{
      __typename: 'EventMonitorActiveTracePageEvent', eventId: 'e1', turnGroupId: 't1', occurredAtMs: 1,
      visuals: [{
        __typename: 'EventMonitorInterAgentVisual', kind: 'inter_agent', eventId: 'e1', visualId: 'v1', kindOrdinal: 0,
        senderAgentRunId: 'host-run', senderAddress: '/general_agent', attachments: [],
        text: 'You received a message from sender name: general_agent, sender address: /general_agent, sender id: host-run\nmessage:\nPlease provide a story.',
      }],
    }]);
    if (item?.kind !== 'assistant') throw new Error('expected an assistant block');
    const wrapper = mount(EventMonitorBrowseAssistantRow, {
      props: { visuals: item.visuals },
      global: { mocks: { $t: (key: string) => key }, stubs: { MarkdownRenderer: { props: ['content'], template: '<div class="md">{{ content }}</div>' } } },
    });
    expect(wrapper.get('[data-testid="inter-agent-inline"]').text()).toContain('From General Agent:');
    expect(wrapper.get('.md').text()).toBe('Please provide a story.');
    expect(wrapper.text()).not.toContain('You received a message');
  });
});

