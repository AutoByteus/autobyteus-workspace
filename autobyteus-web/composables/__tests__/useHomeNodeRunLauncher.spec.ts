import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import {
  buildStartAgentRunCommand,
  buildStartTeamRunCommand,
  useHomeNodeRunLauncher,
} from '../useHomeNodeRunLauncher';
import { EMBEDDED_NODE_ID, type NodeProfile } from '~/types/node';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import { useNodeStore } from '~/stores/nodeStore';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';

const { navigateToMock } = vi.hoisted(() => ({
  navigateToMock: vi.fn().mockResolvedValue(undefined),
}));

mockNuxtImport('navigateTo', () => navigateToMock);

function setElectronApiMock(mock: Partial<Window['electronAPI']> | null): void {
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    writable: true,
    value: mock,
  });
}

function makeNode(id: string, nodeType: NodeProfile['nodeType'], baseUrl: string): NodeProfile {
  return {
    id,
    name: id,
    baseUrl,
    nodeType,
    isSystem: nodeType === 'embedded',
    createdAt: '2026-02-13T00:00:00.000Z',
    updatedAt: '2026-02-13T00:00:00.000Z',
    capabilityProbeState: 'ready',
    capabilities: {
      terminal: true,
      fileExplorerStreaming: true,
    },
  };
}

function makeAgentDefinition(id: string, name: string) {
  return {
    id,
    name,
    role: `${name} role`,
    description: `${name} description`,
    avatarUrl: null,
    toolNames: [],
    inputProcessorNames: [],
    llmResponseProcessorNames: [],
    systemPromptProcessorNames: [],
    toolExecutionResultProcessorNames: [],
    toolInvocationPreprocessorNames: [],
    lifecycleProcessorNames: [],
    skillNames: [],
    prompts: [],
  };
}

function makeTeamDefinition(id: string, name: string) {
  return {
    id,
    name,
    role: `${name} role`,
    description: `${name} description`,
    avatarUrl: null,
    coordinatorMemberName: 'lead',
    nodes: [
      {
        memberName: 'lead',
        referenceType: 'AGENT',
        referenceId: 'agent-local',
      },
    ],
  };
}

