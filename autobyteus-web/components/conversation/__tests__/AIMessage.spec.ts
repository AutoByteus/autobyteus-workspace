import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import AIMessage from '~/components/conversation/AIMessage.vue';
import type { AIMessage as AIMessageType } from '~/types/conversation';

const baseMessage: AIMessageType = {
  type: 'ai',
  text: 'hello',
  timestamp: new Date('2026-02-10T10:00:00.000Z'),
  segments: [],
  isComplete: true,
};

const globalStubs = {
  TextSegment: true,
  WriteFileCommandSegment: true,
  EditFileCommandSegment: true,
  TerminalCommandSegment: true,
  ThinkSegment: true,
  ToolCallSegment: true,
  SystemTaskNotificationSegment: true,
  InterAgentMessageSegment: true,
  MediaSegment: true,
  ErrorSegment: true,
};

describe('AIMessage.vue', () => {
  it('renders agent avatar image when URL is provided', () => {
    const wrapper = mount(AIMessage, {
      props: {
        message: baseMessage,
        agentId: 'agent-1',
        agentName: 'Reflective Storyteller',
        agentAvatarUrl: 'https://example.com/agent.png',
        messageIndex: 0,
      },
      global: { stubs: globalStubs },
    });

    const avatar = wrapper.find('img');
    expect(avatar.exists()).toBe(true);
    expect(avatar.attributes('src')).toBe('https://example.com/agent.png');
    expect(avatar.attributes('alt')).toBe('Reflective Storyteller avatar');
  });

  it('renders initials fallback when avatar URL is missing', () => {
    const wrapper = mount(AIMessage, {
      props: {
        message: baseMessage,
        agentId: 'agent-1',
        agentName: 'Slide Narrator',
        messageIndex: 0,
      },
      global: { stubs: globalStubs },
    });

    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.text()).toContain('SN');
  });

  it('passes sender display name to inter-agent segment when mapping exists', () => {
    const messageWithInterAgentSegment: AIMessageType = {
      ...baseMessage,
      segments: [
        {
          type: 'inter_agent_message',
          senderAgentId: 'member_abc123',
          recipientRoleName: 'Student',
          messageType: 'task_assignment',
          content: 'hello',
        },
      ],
    };

    const wrapper = mount(AIMessage, {
      props: {
        message: messageWithInterAgentSegment,
        agentId: 'agent-1',
        agentName: 'Reflective Storyteller',
        interAgentSenderNameById: {
          member_abc123: 'Professor',
        },
        messageIndex: 0,
      },
      global: {
        stubs: {
          ...globalStubs,
          InterAgentMessageSegment: {
            name: 'InterAgentMessageSegment',
            props: ['segment', 'senderDisplayName'],
            template: '<div data-test=\"inter-agent-stub\">{{ senderDisplayName }}</div>',
          },
        },
      },
    });

    const interAgentSegment = wrapper.getComponent({ name: 'InterAgentMessageSegment' });
    expect(interAgentSegment.props('senderDisplayName')).toBe('Professor');
  });
});
