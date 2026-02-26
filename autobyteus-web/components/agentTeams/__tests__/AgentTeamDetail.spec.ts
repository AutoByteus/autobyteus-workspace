import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import AgentTeamDetail from '../AgentTeamDetail.vue';
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useFederatedCatalogStore } from '~/stores/federatedCatalogStore';
import { useNodeStore } from '~/stores/nodeStore';

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

async function mountComponent(options?: {
  memberAvatarUrl?: string | null;
  memberHomeNodeId?: string;
  memberDefinitionName?: string;
  federatedAgentName?: string | null;
  remoteNodeName?: string;
}) {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: true,
  });
  setActivePinia(pinia);

  const teamStore = useAgentTeamDefinitionStore();
  (teamStore.fetchAllAgentTeamDefinitions as any).mockResolvedValue(undefined);
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
          homeNodeId: options?.memberHomeNodeId ?? 'embedded-local',
        },
      ],
    },
  ] as any;

  const agentStore = useAgentDefinitionStore();
  (agentStore.fetchAllAgentDefinitions as any).mockResolvedValue(undefined);
  agentStore.agentDefinitions = [
    {
      id: 'agent-1',
      name: options?.memberDefinitionName ?? 'SuperAgent',
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

  const federatedCatalogStore = useFederatedCatalogStore();
  (federatedCatalogStore.loadCatalog as any).mockResolvedValue(undefined);
  (federatedCatalogStore.findAgentByNodeAndId as any).mockImplementation((homeNodeId: string, definitionId: string) => {
    if (
      options?.federatedAgentName &&
      homeNodeId === (options.memberHomeNodeId ?? 'embedded-local') &&
      definitionId === 'agent-1'
    ) {
      return {
        homeNodeId,
        definitionId,
        name: options.federatedAgentName,
        role: 'Remote role',
        description: 'Remote description',
      };
    }
    return null;
  });

  const nodeStore = useNodeStore();
  (nodeStore.initializeRegistry as any).mockResolvedValue(undefined);
  vi.spyOn(nodeStore, 'getNodeById').mockImplementation((nodeId: string) => {
    if (nodeId === 'embedded-local') {
      return {
        id: 'embedded-local',
        name: 'Embedded Node',
      } as any;
    }
    if (nodeId === (options?.memberHomeNodeId ?? 'node-docker-8001')) {
      return {
        id: nodeId,
        name: options?.remoteNodeName ?? 'Docker 8001',
      } as any;
    }
    return null;
  });

  const wrapper = mount(AgentTeamDetail, {
    props: {
      teamId: 'team-1',
    },
    global: {
      plugins: [pinia],
      stubs: {
        AgentDeleteConfirmDialog: AgentDeleteConfirmDialogStub,
      },
    },
  });

  await flushPromises();
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

  it('shows embedded member source node label', async () => {
    const wrapper = await mountComponent({
      memberHomeNodeId: 'embedded-local',
    });

    expect(wrapper.text()).toContain('Node: Embedded Node');
  });

  it('shows remote member source node label', async () => {
    const wrapper = await mountComponent({
      memberHomeNodeId: 'node-docker-8001',
      remoteNodeName: 'Docker 8001',
      federatedAgentName: 'Student',
    });

    expect(wrapper.text()).toContain('Node: Docker 8001');
  });

  it('prefers federated member name for remote members over local id-colliding definition name', async () => {
    const wrapper = await mountComponent({
      memberHomeNodeId: 'node-docker-8001',
      memberDefinitionName: 'Reflective Storyteller',
      federatedAgentName: 'Student',
    });

    expect(wrapper.text()).toContain('Blueprint: Student');
    expect(wrapper.text()).not.toContain('Blueprint: Reflective Storyteller');
  });
});