describe('useHomeNodeRunLauncher', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
    navigateToMock.mockReset();
    navigateToMock.mockResolvedValue(undefined);
    setElectronApiMock(null);
  });

  it('builds START_AGENT_RUN command with expected payload fields', () => {
    const command = buildStartAgentRunCommand({
      agent: {
        homeNodeId: 'remote-1',
        definitionId: 'agent-1',
        name: 'Remote Agent',
      },
      sourceNodeId: EMBEDDED_NODE_ID,
    });

    expect(command.commandType).toBe('START_AGENT_RUN');
    expect(command.commandId.length).toBeGreaterThan(0);
    expect(command.payload).toEqual({
      agentDefinitionId: 'agent-1',
      agentName: 'Remote Agent',
      sourceNodeId: EMBEDDED_NODE_ID,
      homeNodeId: 'remote-1',
    });
  });

  it('builds START_TEAM_RUN command with expected payload fields', () => {
    const command = buildStartTeamRunCommand({
      team: {
        homeNodeId: 'remote-1',
        definitionId: 'team-1',
        name: 'Remote Team',
      },
      sourceNodeId: EMBEDDED_NODE_ID,
    });

    expect(command.commandType).toBe('START_TEAM_RUN');
    expect(command.commandId.length).toBeGreaterThan(0);
    expect(command.payload).toEqual({
      teamDefinitionId: 'team-1',
      teamName: 'Remote Team',
      sourceNodeId: EMBEDDED_NODE_ID,
      homeNodeId: 'remote-1',
    });
  });

  it('runs local catalog agent in current window', async () => {
    const agentDefinitionStore = useAgentDefinitionStore();
    const agentRunConfigStore = useAgentRunConfigStore();
    const nodeStore = useNodeStore();
    const windowNodeContextStore = useWindowNodeContextStore();

    agentDefinitionStore.agentDefinitions = [
      makeAgentDefinition('agent-local', 'Local Agent'),
    ] as any;
    nodeStore.nodes = [makeNode(EMBEDDED_NODE_ID, 'embedded', 'http://localhost:29695')];
    windowNodeContextStore.nodeId = EMBEDDED_NODE_ID;

    const { launchFromCatalogAgent } = useHomeNodeRunLauncher();
    await launchFromCatalogAgent({
      homeNodeId: EMBEDDED_NODE_ID,
      definitionId: 'agent-local',
      name: 'Local Agent',
    });

    expect(agentRunConfigStore.config?.agentDefinitionId).toBe('agent-local');
  });

  it('dispatches remote run command to destination node window', async () => {
    const openNodeWindow = vi.fn().mockResolvedValue({ windowId: 32, created: false });
    const dispatchNodeWindowCommand = vi.fn().mockResolvedValue({
      accepted: true,
      delivered: true,
      queued: false,
      windowId: 32,
    });

    setElectronApiMock({
      openNodeWindow,
      dispatchNodeWindowCommand,
    });

    const nodeStore = useNodeStore();
    const windowNodeContextStore = useWindowNodeContextStore();
    nodeStore.nodes = [
      makeNode(EMBEDDED_NODE_ID, 'embedded', 'http://localhost:29695'),
      makeNode('remote-1', 'remote', 'http://localhost:8001'),
    ];
    windowNodeContextStore.nodeId = EMBEDDED_NODE_ID;

    const { launchFromCatalogAgent } = useHomeNodeRunLauncher();
    await launchFromCatalogAgent({
      homeNodeId: 'remote-1',
      definitionId: 'agent-remote',
      name: 'Remote Agent',
    });

    expect(openNodeWindow).toHaveBeenCalledWith('remote-1');
    expect(dispatchNodeWindowCommand).toHaveBeenCalledTimes(1);
    expect(dispatchNodeWindowCommand).toHaveBeenCalledWith(
      'remote-1',
      expect.objectContaining({
        commandType: 'START_AGENT_RUN',
        payload: expect.objectContaining({
          agentDefinitionId: 'agent-remote',
          homeNodeId: 'remote-1',
          sourceNodeId: EMBEDDED_NODE_ID,
        }),
      }),
    );
  });

  it('runs local catalog team in current window', async () => {
    const teamDefinitionStore = useAgentTeamDefinitionStore();
    const teamRunConfigStore = useTeamRunConfigStore();
    const nodeStore = useNodeStore();
    const windowNodeContextStore = useWindowNodeContextStore();

    teamDefinitionStore.agentTeamDefinitions = [
      makeTeamDefinition('team-local', 'Local Team'),
    ] as any;
    nodeStore.nodes = [makeNode(EMBEDDED_NODE_ID, 'embedded', 'http://localhost:29695')];
    windowNodeContextStore.nodeId = EMBEDDED_NODE_ID;

    const { launchFromCatalogTeam } = useHomeNodeRunLauncher();
    await launchFromCatalogTeam({
      homeNodeId: EMBEDDED_NODE_ID,
      definitionId: 'team-local',
      name: 'Local Team',
    });

    expect(teamRunConfigStore.config?.teamDefinitionId).toBe('team-local');
  });

  it('dispatches remote team run command to destination node window', async () => {
    const openNodeWindow = vi.fn().mockResolvedValue({ windowId: 32, created: false });
    const dispatchNodeWindowCommand = vi.fn().mockResolvedValue({
      accepted: true,
      delivered: true,
      queued: false,
      windowId: 32,
    });

    setElectronApiMock({
      openNodeWindow,
      dispatchNodeWindowCommand,
    });

    const nodeStore = useNodeStore();
    const windowNodeContextStore = useWindowNodeContextStore();
    nodeStore.nodes = [
      makeNode(EMBEDDED_NODE_ID, 'embedded', 'http://localhost:29695'),
      makeNode('remote-1', 'remote', 'http://localhost:8001'),
    ];
    windowNodeContextStore.nodeId = EMBEDDED_NODE_ID;

    const { launchFromCatalogTeam } = useHomeNodeRunLauncher();
    await launchFromCatalogTeam({
      homeNodeId: 'remote-1',
      definitionId: 'team-remote',
      name: 'Remote Team',
    });

    expect(openNodeWindow).toHaveBeenCalledWith('remote-1');
    expect(dispatchNodeWindowCommand).toHaveBeenCalledTimes(1);
    expect(dispatchNodeWindowCommand).toHaveBeenCalledWith(
      'remote-1',
      expect.objectContaining({
        commandType: 'START_TEAM_RUN',
        payload: expect.objectContaining({
          teamDefinitionId: 'team-remote',
          homeNodeId: 'remote-1',
          sourceNodeId: EMBEDDED_NODE_ID,
        }),
      }),
    );
  });

  it('throws when remote handoff is rejected by electron bridge', async () => {
    setElectronApiMock({
      openNodeWindow: vi.fn().mockResolvedValue({ windowId: 11, created: true }),
      dispatchNodeWindowCommand: vi.fn().mockResolvedValue({
        accepted: false,
        delivered: false,
        queued: false,
        reason: 'command-home-node-mismatch',
      }),
    });

    const nodeStore = useNodeStore();
    nodeStore.nodes = [
      makeNode(EMBEDDED_NODE_ID, 'embedded', 'http://localhost:29695'),
      makeNode('remote-1', 'remote', 'http://localhost:8001'),
    ];

    const { launchFromCatalogAgent } = useHomeNodeRunLauncher();
    await expect(
      launchFromCatalogAgent({
        homeNodeId: 'remote-1',
        definitionId: 'agent-remote',
        name: 'Remote Agent',
      }),
    ).rejects.toThrow('command-home-node-mismatch');
  });

  it('throws when remote team handoff is rejected by electron bridge', async () => {
    setElectronApiMock({
      openNodeWindow: vi.fn().mockResolvedValue({ windowId: 11, created: true }),
      dispatchNodeWindowCommand: vi.fn().mockResolvedValue({
        accepted: false,
        delivered: false,
        queued: false,
        reason: 'destination-node-not-ready',
      }),
    });

    const nodeStore = useNodeStore();
    nodeStore.nodes = [
      makeNode(EMBEDDED_NODE_ID, 'embedded', 'http://localhost:29695'),
      makeNode('remote-1', 'remote', 'http://localhost:8001'),
    ];

    const { launchFromCatalogTeam } = useHomeNodeRunLauncher();
    await expect(
      launchFromCatalogTeam({
        homeNodeId: 'remote-1',
        definitionId: 'team-remote',
        name: 'Remote Team',
      }),
    ).rejects.toThrow('destination-node-not-ready');
  });
});
