import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import MobileActivity from '../MobileActivity.vue';
import MobileChat from '../MobileChat.vue';
import MobileFiles from '../MobileFiles.vue';
import MobileHome from '../MobileHome.vue';
import MobileRuns from '../MobileRuns.vue';
import MobileRunSetup from '../MobileRunSetup.vue';
import MobileTools from '../MobileTools.vue';
import { useAgentActivityStore, type ToolActivity } from '~/stores/agentActivityStore';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore';
import { useFileExplorerStore } from '~/stores/fileExplorer';
import { useMobileWorkStore } from '~/stores/mobileWorkStore';
import { useWorkspaceStore } from '~/stores/workspace';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { DEFAULT_AGENT_RUNTIME_KIND, type AgentRunConfig } from '~/types/agent/AgentRunConfig';
import type { Conversation } from '~/types/conversation';
import type { MobileWorkContext } from '~/types/mobileWork';
import { createWorkspaceContextAttachment } from '~/utils/contextFiles/contextAttachmentModel';

let pinia: Pinia;

const workspaceContext: MobileWorkContext = {
  kind: 'workspace',
  workspaceId: 'workspace-1',
  title: 'Project Workspace',
  rootPath: '/Users/normy/project',
};

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

function makeAgentRunConfig(): AgentRunConfig {
  return {
    agentDefinitionId: 'agent-1',
    agentDefinitionName: 'Builder Agent',
    llmModelIdentifier: 'test-model',
    runtimeKind: DEFAULT_AGENT_RUNTIME_KIND,
    workspaceId: 'workspace-1',
    autoExecuteTools: false,
    skillAccessMode: 'GLOBAL_DISCOVERY',
    isLocked: false,
  };
}

function seedAgentRun(): AgentContext {
  const conversation: Conversation = {
    id: 'run-1',
    messages: [],
    createdAt: '2026-05-18T16:00:00.000Z',
    updatedAt: '2026-05-18T16:00:00.000Z',
    agentDefinitionId: 'agent-1',
  };
  const run = new AgentContext(makeAgentRunConfig(), new AgentRunState('run-1', conversation));
  useAgentContextsStore().runs.set('run-1', run);
  useAgentSelectionStore().selectRunWithoutShellNavigation('run-1', 'agent');
  return run;
}

function seedCatalogAndWorkspace(): void {
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
      defaultLaunchConfig: { runtimeKind: DEFAULT_AGENT_RUNTIME_KIND, llmModelIdentifier: 'test-model', llmConfig: null },
    },
    {
      id: 'agent-2',
      name: 'Reviewer Agent',
      description: 'Reviews software',
      instructions: '',
      toolNames: [],
      inputProcessorNames: [],
      llmResponseProcessorNames: [],
      systemPromptProcessorNames: [],
      toolExecutionResultProcessorNames: [],
      toolInvocationPreprocessorNames: [],
      lifecycleProcessorNames: [],
      skillNames: [],
      defaultLaunchConfig: { runtimeKind: DEFAULT_AGENT_RUNTIME_KIND, llmModelIdentifier: 'test-model', llmConfig: null },
    },
    {
      id: 'agent-3',
      name: 'Unconfigured Agent',
      description: 'Needs a model choice',
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
      nodes: [
        { memberName: 'lead', ref: 'agent-1', refType: 'AGENT', refScope: 'SHARED' },
        { memberName: 'reviewer', ref: 'agent-2', refType: 'AGENT', refScope: 'SHARED' },
      ],
      defaultLaunchConfig: { runtimeKind: DEFAULT_AGENT_RUNTIME_KIND, llmModelIdentifier: 'test-model', llmConfig: null },
    },
  ];
  useWorkspaceStore().workspaces = {
    'workspace-1': {
      workspaceId: 'workspace-1',
      name: 'Project Workspace',
      absolutePath: '/Users/normy/project',
      workspaceConfig: { root_path: '/Users/normy/project' },
      nodeIdToNode: {},
      fileExplorer: {
        id: 'root',
        name: 'project',
        path: '/Users/normy/project',
        is_file: false,
        children: [
          { id: 'readme', name: 'README.md', path: '/Users/normy/project/README.md', is_file: true, children: [] },
          {
            id: 'src',
            name: 'src',
            path: '/Users/normy/project/src',
            is_file: false,
            children: [
              { id: 'deep', name: 'deep.ts', path: '/Users/normy/project/src/deep.ts', is_file: true, children: [] },
              { id: 'image', name: 'image.png', path: '/Users/normy/project/src/image.png', is_file: true, children: [] },
            ],
          },
        ],
      } as any,
    },
  };
  useWorkspaceStore().workspacesFetched = true;
}

