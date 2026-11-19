import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withActiveComposerTarget } from '~/test-support/activeComposerTargetHarness'
import { flushPromises, mount } from '@vue/test-utils';
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
import { useToasts } from '~/composables/useToasts';

const {
  wsState,
  mockWsConnect,
  mockWsDisconnect,
  mockWsOn,
  mockWsOff,
  mockWsSend,
} = vi.hoisted(() => ({
  wsState: { value: 'connected' },
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
  },
  WebSocketClient: vi.fn().mockImplementation(() => ({
    get state() {
      return wsState.value;
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
  cancelOperationForTarget: vi.fn().mockResolvedValue(undefined),
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

/**
 * autobyteus-533: the composer's Stop through the real stores and the real Team stream (its socket doubled), as on
 * desktop and phone (the same composer): Stopping after the first press, one INTERRUPT_GENERATION for a double press,
 * no message for a harmless outcome, Stopping held across a connection loss until the rebind's status, and one plain
 * message for a real failure.
 */
describe('composer Stop: Stopping, one Stop, quiet outcomes (autobyteus-533)', () => {
  const STOP = 'button[title="Stop generation"]';
  const STOPPING = 'button[title="Stopping…"]';
  let emit: (type: string, payload: Record<string, unknown>) => void;
  let callbacks: Map<string, (...args: any[]) => void>;
  let teamContext: ReturnType<typeof buildTeamContext>;

  const memberStatuses = (status: string) => teamContext.view.listAgentContextEntries().map((entry) => ({
    agent_run_id: entry.agentRunId, member_address: entry.memberAddress, status, trigger: null, tool_name: null,
    error_message: null, error_details: null, background_tasks_running: 0, recoverableBlock: null,
  }));
  const bind = (status: string) => {
    emit('CONNECTED', { session_id: 'session-1', root_team_run_id: 'team-1' });
    emit('TEAM_EXECUTION_VIEW_SNAPSHOT', {
      root_team_run_id: 'team-1', base_change_sequence: 0, live_sequence_id: 'live-1', last_message_change_sequence: 0,
      execution_tree: teamContext.view.getExecutionTree(), agent_input_states: [], agent_statuses: memberStatuses(status),
    });
  };
  const sentStops = () => mockWsSend.mock.calls.map(([raw]) => JSON.parse(raw)).filter((m) => m.type === 'INTERRUPT_GENERATION');
  const ack = (state: 'accepted' | 'failed', extra: Record<string, unknown> = {}) => emit('AGENT_COMMAND_ACK', {
    command_type: 'INTERRUPT_GENERATION', command_id: sentStops().at(-1).payload.command_id, state,
    agent_run_id: 'team-1::code_reviewer', ...extra,
  });
  const memberStatus = (status: string, changeSequence: number) => emit('AGENT_STATUS', {
    change_sequence: changeSequence, agent_run_id: 'team-1::code_reviewer', status, trigger: null, tool_name: null,
    error_message: null, error_details: null, background_tasks_running: 0, recoverableBlock: null,
  });
  const toastTexts = () => useToasts().toasts.value.map((toast) => toast.message);
  const settle = async () => { await flushPromises(); await nextTick(); };

  const mountRunningMember = async () => {
    const codeReviewer = createAgentContext('code_reviewer');
    teamContext = buildTeamContext([['code_reviewer', codeReviewer]], codeReviewer.state.runId);
    useAgentTeamContextsStore().addTeamContext(teamContext);
    useAgentSelectionStore().selectRun('team-1', 'team');
    useAgentTeamRunStore().connectToTeamStream('team-1');
    callbacks = new Map();
    for (const [event, callback] of mockWsOn.mock.calls) callbacks.set(event, callback);
    emit = (type, payload) => callbacks.get('onMessage')?.(JSON.stringify({ type, payload }));
    bind('running');
    const wrapper = mount(withActiveComposerTarget(AgentUserInputTextArea), { global: { mocks: { $t: (key: string) => key } } });
    await nextTick();
    expect(wrapper.find(STOP).exists()).toBe(true);
    return wrapper;
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    wsState.value = 'connected';
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    useToasts().toasts.value.forEach((toast) => useToasts().removeToast(toast.id));
  });
  // The Team store keeps its streams per page (module level): each test starts with none.
  afterEach(() => { useAgentTeamRunStore().disconnectAllTeamStreams(); });

  it('a double press sends one Stop; Stopping (busy, disabled) until the status leaves Running, then Send; no message (AC-006, AC-007)', async () => {
    const wrapper = await mountRunningMember();
    await wrapper.get(STOP).trigger('click');
    await nextTick();
    const stopping = wrapper.get(STOPPING);
    expect(stopping.attributes('aria-busy')).toBe('true');
    expect(stopping.attributes('disabled')).toBeDefined();
    await stopping.trigger('click');
    await wrapper.get('textarea').trigger('keydown', { key: 'Enter' });
    expect(sentStops()).toHaveLength(1);
    ack('accepted');
    await settle();
    expect(wrapper.find(STOPPING).exists()).toBe(true);
    memberStatus('idle', 1);
    await settle();
    expect(wrapper.find(STOPPING).exists()).toBe(false);
    expect(wrapper.find(STOP).exists()).toBe(false);
    expect(toastTexts()).toEqual([]);
  });

  it.each([
    ['running', STOP],
    ['idle', 'button[title="Send message"]'],
  ])('a connection loss while Stopping: Stopping holds, a press sends and shows nothing; a rebind with %s decides (AC-008)', async (rebindStatus, after) => {
    const wrapper = await mountRunningMember();
    await wrapper.get(STOP).trigger('click');
    callbacks.get('onDisconnect')?.('network reset', true);
    wsState.value = 'disconnected';
    await settle();
    expect(wrapper.find(STOPPING).exists()).toBe(true);
    await wrapper.get(STOPPING).trigger('click');
    expect(sentStops()).toHaveLength(1);
    wsState.value = 'connected';
    callbacks.get('onConnect')?.();
    bind(rebindStatus);
    await settle();
    expect(wrapper.find(STOPPING).exists()).toBe(false);
    expect(wrapper.find(after).exists()).toBe(true);
    expect(toastTexts()).toEqual([]);
  });

  it('a stream closed for good while Stopping ends Stopping at once, with no message', async () => {
    const wrapper = await mountRunningMember();
    await wrapper.get(STOP).trigger('click');
    useAgentTeamRunStore().disconnectTeamStream('team-1');
    await settle();
    expect(wrapper.find(STOPPING).exists()).toBe(false);
    expect(toastTexts()).toEqual([]);
  });

  it('a real failure ends Stopping and shows one plain message naming the agent, never its run id (AC-009)', async () => {
    const wrapper = await mountRunningMember();
    await wrapper.get(STOP).trigger('click');
    ack('failed', { code: 'RUNTIME_COMMAND_FAILED', message: "Failed to interrupt run for runtime 'codex_app_server'." });
    await settle();
    expect(wrapper.find(STOP).exists()).toBe(true);
    expect(toastTexts()).toEqual(['Could not stop code_reviewer. Please try again.']);
  });

  it('not connected when pressed: nothing is sent and one plain message says so (AC-009)', async () => {
    const wrapper = await mountRunningMember();
    wsState.value = 'disconnected';
    await wrapper.get(STOP).trigger('click');
    await settle();
    expect(sentStops()).toHaveLength(0);
    expect(wrapper.find(STOP).exists()).toBe(true);
    expect(toastTexts()).toEqual(['Stop was not sent: not connected to the node. Check the connection and try again.']);
  });
});
