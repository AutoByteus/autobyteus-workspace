import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick, reactive } from 'vue';
import AgentUserInputTextArea from '../AgentUserInputTextArea.vue';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import { useActiveContextStore } from '~/stores/activeContextStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore';

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
  context.state.canInterrupt = true;
  return context;
};

const buildAgentNode = (memberRouteKey: string) => ({
  memberKind: 'agent' as const,
  memberName: memberRouteKey.split('/').at(-1) || memberRouteKey,
  displayName: memberRouteKey.split('/').at(-1) || memberRouteKey,
  memberPath: memberRouteKey.split('/'),
  memberRouteKey,
  agentDefinitionId: `def-${memberRouteKey}`,
});

const buildTeamContext = (
  members: Array<[string, AgentContext]>,
  focusedMemberRouteKey: string,
) => {
  const memberTree = members.map(([memberRouteKey]) => buildAgentNode(memberRouteKey));
  return {
    teamRunId: 'team-1',
    config: { teamDefinitionId: 'team-def-1' } as any,
    memberTree,
    memberNodesByRouteKey: new Map(memberTree.map((member) => [member.memberRouteKey, member])),
    leafAgentContextsByRouteKey: new Map(members),
    coordinatorMemberRouteKey: 'solution_designer',
    historicalHydration: null,
    focusedMemberRouteKey,
    currentStatus: AgentTeamStatus.Running,
    isSubscribed: true,
    taskPlan: null,
    taskStatuses: null,
  };
};

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

    teamContextsStore.addTeamContext(buildTeamContext([
      ['solution_designer', solutionDesigner],
      ['code_reviewer', codeReviewer],
    ], 'solution_designer'));
    selectionStore.selectRun('team-1', 'team');
    teamRunStore.connectToTeamStream('team-1');

    const wrapper = mount(AgentUserInputTextArea, {
      global: {
        mocks: {
          $t: (key: string) => key,
        },
      },
    });
    await nextTick();

    expect(activeContextStore.activeAgentContext?.state.runId).toBe('team-1::solution_designer');

    teamContextsStore.setFocusedMember('code_reviewer');
    await nextTick();

    expect(activeContextStore.activeAgentContext?.state.runId).toBe('team-1::code_reviewer');

    await wrapper.get('button[title="Stop generation"]').trigger('click');

    expect(mockWsSend).toHaveBeenCalledTimes(1);
    expect(JSON.parse(mockWsSend.mock.calls[0][0])).toEqual({
      type: 'INTERRUPT_GENERATION',
      payload: {
        target_member_route_key: 'code_reviewer',
        target_member_run_id: 'team-1::code_reviewer',
      },
    });
  });
});
