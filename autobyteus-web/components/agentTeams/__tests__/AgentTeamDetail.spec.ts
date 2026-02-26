import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import AgentTeamDetail from '../AgentTeamDetail.vue';
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';

const AgentDeleteConfirmDialogStub = {
  name: 'AgentDeleteConfirmDialog',
  template: '<div class="agent-delete-confirm-dialog-stub"></div>',
  props: ['show', 'itemName', 'itemType', 'title', 'confirmText'],
  emits: ['confirm', 'cancel'],
};

function setRouterMock(): void {
  vi.stubGlobal('useRouter', () => ({
    push: vi.fn(),
  }));
}

async function mountComponent(options?: { memberAvatarUrl?: string | null }) {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: true,
  });
  setActivePinia(pinia);

  const teamStore = useAgentTeamDefinitionStore();
  teamStore.agentTeamDefinitions = [
    {
      id: 'team-1',
      name: 'SuperTeam',
      description: 'A team with one coordinator',
      role: 'Coordinator team',
      avatarUrl: null,
      coordinatorMemberName: 'superagent',
      nodes: [
        {
          memberName: 'superagent',
          referenceId: 'agent-1',
          referenceType: 'AGENT',
        },
      ],
    },
  ] as any;

  const agentStore = useAgentDefinitionStore();
  agentStore.agentDefinitions = [
    {
      id: 'agent-1',
      name: 'SuperAgent',
      role: 'Coordinator',
      description: 'Lead coordinator',
      avatarUrl: options?.memberAvatarUrl ?? null,
      toolNames: [],
      inputProcessorNames: [],
      llmResponseProcessorNames: [],
      systemPromptProcessorNames: [],
      toolExecutionResultProcessorNames: [],
      toolInvocationPreprocessorNames: [],
      lifecycleProcessorNames: [],
      skillNames: [],
      prompts: [],
    },
  ] as any;

  const wrapper = mount(AgentTeamDetail, {
    props: {
      teamDefinitionId: 'team-1',
    },
    global: {
      plugins: [pinia],
      stubs: {
        AgentDeleteConfirmDialog: AgentDeleteConfirmDialogStub,
      },
    },
  });

  await wrapper.vm.$nextTick();
  await Promise.resolve();
  await wrapper.vm.$nextTick();
  return wrapper;
}

describe('AgentTeamDetail', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setRouterMock();
  });

  it('renders member avatar when referenced agent has avatarUrl', async () => {
    const wrapper = await mountComponent({
      memberAvatarUrl: 'https://example.com/superagent.png',
    });

    const memberAvatar = wrapper.find('img[alt="superagent avatar"]');
    expect(memberAvatar.exists()).toBe(true);
    expect(memberAvatar.attributes('src')).toBe('https://example.com/superagent.png');
  });

  it('falls back to member initials when referenced agent has no avatar', async () => {
    const wrapper = await mountComponent({
      memberAvatarUrl: null,
    });

    const memberAvatar = wrapper.find('img[alt="superagent avatar"]');
    expect(memberAvatar.exists()).toBe(false);

    const memberInitials = wrapper.find('article .h-9.w-9 span');
    expect(memberInitials.exists()).toBe(true);
    expect(memberInitials.text()).toBe('SU');
  });
});
