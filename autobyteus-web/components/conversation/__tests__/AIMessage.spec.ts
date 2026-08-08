import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import AIMessage from '~/components/conversation/AIMessage.vue';
import type { AIMessage as AIMessageType } from '~/types/conversation';
import { setStreamSegmentIdentity } from '~/services/agentStreaming/handlers/segmentIdentity';

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
        runId: 'agent-1',
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
        runId: 'agent-1',
        agentName: 'Slide Narrator',
        messageIndex: 0,
      },
      global: { stubs: globalStubs },
    });

    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.text()).toContain('SN');
  });

  it('dispatches system task notification segments to the notification component', () => {
    const notificationSegment = {
      type: 'system_task_notification' as const,
      senderId: 'system_task_runner',
      content: 'You have a new task.',
    };
    const messageWithNotificationSegment: AIMessageType = {
      ...baseMessage,
      segments: [notificationSegment],
    };

    const wrapper = mount(AIMessage, {
      props: {
        message: messageWithNotificationSegment,
        runId: 'agent-1',
        agentName: 'Reflective Storyteller',
        messageIndex: 0,
      },
      global: {
        stubs: {
          ...globalStubs,
          SystemTaskNotificationSegment: {
            name: 'SystemTaskNotificationSegment',
            props: ['segment'],
            template: '<div data-test="system-task-notification-stub">{{ segment.content }}</div>',
          },
        },
      },
    });

    const systemTaskNotificationSegment = wrapper.getComponent({ name: 'SystemTaskNotificationSegment' });
    expect(systemTaskNotificationSegment.props('segment')).toEqual(notificationSegment);
    expect(wrapper.get('[data-test="system-task-notification-stub"]').text()).toBe('You have a new task.');
  });

  it('passes sender display name to inter-agent segment when mapping exists', () => {
    const messageWithInterAgentSegment: AIMessageType = {
      ...baseMessage,
      segments: [
        {
          type: 'inter_agent_message',
          senderAgentRunId: 'member_abc123',
          recipientRoleName: 'Student',
          messageType: 'task_assignment',
          content: 'hello',
        },
      ],
    };

    const wrapper = mount(AIMessage, {
      props: {
        message: messageWithInterAgentSegment,
        runId: 'agent-1',
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

  it('keeps identified active text on the live presentation path', () => {
    const textSegment = { type: 'text' as const, content: '**still streaming**' };
    setStreamSegmentIdentity(textSegment, 'text-1', 'text');
    const wrapper = mount(AIMessage, {
      props: {
        message: { ...baseMessage, isComplete: false, segments: [textSegment] },
        runId: 'agent-1',
        messageIndex: 0,
      },
      global: { stubs: globalStubs },
    });

    expect(wrapper.getComponent({ name: 'TextSegment' }).props('presentationComplete')).toBe(false);
  });

  it('treats message-complete and historical text as rich-presentation eligible', () => {
    const identifiedText = { type: 'text' as const, content: 'complete' };
    setStreamSegmentIdentity(identifiedText, 'text-1', 'text');
    const historicalText = { type: 'text' as const, content: 'history' };
    const wrapper = mount(AIMessage, {
      props: {
        message: { ...baseMessage, isComplete: true, segments: [identifiedText, historicalText] },
        runId: 'agent-1',
        messageIndex: 0,
      },
      global: { stubs: globalStubs },
    });

    expect(wrapper.findAllComponents({ name: 'TextSegment' }).map((segment) =>
      segment.props('presentationComplete'))).toEqual([true, true]);
  });
});
