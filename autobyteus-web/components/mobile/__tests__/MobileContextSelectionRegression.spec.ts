import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import MobileChat from '../MobileChat.vue';
import MobileComposerContextTray from '../MobileComposerContextTray.vue';
import MobileRunSetup from '../MobileRunSetup.vue';
import MobileToolActivityList from '../MobileToolActivityList.vue';
import { useMobileFileContextCoordinator } from '~/composables/mobile/useMobileFileContextCoordinator';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentActivityStore, type ToolActivity } from '~/stores/agentActivityStore';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore';
import { useMobileWorkStore } from '~/stores/mobileWorkStore';
import { useWorkspaceStore } from '~/stores/workspace';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { DEFAULT_AGENT_RUNTIME_KIND, type AgentRunConfig } from '~/types/agent/AgentRunConfig';
import type { Conversation } from '~/types/conversation';
import type { MobileWorkContext } from '~/types/mobileWork';
import { createWorkspaceContextAttachment } from '~/utils/contextFiles/contextAttachmentModel';

const { launchMobileRunMock } = vi.hoisted(() => ({
  launchMobileRunMock: vi.fn(),
}));

vi.mock('~/composables/mobile/useMobileRunLaunchCoordinator', () => ({
  useMobileRunLaunchCoordinator: () => ({
    launchMobileRun: launchMobileRunMock,
  }),
}));

let pinia: Pinia;

const agentRunContext: MobileWorkContext = {
  kind: 'agent-run',
  runId: 'run-1',
  agentDefinitionId: 'agent-1',
  title: 'Builder Agent',
  summary: 'Existing run',
  workspaceRootPath: '/Users/normy/project',
  isActive: true,
  lastActivityAt: '2026-05-18T16:00:00.000Z',
  statusLabel: 'Running',
};

const workspaceContext: MobileWorkContext = {
  kind: 'workspace',
  workspaceId: 'workspace-1',
  title: 'Project Workspace',
  rootPath: '/Users/normy/project',
};

function makeAgentRunConfig(agentDefinitionId = 'agent-1'): AgentRunConfig {
  return {
    agentDefinitionId,
    agentDefinitionName: 'Builder Agent',
    llmModelIdentifier: 'test-model',
    runtimeKind: DEFAULT_AGENT_RUNTIME_KIND,
    workspaceId: 'workspace-1',
    autoExecuteTools: false,
    skillAccessMode: 'GLOBAL_DISCOVERY',
    isLocked: false,
  };
}

function makeAgentContext(runId = 'run-1'): AgentContext {
  const conversation: Conversation = {
    id: runId,
    messages: [],
    createdAt: '2026-05-18T16:00:00.000Z',
    updatedAt: '2026-05-18T16:00:00.000Z',
    agentDefinitionId: 'agent-1',
  };
  return new AgentContext(makeAgentRunConfig(), new AgentRunState(runId, conversation));
}

function seedActiveAgentRun(): AgentContext {
  const run = makeAgentContext('run-1');
  useAgentContextsStore().runs.set('run-1', run);
  useAgentSelectionStore().selectRunWithoutShellNavigation('run-1', 'agent');
  return run;
}

function seedCatalog(): void {
  useAgentDefinitionStore().agentDefinitions = [
    {
      id: 'agent-1',
      name: 'Builder Agent',
      description: 'Builds software',
      instructions: '',
      toolNames: [],
      inputProcessorNames: [],
      llmResponseProcessorNames: [],
      systemPromptProcessorNames: [],
      toolExecutionResultProcessorNames: [],
      toolInvocationPreprocessorNames: [],
      lifecycleProcessorNames: [],
      skillNames: [],
    },
  ];
  useAgentTeamDefinitionStore().agentTeamDefinitions = [
    {
      id: 'team-1',
      name: 'Software Team',
      description: 'Coordinates implementation',
      instructions: '',
      coordinatorMemberName: 'lead',
      nodes: [],
    },
  ];
  const workspaceStore = useWorkspaceStore();
  workspaceStore.workspaces = {
    'workspace-1': {
      workspaceId: 'workspace-1',
      name: 'Project Workspace',
      fileExplorer: { id: 'root', name: 'project', path: '/Users/normy/project', is_file: false, children: [] } as any,
      nodeIdToNode: {},
      workspaceConfig: { root_path: '/Users/normy/project' },
      absolutePath: '/Users/normy/project',
    },
  };
  workspaceStore.workspacesFetched = true;
}

function mountWithPinia(component: any, options: any = {}) {
  return mount(component, {
    ...options,
    global: {
      ...(options.global ?? {}),
      plugins: [pinia, ...(options.global?.plugins ?? [])],
    },
  });
}

