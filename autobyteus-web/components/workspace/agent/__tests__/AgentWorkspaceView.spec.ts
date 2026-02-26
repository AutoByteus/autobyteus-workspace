import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import AgentWorkspaceView from '../AgentWorkspaceView.vue';
import { AgentStatus } from '~/types/agent/AgentStatus';

const {
  state,
  agentContextsStoreMock,
  agentDefinitionStoreMock,
  runConfigStoreMock,
  teamRunConfigStoreMock,
  selectionStoreMock,
} = vi.hoisted(() => {
  const localState = {
    activeRun: null as any,
  };

  const getById = vi.fn((id: string) => {
    if (id === 'agent-def-1') {
      return {
        id: 'agent-def-1',
        name: 'Story Agent',
        avatarUrl: 'https://example.com/from-definition.png',
      };
    }
    return null;
  });

  return {
    state: localState,
    agentContextsStoreMock: {
      get activeRun() {
        return localState.activeRun;
      },
    },
    agentDefinitionStoreMock: {
      agentDefinitions: [
        {
          id: 'agent-def-1',
          name: 'Story Agent',
          avatarUrl: 'https://example.com/from-definition.png',
        },
      ],
      fetchAllAgentDefinitions: vi.fn().mockResolvedValue(undefined),
      getAgentDefinitionById: getById,
    },
    runConfigStoreMock: {
      setAgentConfig: vi.fn(),
    },
    teamRunConfigStoreMock: {
      clearConfig: vi.fn(),
    },
    selectionStoreMock: {
      clearSelection: vi.fn(),
    },
  };
});

vi.mock('~/stores/agentContextsStore', () => ({
  useAgentContextsStore: () => agentContextsStoreMock,
}));

vi.mock('~/stores/agentDefinitionStore', () => ({
  useAgentDefinitionStore: () => agentDefinitionStoreMock,
}));

vi.mock('~/stores/agentRunConfigStore', () => ({
  useAgentRunConfigStore: () => runConfigStoreMock,
}));

vi.mock('~/stores/teamRunConfigStore', () => ({
  useTeamRunConfigStore: () => teamRunConfigStoreMock,
}));

vi.mock('~/stores/agentSelectionStore', () => ({
  useAgentSelectionStore: () => selectionStoreMock,
}));

const buildAgentContext = (overrides: Record<string, unknown> = {}) => ({
  config: {
    agentDefinitionId: 'agent-def-1',
    agentDefinitionName: 'Story Agent',
    agentAvatarUrl: 'https://example.com/from-context.png',
    isLocked: true,
  },
  state: {
    runId: 'agent-1234',
    currentStatus: AgentStatus.Idle,
    conversation: {
      id: 'agent-1234',
      createdAt: '2026-02-22T00:00:00.000Z',
      updatedAt: '2026-02-22T00:00:00.000Z',
      messages: [],
    },
  },
  ...overrides,
});

describe('AgentWorkspaceView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.activeRun = buildAgentContext();
  });

  const mountComponent = () => mount(AgentWorkspaceView, {
    global: {
      stubs: {
        AgentEventMonitor: { template: '<div data-test="agent-event-monitor" />' },
        WorkspaceHeaderActions: { template: '<button type="button" data-test="new-agent" @click="$emit(\'new-agent\')" />' },
        AgentStatusDisplay: { template: '<div data-test="header-status" />' },
        CopyButton: { template: '<button type="button" data-test="copy-button" />' },
      },
    },
  });

  it('uses context avatar URL in header when available', () => {
    const wrapper = mountComponent();
    const avatar = wrapper.find('img[alt="Story Agent avatar"]');
    expect(avatar.exists()).toBe(true);
    expect(avatar.attributes('src')).toBe('https://example.com/from-context.png');
  });

  it('falls back to definition avatar URL in header when context avatar is missing', () => {
    state.activeRun = buildAgentContext({
      config: {
        agentDefinitionId: 'agent-def-1',
        agentDefinitionName: 'Story Agent',
        agentAvatarUrl: null,
        isLocked: true,
      },
    });

    const wrapper = mountComponent();
    const avatar = wrapper.find('img[alt="Story Agent avatar"]');
    expect(avatar.exists()).toBe(true);
    expect(avatar.attributes('src')).toBe('https://example.com/from-definition.png');
  });
});
