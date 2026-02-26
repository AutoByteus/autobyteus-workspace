import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import InterAgentMessageSegment from '../InterAgentMessageSegment.vue';

describe('InterAgentMessageSegment', () => {
  const baseSegment = {
    type: 'inter_agent_message' as const,
    senderAgentId: 'professor_Professor_6151',
    recipientRoleName: 'Student',
    messageType: 'task_assignment',
    content: 'hello',
  };

  it('renders compact sender + content and hides metadata by default', () => {
    const wrapper = mount(InterAgentMessageSegment, {
      props: {
        segment: baseSegment,
      },
    });

    expect(wrapper.text()).toContain('From Professor');
    expect(wrapper.text()).toContain('hello');
    expect(wrapper.text()).not.toContain('Intended role: Student');
    expect(wrapper.find('[data-testid="inter-agent-details"]').exists()).toBe(false);
  });

  it('prefers mapped sender display name over raw member id', () => {
    const wrapper = mount(InterAgentMessageSegment, {
      props: {
        segment: {
          ...baseSegment,
          senderAgentId: 'member_6c6718851d8069a3',
        },
        senderDisplayName: 'professor',
      },
    });

    expect(wrapper.text()).toContain('From Professor');
    expect(wrapper.text()).not.toContain('member_6c6718851d8069a3');
  });

  it('uses teammate fallback for machine sender ids when no name mapping exists', () => {
    const wrapper = mount(InterAgentMessageSegment, {
      props: {
        segment: {
          ...baseSegment,
          senderAgentId: 'member_6c6718851d8069a3',
        },
      },
    });

    expect(wrapper.text()).toContain('From Teammate');
    expect(wrapper.text()).not.toContain('member_6c6718851d8069a3');
  });

  it('keeps metadata in title tooltip only', () => {
    const wrapper = mount(InterAgentMessageSegment, {
      props: {
        segment: baseSegment,
      },
    });

    const inlineRow = wrapper.get('[data-testid="inter-agent-inline"]');
    expect(inlineRow.attributes('title')).toContain('task_assignment');
    expect(inlineRow.attributes('title')).toContain('Intended role: Student');
  });

  it('renders chevron toggle with collapsed state by default', () => {
    const wrapper = mount(InterAgentMessageSegment, {
      props: {
        segment: baseSegment,
      },
    });

    const toggle = wrapper.get('[data-testid="inter-agent-toggle"]');
    expect(toggle.attributes('aria-expanded')).toBe('false');
    expect(wrapper.find('[data-testid="inter-agent-details"]').exists()).toBe(false);
  });
});
