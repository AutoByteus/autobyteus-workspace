import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick, reactive } from 'vue';
import AgentUserInputTextArea from '../AgentUserInputTextArea.vue';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { useActiveContextStore } from '~/stores/activeContextStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore';
import { buildTestTeamContext, testAgentNode } from '~/test-support/currentTeamTestFixtures';

const {
  mockWsConnect,
  mockWsDisconnect,
  mockWsOn,
  mockWsOff,
  mockWsSend,
} = vi.hoisted(() => ({
  mockWsConnect: vi.fn(),
  mockWsDisconnect: vi.fn(),
  mockWsOn: vi.fn(),
  mockWsOff: vi.fn(),
  mockWsSend: vi.fn(),
}));

vi.mock('~/services/agentStreaming/transport', () => ({
  ConnectionState: {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    DISCONNECTING: 'disconnecting',
    RECONNECTING: 'reconnecting',
  },
  WebSocketClient: vi.fn().mockImplementation(() => ({
    get state() {
      return 'connected';
    },
    connect: mockWsConnect,
    disconnect: mockWsDisconnect,
    on: mockWsOn,
    off: mockWsOff,
    send: mockWsSend,
  })),
}));

vi.mock('~/services/agentStreaming/browser/browserToolExecutionSucceededHandler', () => ({
  handleBrowserToolExecutionSucceeded: vi.fn(),
}));

vi.mock('~/stores/teamCommunicationStore', () => ({
  useTeamCommunicationStore: () => ({
    upsertFromBackendPayload: vi.fn(),
  }),
}));

const voiceInputStoreMock = reactive({
  isAvailable: false,
  isRecording: false,
  isTranscribing: false,
  initialize: vi.fn().mockResolvedValue(undefined),
  cleanup: vi.fn().mockResolvedValue(undefined),
  toggleRecording: vi.fn().mockResolvedValue(undefined),
});

vi.mock('~/stores/voiceInputStore', () => ({
  useVoiceInputStore: () => voiceInputStoreMock,
}));

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => ({
    isEmbeddedWindow: true,
    getBoundEndpoints: () => ({
      teamWs: 'ws://node-a.example/ws/agent-team',
    }),
  }),
}));

vi.mock('~/stores/contextFileUploadStore', () => ({
  useContextFileUploadStore: () => ({
    isUploading: false,
  }),
}));

vi.mock('~/stores/workspace', () => ({
  useWorkspaceStore: () => ({
    activeWorkspace: { absolutePath: '/tmp/workspace' },
    allWorkspaces: [],
    workspaces: {},
  }),
}));

vi.mock('~/stores/workspaceCenterViewStore', () => ({
  useWorkspaceCenterViewStore: () => ({ showChat: vi.fn() }),
}));

vi.mock('@iconify/vue', () => ({
  Icon: {
    props: ['icon'],
    template: '<span :data-icon="icon" />',
  },
}));

const createAgentContext = (routeKey: string): AgentContext => {
  const runId = `team-1::${routeKey}`;
  const config: AgentRunConfig = {
    agentDefinitionId: `def-${routeKey}`,
    agentDefinitionName: routeKey,
    llmModelIdentifier: 'model-x',
    runtimeKind: 'codex_app_server',
    workspaceId: null,
    autoExecuteTools: false,
    skillAccessMode: 'PRELOADED_ONLY',
    llmConfig: null,
    isLocked: false,
  } as AgentRunConfig;
  const conversation = {
    id: runId,
    messages: [],
    createdAt: '2026-05-16T00:00:00.000Z',
    updatedAt: '2026-05-16T00:00:00.000Z',
    agentDefinitionId: config.agentDefinitionId,
  } as any;
  const context = new AgentContext(config, new AgentRunState(runId, conversation));
  context.state.currentStatus = AgentStatus.Running;
  return context;
};

const buildTeamContext = (
  members: Array<[string, AgentContext]>,
  focusedAgentRunId: string,
) => buildTestTeamContext({
  teamRunId: 'team-1',
  teamDefinitionId: 'team-def-1',
  rootChildren: members.map(([memberAddress, context]) => testAgentNode(
    memberAddress.startsWith('/') ? memberAddress : `/${memberAddress}`,
    { agentRunId: context.state.runId, currentStatus: context.state.currentStatus },
  )),
  contexts: members.map(([, context]) => ({ agentRunId: context.state.runId, context })),
  focusedAgentRunId,
  isActive: true,
});

describe('focused team member interrupt UI-to-WebSocket e2e', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    voiceInputStoreMock.isAvailable = false;
    voiceInputStoreMock.isRecording = false;
    voiceInputStoreMock.isTranscribing = false;
  });

  it('clicking stop after switching focus sends the WebSocket interrupt to the visible focused member', async () => {
    const selectionStore = useAgentSelectionStore();
    const teamContextsStore = useAgentTeamContextsStore();
    const teamRunStore = useAgentTeamRunStore();
    const activeContextStore = useActiveContextStore();

    const solutionDesigner = createAgentContext('solution_designer');
    const codeReviewer = createAgentContext('code_reviewer');

    const teamContext = buildTeamContext([
      ['solution_designer', solutionDesigner],
      ['code_reviewer', codeReviewer],
    ], solutionDesigner.state.runId);
    teamContextsStore.addTeamContext(teamContext);
    selectionStore.selectRun('team-1', 'team');
    teamRunStore.connectToTeamStream('team-1');
    const callbacks = new Map<string, (payload: string) => void>();
    for (const [event, callback] of mockWsOn.mock.calls) callbacks.set(event, callback);
    const emit = (type: string, payload: Record<string, unknown>) =>
      callbacks.get('onMessage')?.(JSON.stringify({ type, payload }));
    emit('CONNECTED', { session_id: 'session-1', root_team_run_id: 'team-1' });
    emit('TEAM_EXECUTION_VIEW_SNAPSHOT', {
      root_team_run_id: 'team-1',
      base_change_sequence: 0,
      execution_tree: teamContext.view.getExecutionTree(),
      tasks: [],
      messages: [],
      agent_statuses: teamContext.view.listAgentContextEntries().map((entry) => ({
        agent_run_id: entry.agentRunId,
        member_address: entry.memberAddress,
        status: 'running',
        trigger: null,
        tool_name: null,
        error_message: null,
        error_details: null,
      })),
    });

    const wrapper = mount(AgentUserInputTextArea, {
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    });
    await nextTick();

    expect(activeContextStore.activeAgentContext?.state.runId).toBe('team-1::solution_designer');

    teamContextsStore.focusMember('team-1', codeReviewer.state.runId);
    await nextTick();

    expect(activeContextStore.activeAgentContext?.state.runId).toBe('team-1::code_reviewer');

    await wrapper.get('button[title="Stop generation"]').trigger('click');

    expect(mockWsSend).toHaveBeenCalledTimes(1);
    expect(JSON.parse(mockWsSend.mock.calls[0][0])).toEqual({
      type: 'INTERRUPT_GENERATION',
      payload: {
        command_id: expect.stringMatching(/^client_interrupt_/),
        agent_run_id: 'team-1::code_reviewer',
      },
    });
  });
});
