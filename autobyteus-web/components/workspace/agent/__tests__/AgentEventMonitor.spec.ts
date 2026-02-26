import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, shallowMount } from '@vue/test-utils';
import AgentEventMonitor from '../AgentEventMonitor.vue';
import type { Conversation } from '~/types/conversation';

const conversation: Conversation = {
  id: 'agent-42',
  createdAt: '2026-02-10T00:00:00.000Z',
  updatedAt: '2026-02-10T00:00:30.000Z',
  messages: [
    {
      type: 'user',
      text: 'Please write a summary.',
      timestamp: new Date('2026-02-10T00:00:01.000Z'),
      promptTokens: 10,
      promptCost: 0.1,
    },
    {
      type: 'ai',
      text: 'Sure, here is the summary.',
      timestamp: new Date('2026-02-10T00:00:02.000Z'),
      segments: [],
      isComplete: true,
      completionTokens: 20,
      completionCost: 0.2,
    },
  ],
};

describe('AgentEventMonitor.vue', () => {
  it('passes avatar/name context into AIMessage and user label into UserMessage', () => {
    const wrapper = shallowMount(AgentEventMonitor, {
      props: {
        conversation,
        agentName: 'Slide Narrator',
        agentAvatarUrl: 'https://example.com/slide-narrator.png',
        interAgentSenderNameById: {
          'member-1': 'Professor',
        },
      },
      global: {
        stubs: {
          AgentUserInputForm: { template: '<div class="agent-input-stub" />' },
          'agent-user-input-form': { template: '<div class="agent-input-stub" />' },
          UserMessage: {
            name: 'UserMessage',
            props: ['message', 'userDisplayName', 'userAvatarUrl'],
            template: '<div class="user-message-stub">{{ userDisplayName }}</div>',
          },
          AIMessage: {
            name: 'AIMessage',
            props: ['message', 'agentId', 'agentName', 'agentAvatarUrl', 'interAgentSenderNameById', 'messageIndex'],
            template: '<div class="ai-message-stub">{{ agentName }}</div>',
          },
        },
      },
    });

    const user = wrapper.findComponent({ name: 'UserMessage' });
    expect(user.exists()).toBe(true);
    expect(user.props('userDisplayName')).toBe('You');

    const ai = wrapper.findComponent({ name: 'AIMessage' });
    expect(ai.exists()).toBe(true);
    expect(ai.props('agentId')).toBe('agent-42');
    expect(ai.props('agentName')).toBe('Slide Narrator');
    expect(ai.props('agentAvatarUrl')).toBe('https://example.com/slide-narrator.png');
    expect(ai.props('interAgentSenderNameById')).toEqual({ 'member-1': 'Professor' });
    expect(ai.props('messageIndex')).toBe(1);
  });

  it('shows aggregated token usage in the footer', () => {
    const wrapper = shallowMount(AgentEventMonitor, {
      props: {
        conversation,
      },
      global: {
        stubs: {
          AgentUserInputForm: { template: '<div class="agent-input-stub" />' },
          'agent-user-input-form': { template: '<div class="agent-input-stub" />' },
          UserMessage: true,
          AIMessage: true,
        },
      },
    });

    expect(wrapper.text()).toContain('Total: 30 tokens / $0.3000');
  });

  it('auto-scrolls to bottom on streaming updates when user is near bottom', async () => {
    const wrapper = mount(AgentEventMonitor, {
      attachTo: document.body,
      props: {
        conversation: { ...conversation },
      },
      global: {
        stubs: {
          AgentUserInputForm: { template: '<div class="agent-input-stub" />' },
          'agent-user-input-form': { template: '<div class="agent-input-stub" />' },
          UserMessage: true,
          AIMessage: true,
        },
      },
    });

    const scrollContainer = wrapper.find('.overflow-y-auto');
    expect(scrollContainer.exists()).toBe(true);
    const el = scrollContainer.element as HTMLElement;

    let scrollTopValue = 590; // 10px from bottom
    const scrollTopSetter = vi.fn((value: number) => {
      scrollTopValue = value;
    });
    Object.defineProperty(el, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(el, 'clientHeight', { value: 400, configurable: true });
    Object.defineProperty(el, 'scrollTop', {
      configurable: true,
      get: () => scrollTopValue,
      set: scrollTopSetter,
    });
    await scrollContainer.trigger('scroll');
    scrollTopSetter.mockClear();

    await wrapper.setProps({
      conversation: {
        ...conversation,
        messages: [
          ...conversation.messages,
          {
            type: 'ai',
            text: 'Streaming delta',
            timestamp: new Date('2026-02-10T00:00:03.000Z'),
            segments: [],
            isComplete: false,
          },
        ],
        updatedAt: '2026-02-10T00:00:31.000Z',
      },
    });
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    await flushPromises();

    expect(scrollTopSetter).toHaveBeenCalledWith(1000);
    wrapper.unmount();
  });

  it('does not auto-scroll on streaming updates when user has scrolled away from bottom', async () => {
    const wrapper = mount(AgentEventMonitor, {
      attachTo: document.body,
      props: {
        conversation: { ...conversation },
      },
      global: {
        stubs: {
          AgentUserInputForm: { template: '<div class="agent-input-stub" />' },
          'agent-user-input-form': { template: '<div class="agent-input-stub" />' },
          UserMessage: true,
          AIMessage: true,
        },
      },
    });

    const scrollContainer = wrapper.find('.overflow-y-auto');
    expect(scrollContainer.exists()).toBe(true);
    const el = scrollContainer.element as HTMLElement;

    let scrollTopValue = 120; // far from bottom
    const scrollTopSetter = vi.fn((value: number) => {
      scrollTopValue = value;
    });
    Object.defineProperty(el, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(el, 'clientHeight', { value: 400, configurable: true });
    Object.defineProperty(el, 'scrollTop', {
      configurable: true,
      get: () => scrollTopValue,
      set: scrollTopSetter,
    });
    await scrollContainer.trigger('scroll');
    scrollTopSetter.mockClear();

    await wrapper.setProps({
      conversation: {
        ...conversation,
        messages: [
          ...conversation.messages,
          {
            type: 'ai',
            text: 'Streaming delta',
            timestamp: new Date('2026-02-10T00:00:04.000Z'),
            segments: [],
            isComplete: false,
          },
        ],
        updatedAt: '2026-02-10T00:00:32.000Z',
      },
    });
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();
    await flushPromises();

    expect(scrollTopSetter).not.toHaveBeenCalled();
    wrapper.unmount();
  });
});
