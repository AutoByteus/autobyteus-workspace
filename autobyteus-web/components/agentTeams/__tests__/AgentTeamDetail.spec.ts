import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import AgentTeamDetail from '../AgentTeamDetail.vue';
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { buildTeamLocalAgentDefinitionId } from '~/utils/teamLocalAgentDefinitionId';

const { mockApolloClient, routerPushMock } = vi.hoisted(() => ({
  mockApolloClient: {
    mutate: vi.fn(),
  },
  routerPushMock: vi.fn(),
}));

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: () => mockApolloClient,
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: routerPushMock,
  }),
}));

const AgentDefinitionFormStub = {
  name: 'AgentDefinitionForm',
  template: `
    <form data-test="team-local-agent-form" @submit.prevent="$emit('submit', submittedPayload)">
      <button type="submit" data-test="stub-save-agent">Save</button>
      <button type="button" data-test="stub-cancel-agent" @click="$emit('cancel')">Cancel</button>
    </form>
  `,
  props: ['initialData', 'isCreateMode', 'isSubmitting', 'submitButtonText', 'variant'],
  emits: ['submit', 'cancel'],
  data() {
    return {
      submittedPayload: {
        name: 'Updated Local Agent',
        role: 'Updated Role',
        description: 'Updated local description',
        instructions: 'Updated local instructions',
        category: 'updated-category',
        avatarUrl: null,
        toolNames: ['updated-tool'],
        skillNames: ['updated-skill'],
        inputProcessorNames: [],
        llmResponseProcessorNames: [],
        systemPromptProcessorNames: [],
        toolExecutionResultProcessorNames: [],
        toolInvocationPreprocessorNames: [],
        lifecycleProcessorNames: [],
        defaultLaunchConfig: null,
      },
    };
  },
};

const AgentDeleteConfirmDialogStub = {
  name: 'AgentDeleteConfirmDialog',
  template: '<div class="agent-delete-confirm-dialog-stub"></div>',
  props: ['show', 'itemName', 'itemType', 'title', 'confirmText'],
  emits: ['confirm', 'cancel'],
};

function setRouterMock(): void {
  vi.stubGlobal('useRouter', () => ({
    push: routerPushMock,
  }));
}

const flushMeasurement = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

const setInstructionOverflow = async (
  wrapper: ReturnType<typeof mount>,
  scrollHeight: number,
  width = 1024,
): Promise<void> => {
  Object.defineProperty(window, 'innerWidth', {
    value: width,
    configurable: true,
  });

  const viewport = wrapper.get('[data-test="instruction-viewport"]').element as HTMLElement;
  Object.defineProperty(viewport, 'scrollHeight', {
    value: scrollHeight,
    configurable: true,
  });

  window.dispatchEvent(new Event('resize'));
  await flushMeasurement();
};