describe('mobile context selection stale-run regression', () => {
  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    vi.clearAllMocks();
    seedCatalog();
    launchMobileRunMock.mockResolvedValue({ context: agentRunContext });
  });

  it('does not show an existing run monitor after switching mobile Chat to a non-run context', async () => {
    seedActiveAgentRun();

    const wrapper = mountWithPinia(MobileChat, {
      props: { context: workspaceContext },
      global: {
        stubs: {
          AgentEventMonitor: { template: '<div data-testid="agent-event-monitor" />' },
          AgentTeamEventMonitor: { template: '<div data-testid="team-event-monitor" />' },
        },
      },
    });

    expect(wrapper.find('[data-testid="agent-event-monitor"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('Start or open a run');

    await wrapper.setProps({ context: agentRunContext });
    await nextTick();

    expect(wrapper.find('[data-testid="agent-event-monitor"]').exists()).toBe(true);
  });

  it('routes non-run file attachments to mobile draft state instead of the stale selected run', () => {
    const run = seedActiveAgentRun();
    const coordinator = useMobileFileContextCoordinator();

    const draftResult = coordinator.attachWorkspaceFile('/Users/normy/project/draft.md', workspaceContext);

    expect(draftResult.target).toBe('mobile-draft');
    expect(run.contextFilePaths).toHaveLength(0);
    expect(useMobileWorkStore().draftContextAttachments).toHaveLength(1);
    expect(useMobileWorkStore().draftContextAttachments[0].locator).toBe('/Users/normy/project/draft.md');

    const activeRunResult = coordinator.attachWorkspaceFile('/Users/normy/project/run.md', agentRunContext);

    expect(activeRunResult.target).toBe('active-run');
    expect(run.contextFilePaths.map((attachment) => attachment.locator)).toEqual(['/Users/normy/project/run.md']);
    expect(useMobileWorkStore().draftContextAttachments.map((attachment) => attachment.locator)).toEqual(['/Users/normy/project/draft.md']);
  });

  it('shows composer attachments from the current mobile context only', async () => {
    const run = seedActiveAgentRun();
    run.contextFilePaths.push(createWorkspaceContextAttachment('/Users/normy/project/active.md'));
    useMobileWorkStore().addDraftContextAttachment(createWorkspaceContextAttachment('/Users/normy/project/draft.md'));

    const wrapper = mountWithPinia(MobileComposerContextTray, {
      props: { context: workspaceContext },
    });

    expect(wrapper.findAll('[data-testid="mobile-composer-context-item"]')).toHaveLength(1);
    expect(wrapper.text()).toContain('draft.md');
    expect(wrapper.text()).not.toContain('active.md');

    await wrapper.setProps({ context: agentRunContext });
    await nextTick();

    expect(wrapper.findAll('[data-testid="mobile-composer-context-item"]')).toHaveLength(1);
    expect(wrapper.text()).toContain('active.md');
    expect(wrapper.text()).not.toContain('draft.md');
  });

  it('uses draft attachment count for run setup and launches with the next-run draft', async () => {
    seedActiveAgentRun().contextFilePaths.push(createWorkspaceContextAttachment('/Users/normy/project/active.md'));
    useMobileWorkStore().addDraftContextAttachment(createWorkspaceContextAttachment('/Users/normy/project/draft.md'));

    const wrapper = mountWithPinia(MobileRunSetup, {
      props: { context: workspaceContext },
    });
    await nextTick();

    expect(wrapper.get('[data-testid="mobile-run-setup-context-count"]').text()).toContain('1 file');
    await wrapper.get('[data-testid="mobile-run-agent-select-toggle"]').trigger('click');
    await nextTick();
    await wrapper.get('[data-testid="mobile-run-agent-select-option"]').trigger('click');
    await nextTick();

    await wrapper.get('[data-testid="mobile-run-prompt"]').setValue('Use the attached draft context');
    await wrapper.get('form').trigger('submit');
    await nextTick();

    expect(launchMobileRunMock).toHaveBeenCalledWith({
      kind: 'agent',
      agentDefinitionId: 'agent-1',
      workspaceId: 'workspace-1',
      prompt: 'Use the attached draft context',
    });
  });

  it('does not leak stale run or tool activity into non-run mobile activity contexts', async () => {
    seedActiveAgentRun();
    const activity: ToolActivity = {
      invocationId: 'tool-1',
      toolName: 'read_file',
      type: 'tool_call',
      status: 'success',
      contextText: '/Users/normy/project/active.md',
      arguments: {},
      logs: [],
      result: null,
      error: null,
      timestamp: new Date('2026-05-18T16:05:00.000Z'),
    };
    useAgentActivityStore().addActivity('run-1', activity);

    const wrapper = mountWithPinia(MobileToolActivityList, {
      props: { context: workspaceContext },
    });

    expect(wrapper.find('[data-testid="mobile-tool-activity-row"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('Select a run to see run and tool history.');
    expect(wrapper.text()).not.toContain('read_file');

    await wrapper.setProps({ context: agentRunContext });
    await nextTick();

    expect(wrapper.find('[data-testid="mobile-tool-activity-row"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('read_file');
  });
});