function mountWithPinia(component: any, options: any = {}) {
  return mount(component, {
    ...options,
    global: {
      ...(options.global ?? {}),
      plugins: [pinia, ...(options.global?.plugins ?? [])],
      stubs: {
        RuntimeModelConfigFields: { template: '<div data-testid="runtime-model-config-fields" />' },
        ...(options.global?.stubs ?? {}),
      },
    },
  });
}

describe('mobile Round 4 UX refinements', () => {
  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    seedCatalogAndWorkspace();
  });

  it('shows mixed-success reachability instead of claiming the desktop is unreachable', () => {
    const wrapper = mountWithPinia(MobileHome, {
      props: {
        serverBaseUrl: 'http://desktop-private.local:29695',
        status: null,
        isRefreshing: false,
        diagnostic: {
          kind: 'network_unreachable',
          title: 'Cannot reach AutoByteus desktop',
          message: 'Your phone cannot reach the desktop node.',
          recoveryAction: 'Check the network.',
        },
        authorizedApiReachable: true,
        currentContext: null,
        recentItems: [],
      },
    });

    expect(wrapper.get('[data-testid="mobile-home-status-card"]').text()).toContain('Node reachable');
    expect(wrapper.get('[data-testid="mobile-home-status-card"]').text()).toContain('Phone Access status unavailable');
    expect(wrapper.get('[data-testid="mobile-home-status-card"]').text()).not.toContain('Cannot reach AutoByteus desktop');
    expect(wrapper.get('[data-testid="mobile-home-status-card"]').text()).not.toContain('Offline');
  });

  it('requires intentional run target selection and shows launch summary without provider preflight gating', async () => {
    const wrapper = mountWithPinia(MobileRunSetup, {
      props: { context: workspaceContext },
    });
    await nextTick();

    expect(wrapper.text()).toContain('Choose an agent, workspace, runtime/model, and first message.');
    expect(wrapper.text()).not.toContain('focused member');
    expect(wrapper.get('[data-testid="mobile-run-agent-select"]').text()).toContain('Choose an agent intentionally');
    expect(wrapper.get('[data-testid="mobile-run-workspace-select"]').text()).toContain('Project Workspace');
    expect(wrapper.get('[data-testid="mobile-launch-summary"]').text()).toContain('Choose model');
    expect(wrapper.get('[data-testid="mobile-launch-summary"]').text()).toContain('Review your mobile launch choices');
    expect(wrapper.get('[data-testid="mobile-launch-summary"]').text()).not.toContain('Existing desktop defaults');
    expect(wrapper.find('[data-testid="mobile-runtime-model-blocking-issue"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="mobile-run-launch"]').attributes('disabled')).toBeDefined();

    await wrapper.get('[data-testid="mobile-run-agent-select-toggle"]').trigger('click');
    await nextTick();
    await wrapper.findAll('[data-testid="mobile-run-agent-select-option"]')[1].trigger('click');
    await wrapper.get('[data-testid="mobile-run-prompt"]').setValue('Start intentionally');
    await nextTick();

    expect(wrapper.get('[data-testid="mobile-launch-summary"]').text()).toContain('Reviewer Agent');
    expect(wrapper.get('[data-testid="mobile-launch-summary"]').text()).toContain('AutoByteus · test-model');
    expect(wrapper.get('[data-testid="mobile-run-launch"]').attributes('disabled')).toBeUndefined();
  });

  it('uses a searchable mobile picker for team launch first message targets', async () => {
    const wrapper = mountWithPinia(MobileRunSetup, {
      props: { context: workspaceContext },
    });
    await nextTick();

    await wrapper.get('[data-testid="mobile-run-setup-team-mode"]').trigger('click');
    await nextTick();
    expect(wrapper.text()).toContain('Choose a team, workspace, runtime/model, first message target, and first message.');

    await wrapper.get('[data-testid="mobile-run-team-select-toggle"]').trigger('click');
    await nextTick();
    await wrapper.get('[data-testid="mobile-run-team-select-option"]').trigger('click');
    await nextTick();

    expect(wrapper.find('[data-testid="mobile-team-launch-focus-select"]').exists()).toBe(true);
    expect(wrapper.find('select[data-testid="mobile-team-launch-focus-select"]').exists()).toBe(false);

    await wrapper.get('[data-testid="mobile-team-launch-focus-select-toggle"]').trigger('click');
    await nextTick();
    expect(wrapper.find('[data-testid="mobile-team-launch-focus-select-search"]').exists()).toBe(true);

    await wrapper.get('[data-testid="mobile-team-launch-focus-select-search"]').setValue('reviewer');
    await nextTick();

    const options = wrapper.findAll('[data-testid="mobile-team-launch-focus-select-option"]');
    expect(options).toHaveLength(1);
    expect(options[0].text()).toContain('reviewer');
  });


  it('keeps mobile launch disabled instead of silently choosing a model for unconfigured agents', async () => {
    const wrapper = mountWithPinia(MobileRunSetup, {
      props: { context: workspaceContext },
    });
    await nextTick();

    await wrapper.get('[data-testid="mobile-run-agent-select-toggle"]').trigger('click');
    await nextTick();
    await wrapper.findAll('[data-testid="mobile-run-agent-select-option"]')[2].trigger('click');
    await wrapper.get('[data-testid="mobile-run-prompt"]').setValue('Try without a model');
    await nextTick();

    expect(wrapper.get('[data-testid="mobile-launch-summary"]').text()).toContain('Unconfigured Agent');
    expect(wrapper.get('[data-testid="mobile-launch-summary"]').text()).toContain('Choose a model before launching.');
    expect(wrapper.get('[data-testid="mobile-run-launch"]').attributes('disabled')).toBeDefined();
  });

  it('consumes a single-use setup intent so selected agents open visible setup preselected', async () => {
    const mobileWorkStore = useMobileWorkStore();
    const agentContext: MobileWorkContext = {
      kind: 'agent-definition',
      agentDefinitionId: 'agent-1',
      title: 'Builder Agent',
      description: 'Builds software',
    };
    mobileWorkStore.selectContext(agentContext, 'runs');
    mobileWorkStore.requestRunSetup({ kind: 'agent', agentDefinitionId: 'agent-1' });

    const wrapper = mountWithPinia(MobileRuns, {
      props: { context: agentContext },
      global: {
        stubs: {
          RuntimeModelConfigFields: { template: '<div data-testid="runtime-model-config-fields" />' },
        },
      },
    });
    await nextTick();

    expect(wrapper.find('[data-testid="mobile-run-setup"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="mobile-run-agent-select"]').text()).toContain('Builder Agent');
    expect(mobileWorkStore.runSetupIntent).toBeNull();
  });

  it('keeps context visibility adjacent to the mobile composer send decision', () => {
    const run = seedAgentRun();
    run.contextFilePaths.push(createWorkspaceContextAttachment('/Users/normy/project/active.md'));

    const wrapper = mountWithPinia(MobileChat, {
      props: { context: agentRunContext },
      global: {
        stubs: {
          AgentEventMonitor: { template: '<div data-testid="agent-event-monitor"><slot name="composerContext" /><button title="Send message">Send</button></div>' },
          AgentTeamEventMonitor: { template: '<div data-testid="team-event-monitor" />' },
        },
      },
    });

    const monitorHtml = wrapper.get('[data-testid="agent-event-monitor"]').html();
    expect(monitorHtml).toContain('mobile-composer-context-tray');
    expect(monitorHtml.indexOf('mobile-composer-context-tray')).toBeLessThan(monitorHtml.indexOf('Send message'));
  });

  it('keeps mobile Files browse-first while preserving secondary filters and deliberate deep search', async () => {
    useMobileWorkStore().addDraftContextAttachment(createWorkspaceContextAttachment('/Users/normy/project/attached.md'));
    useFileExplorerStore().fileExplorerStateByWorkspace.set('workspace-1', {
      openFolders: {},
      openFiles: [{ path: '/Users/normy/project/recent.ts', type: 'Text', mode: 'preview', content: '', url: null, isLoading: false, error: null }],
      activeFile: null,
      searchResults: [],
      searchLoading: false,
      searchError: null,
      searchAbortController: null,
      saveContentError: {},
      saveContentLoading: {},
      deleteError: {},
      deleteLoading: {},
      moveError: {},
      moveLoading: {},
      renameError: {},
      renameLoading: {},
      createError: {},
      createLoading: {},
      filesToIgnoreNextModify: new Set(),
      recentStructuralChangeEchoes: [],
    } as any);

    const wrapper = mountWithPinia(MobileFiles, {
      props: { context: workspaceContext },
    });

    expect(wrapper.find('[data-testid="mobile-files-sticky-context"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="mobile-files-primary-controls"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="mobile-files-advanced-filters"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Markdown/code');

    await wrapper.get('[data-testid="mobile-files-filters-toggle"]').trigger('click');
    await nextTick();

    expect(wrapper.find('[data-testid="mobile-files-filter-recent"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="mobile-files-filter-attached"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="mobile-files-filter-markdown-code"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('deep.ts');

    await wrapper.get('[data-testid="mobile-files-deep-search"]').trigger('click');
    await nextTick();
    expect(wrapper.text()).toContain('deep.ts');

    await wrapper.get('[data-testid="mobile-files-filter-attached"]').trigger('click');
    await nextTick();
    expect(wrapper.text()).toContain('attached.md');
  });

  it('renders Activity as a compact digest with secondary issue filters and no unsupported-tool notice', async () => {
    seedAgentRun();
    const activity: ToolActivity = {
      invocationId: 'tool-1',
      toolName: 'run_terminal_command',
      type: 'terminal_command',
      status: 'error',
      contextText: 'npm test -- --very-long-command-that-should-be-compact',
      arguments: {},
      logs: ['line one', 'line two', 'line three'],
      result: null,
      error: 'ANTHROPIC_API_KEY environment variable is not set',
      timestamp: new Date('2026-05-18T16:05:00.000Z'),
    };
    useAgentActivityStore().addActivity('run-1', activity);

    const wrapper = mountWithPinia(MobileActivity, {
      props: { context: agentRunContext },
    });

    expect(wrapper.find('[data-testid="mobile-activity-digest"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('Interactive terminal, browser, and desktop tool panes are not supported');
    expect(wrapper.find('[data-testid="mobile-activity-filter-errors"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('ANTHROPIC_API_KEY environment variable is not set');

    await wrapper.get('[data-testid="mobile-activity-more-filters"]').trigger('click');
    await nextTick();
    expect(wrapper.find('[data-testid="mobile-activity-filter-errors"]').exists()).toBe(true);

    await wrapper.get('[data-testid="mobile-activity-filter-errors"]').trigger('click');
    await nextTick();
    expect(wrapper.find('[data-testid="mobile-tool-activity-row"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('1 error/denied item');
  });

  it('renders mobile Tools with Terminal and VNC without requiring desktop right-panel layout', async () => {
    const wrapper = mountWithPinia(MobileTools, {
      props: { context: workspaceContext },
      global: {
        stubs: {
          Terminal: { props: ['workspaceId'], template: '<div data-testid="terminal-stub">{{ workspaceId }}</div>' },
          VncViewer: { template: '<div data-testid="vnc-stub" />' },
        },
      },
    });

    expect(wrapper.find('[data-testid="mobile-tools"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="mobile-tools-tab-terminal"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="mobile-tools-tab-vnc"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="mobile-terminal-panel"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="terminal-stub"]').text()).toContain('workspace-1');

    await wrapper.get('[data-testid="mobile-tools-tab-vnc"]').trigger('click');
    await nextTick();

    expect(wrapper.find('[data-testid="mobile-vnc-panel"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="vnc-stub"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('phone-reachable hostnames');
  });
});