async function mountComponent(options?: { memberAvatarUrl?: string | null; nodes?: any[]; agentDefinitions?: any[] }) {
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
      instructions: 'Coordinate tasks among members.',
      category: 'coordination',
      avatarUrl: null,
      coordinatorMemberName: 'superagent',
      nodes: options?.nodes ?? [
        {
          memberName: 'superagent',
          ref: 'agent-1',
          refType: 'AGENT',
        },
      ],
    },
  ] as any;

  const agentStore = useAgentDefinitionStore();
  agentStore.agentDefinitions = options?.agentDefinitions ?? [
    {
      id: 'agent-1',
      name: 'SuperAgent',
      role: 'Coordinator',
      description: 'Lead coordinator',
      instructions: 'Lead and delegate work.',
      category: 'coordination',
      avatarUrl: options?.memberAvatarUrl ?? null,
      toolNames: [],
      inputProcessorNames: [],
      llmResponseProcessorNames: [],
      systemPromptProcessorNames: [],
      toolExecutionResultProcessorNames: [],
      toolInvocationPreprocessorNames: [],
      lifecycleProcessorNames: [],
      skillNames: [],
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
        AgentDefinitionForm: AgentDefinitionFormStub,
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
    mockApolloClient.mutate.mockReset();
    routerPushMock.mockReset();
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

    const memberInitials = wrapper.find('article .h-10.w-10 span');
    expect(memberInitials.exists()).toBe(true);
    expect(memberInitials.text()).toBe('SU');
  });

  it('shows the chevron toggle when team instructions overflow', async () => {
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
        instructions: 'Coordinate tasks among members.\n'.repeat(60),
        category: 'coordination',
        avatarUrl: null,
        coordinatorMemberName: 'superagent',
        nodes: [
          {
            memberName: 'superagent',
            ref: 'agent-1',
            refType: 'AGENT',
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
        instructions: 'Lead and delegate work.',
        category: 'coordination',
        avatarUrl: null,
        toolNames: [],
        inputProcessorNames: [],
        llmResponseProcessorNames: [],
        systemPromptProcessorNames: [],
        toolExecutionResultProcessorNames: [],
        toolInvocationPreprocessorNames: [],
        lifecycleProcessorNames: [],
        skillNames: [],
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
    await flushMeasurement();
    await setInstructionOverflow(wrapper, 700);

    const toggle = wrapper.get('[data-test="instruction-toggle"]');
    expect(toggle.attributes('aria-expanded')).toBe('false');

    await toggle.trigger('click');
    await flushMeasurement();

    expect(wrapper.get('[data-test="instruction-toggle"]').attributes('aria-expanded')).toBe('true');
  });

  it('expands a team-local member and renders canonical agent details in team context', async () => {
    const localAgentId = buildTeamLocalAgentDefinitionId('team-1', 'local-planner');
    const wrapper = await mountComponent({
      nodes: [
        {
          memberName: 'planner_member',
          ref: 'local-planner',
          refType: 'AGENT',
          refScope: 'TEAM_LOCAL',
        },
      ],
      agentDefinitions: [
        {
          id: localAgentId,
          name: 'Local Planner',
          role: 'Planning specialist',
          description: 'Plans team-local work.',
          instructions: 'Plan only inside this team.',
          category: 'planning',
          avatarUrl: null,
          toolNames: ['team-tool'],
          inputProcessorNames: ['input-sanitizer'],
          llmResponseProcessorNames: ['response-polisher'],
          systemPromptProcessorNames: [],
          toolExecutionResultProcessorNames: [],
          toolInvocationPreprocessorNames: [],
          lifecycleProcessorNames: ['lifecycle-auditor'],
          skillNames: ['team-skill'],
          ownershipScope: 'TEAM_LOCAL',
          defaultLaunchConfig: {
            runtimeKind: 'codex_app_server',
            llmModelIdentifier: 'gpt-5.4',
            llmConfig: { reasoning_effort: 'medium' },
          },
        },
      ],
    });

    const toggle = wrapper.get('[data-test="team-local-expand-toggle"]');
    expect(toggle.attributes('aria-expanded')).toBe('false');
    expect(toggle.text()).toContain('Details');

    await toggle.trigger('click');

    const expandedToggle = wrapper.get('[data-test="team-local-expand-toggle"]');
    expect(expandedToggle.attributes('aria-expanded')).toBe('true');
    expect(expandedToggle.text()).toContain('Hide');
    expect(wrapper.text()).toContain('Local Planner');
    expect(wrapper.text()).toContain('Planning specialist');
    expect(wrapper.text()).toContain('Plans team-local work.');
    expect(wrapper.text()).toContain('Plan only inside this team.');
    expect(wrapper.text()).toContain('planning');
    expect(wrapper.text()).toContain('codex_app_server');
    expect(wrapper.text()).toContain('gpt-5.4');
    expect(wrapper.text()).toContain('team-tool');
    expect(wrapper.text()).toContain('team-skill');
    expect(wrapper.text()).toContain('input-sanitizer');
    expect(wrapper.text()).toContain('response-polisher');
    expect(wrapper.text()).toContain('lifecycle-auditor');
    expect(wrapper.get('[data-test="team-local-edit-button"]').text()).toBe('Edit');
  });

  it('shows an unresolved state instead of edit controls when a team-local definition is missing', async () => {
    const wrapper = await mountComponent({
      nodes: [
        {
          memberName: 'missing_member',
          ref: 'missing-local',
          refType: 'AGENT',
          refScope: 'TEAM_LOCAL',
        },
      ],
      agentDefinitions: [],
    });

    expect(wrapper.find('[data-test="team-local-unresolved-message"]').exists()).toBe(true);
    expect(wrapper.get('[data-test="team-local-unresolved-message"]').text().trim().length).toBeGreaterThan(0);
    expect(wrapper.find('[data-test="team-local-expand-toggle"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="team-local-edit-button"]').exists()).toBe(false);
  });

  it('persists inline edits through the real store mutation path and renders backend-returned values', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const localAgentId = buildTeamLocalAgentDefinitionId('team-1', 'local-planner');
    const teamStore = useAgentTeamDefinitionStore();
    (teamStore.fetchAllAgentTeamDefinitions as any) = vi.fn().mockResolvedValue(undefined);
    teamStore.agentTeamDefinitions = [
      {
        id: 'team-1',
        name: 'SuperTeam',
        description: 'A team with one coordinator',
        instructions: 'Coordinate tasks among members.',
        category: 'coordination',
        avatarUrl: null,
        coordinatorMemberName: 'planner_member',
        nodes: [
          {
            memberName: 'planner_member',
            ref: 'local-planner',
            refType: 'AGENT',
            refScope: 'TEAM_LOCAL',
          },
        ],
      },
    ] as any;

    const agentStore = useAgentDefinitionStore();
    (agentStore.fetchAllAgentDefinitions as any) = vi.fn().mockResolvedValue(undefined);
    agentStore.agentDefinitions = [
      {
        id: localAgentId,
        name: 'Local Planner',
        role: 'Planning specialist',
        description: 'Plans team-local work.',
        instructions: 'Plan only inside this team.',
        category: 'planning',
        avatarUrl: null,
        toolNames: [],
        inputProcessorNames: [],
        llmResponseProcessorNames: [],
        systemPromptProcessorNames: [],
        toolExecutionResultProcessorNames: [],
        toolInvocationPreprocessorNames: [],
        lifecycleProcessorNames: [],
        skillNames: [],
        ownershipScope: 'TEAM_LOCAL',
      },
    ] as any;
    mockApolloClient.mutate.mockResolvedValue({
      data: {
        updateAgentDefinition: {
          id: localAgentId,
          name: 'Backend Local Planner',
          role: 'Backend role',
          description: 'Backend persisted local description.',
          instructions: 'Backend persisted local instructions.',
          category: 'backend-planning',
          toolNames: ['backend-tool'],
          skillNames: ['backend-skill'],
        },
      },
      errors: [],
    });

    const wrapper = mount(AgentTeamDetail, {
      props: {
        teamDefinitionId: 'team-1',
      },
      global: {
        plugins: [pinia],
        stubs: {
          AgentDeleteConfirmDialog: AgentDeleteConfirmDialogStub,
          AgentDefinitionForm: AgentDefinitionFormStub,
        },
      },
    });

    await wrapper.vm.$nextTick();
    await flushMeasurement();
    await wrapper.vm.$nextTick();
    await wrapper.get('[data-test="team-local-expand-toggle"]').trigger('click');
    await wrapper.get('[data-test="team-local-edit-button"]').trigger('click');
    await wrapper.get('[data-test="team-local-agent-form"]').trigger('submit');
    await flushMeasurement();
    await wrapper.vm.$nextTick();

    expect(mockApolloClient.mutate).toHaveBeenCalledWith(expect.objectContaining({
      variables: {
        input: expect.objectContaining({
          id: localAgentId,
          name: 'Updated Local Agent',
          description: 'Updated local description',
        }),
      },
    }));
    expect(agentStore.getAgentDefinitionById(localAgentId)).toMatchObject({
      name: 'Backend Local Planner',
      description: 'Backend persisted local description.',
      toolNames: ['backend-tool'],
      skillNames: ['backend-skill'],
    });
    expect(wrapper.find('[data-test="team-local-agent-form"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('Backend Local Planner');
    expect(wrapper.text()).toContain('Backend persisted local description.');
    expect(wrapper.text()).toContain('Backend persisted local instructions.');
    expect(wrapper.text()).toContain('backend-tool');
    expect(wrapper.text()).toContain('backend-skill');
  });

  it('saves team-local member edits through the canonical agent definition id', async () => {
    const localAgentId = buildTeamLocalAgentDefinitionId('team-1', 'local-planner');
    const wrapper = await mountComponent({
      nodes: [
        {
          memberName: 'planner_member',
          ref: 'local-planner',
          refType: 'AGENT',
          refScope: 'TEAM_LOCAL',
        },
      ],
      agentDefinitions: [
        {
          id: localAgentId,
          name: 'Local Planner',
          role: 'Planning specialist',
          description: 'Plans team-local work.',
          instructions: 'Plan only inside this team.',
          category: 'planning',
          avatarUrl: null,
          toolNames: [],
          inputProcessorNames: [],
          llmResponseProcessorNames: [],
          systemPromptProcessorNames: [],
          toolExecutionResultProcessorNames: [],
          toolInvocationPreprocessorNames: [],
          lifecycleProcessorNames: [],
          skillNames: [],
          ownershipScope: 'TEAM_LOCAL',
        },
      ],
    });
    const agentStore = useAgentDefinitionStore();
    (agentStore.updateAgentDefinition as any).mockResolvedValue({
      id: localAgentId,
      name: 'Updated Local Agent',
    });

    await wrapper.get('[data-test="team-local-expand-toggle"]').trigger('click');
    await wrapper.get('[data-test="team-local-edit-button"]').trigger('click');
    await wrapper.get('[data-test="team-local-agent-form"]').trigger('submit');
    await flushMeasurement();

    expect(agentStore.updateAgentDefinition).toHaveBeenCalledWith(expect.objectContaining({
      id: localAgentId,
      name: 'Updated Local Agent',
      description: 'Updated local description',
      toolNames: ['updated-tool'],
      skillNames: ['updated-skill'],
    }));
  });

  it('cancels team-local member edit without persisting draft changes', async () => {
    const localAgentId = buildTeamLocalAgentDefinitionId('team-1', 'local-planner');
    const wrapper = await mountComponent({
      nodes: [
        {
          memberName: 'planner_member',
          ref: 'local-planner',
          refType: 'AGENT',
          refScope: 'TEAM_LOCAL',
        },
      ],
      agentDefinitions: [
        {
          id: localAgentId,
          name: 'Local Planner',
          role: 'Planning specialist',
          description: 'Plans team-local work.',
          instructions: 'Plan only inside this team.',
          category: 'planning',
          avatarUrl: null,
          toolNames: [],
          inputProcessorNames: [],
          llmResponseProcessorNames: [],
          systemPromptProcessorNames: [],
          toolExecutionResultProcessorNames: [],
          toolInvocationPreprocessorNames: [],
          lifecycleProcessorNames: [],
          skillNames: [],
          ownershipScope: 'TEAM_LOCAL',
        },
      ],
    });
    const agentStore = useAgentDefinitionStore();

    await wrapper.get('[data-test="team-local-expand-toggle"]').trigger('click');
    await wrapper.get('[data-test="team-local-edit-button"]').trigger('click');
    expect(wrapper.find('[data-test="team-local-agent-form"]').exists()).toBe(true);

    await wrapper.get('[data-test="stub-cancel-agent"]').trigger('click');

    expect(agentStore.updateAgentDefinition).not.toHaveBeenCalled();
    expect(wrapper.find('[data-test="team-local-agent-form"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('Plans team-local work.');
  });

  it('routes shared agent members to Agent Detail with return context using a compact view action', async () => {
    const wrapper = await mountComponent({
      nodes: [
        {
          memberName: 'shared_member',
          ref: 'shared-agent',
          refType: 'AGENT',
          refScope: 'SHARED',
        },
      ],
      agentDefinitions: [
        {
          id: 'shared-agent',
          name: 'Shared Agent',
          description: 'Shared description',
          instructions: 'Shared instructions',
          toolNames: [],
          inputProcessorNames: [],
          llmResponseProcessorNames: [],
          systemPromptProcessorNames: [],
          toolExecutionResultProcessorNames: [],
          toolInvocationPreprocessorNames: [],
          lifecycleProcessorNames: [],
          skillNames: [],
          ownershipScope: 'SHARED',
        },
      ],
    });

    const viewAction = wrapper.get('[data-test="shared-agent-view-link"]');
    expect(viewAction.text()).toContain('View');

    await viewAction.trigger('click');

    expect(wrapper.emitted('navigate')).toEqual([[
      {
        target: 'agents',
        view: 'detail',
        id: 'shared-agent',
        returnToTeam: 'team-1',
      },
    ]]);
  });

  it('does not show shared agent view action or team-local controls when shared/global member definitions are unresolved', async () => {
    const wrapper = await mountComponent({
      nodes: [
        {
          memberName: 'missing_shared_member',
          ref: 'missing-shared-agent',
          refType: 'AGENT',
          refScope: 'SHARED',
        },
        {
          memberName: 'missing_global_member',
          ref: 'missing-global-agent',
          refType: 'AGENT',
        },
      ],
      agentDefinitions: [],
    });

    expect(wrapper.find('[data-test="shared-agent-view-link"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="team-local-expand-toggle"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="team-local-edit-button"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="team-local-unresolved-message"]').exists()).toBe(false);
  });

  it('does not add inline team-local controls to shared/application-owned members and leaves application-owned actions unchanged', async () => {
    const wrapper = await mountComponent({
      nodes: [
        {
          memberName: 'shared_member',
          ref: 'shared-agent',
          refType: 'AGENT',
          refScope: 'SHARED',
        },
        {
          memberName: 'application_member',
          ref: 'application-agent',
          refType: 'AGENT',
          refScope: 'APPLICATION_OWNED',
        },
      ],
      agentDefinitions: [
        {
          id: 'shared-agent',
          name: 'Shared Agent',
          description: 'Shared description',
          instructions: 'Shared instructions',
          toolNames: [],
          inputProcessorNames: [],
          llmResponseProcessorNames: [],
          systemPromptProcessorNames: [],
          toolExecutionResultProcessorNames: [],
          toolInvocationPreprocessorNames: [],
          lifecycleProcessorNames: [],
          skillNames: [],
          ownershipScope: 'SHARED',
        },
        {
          id: 'application-agent',
          name: 'Application Agent',
          description: 'Application description',
          instructions: 'Application instructions',
          toolNames: [],
          inputProcessorNames: [],
          llmResponseProcessorNames: [],
          systemPromptProcessorNames: [],
          toolExecutionResultProcessorNames: [],
          toolInvocationPreprocessorNames: [],
          lifecycleProcessorNames: [],
          skillNames: [],
          ownershipScope: 'APPLICATION_OWNED',
        },
      ],
    });

    expect(wrapper.find('[data-test="team-local-expand-toggle"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="team-local-edit-button"]').exists()).toBe(false);
    expect(wrapper.findAll('[data-test="shared-agent-view-link"]')).toHaveLength(1);
  });

});
