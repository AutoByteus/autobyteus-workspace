import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { mockNuxtImport } from '@nuxt/test-utils/runtime';
import {
  handleStartAgentRunCommand,
  handleStartTeamRunCommand,
  installNodeWindowCommandConsumer,
} from '../26.node-window-command-consumer.client';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import { useUiErrorStore } from '~/stores/uiErrorStore';
import type { NodeWindowCommand, StartAgentRunCommand, StartTeamRunCommand } from '~/types/node-window-command';

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

function makeCommand(agentDefinitionId: string): StartAgentRunCommand {
  return {
    commandId: 'cmd-1',
    commandType: 'START_AGENT_RUN',
    issuedAtIso: '2026-02-13T00:00:00.000Z',
    payload: {
      agentDefinitionId,
      agentName: 'Remote Agent',
      sourceNodeId: 'embedded-local',
      homeNodeId: 'remote-1',
    },
  };
}

function makeTeamCommand(teamDefinitionId: string): StartTeamRunCommand {
  return {
    commandId: 'cmd-team-1',
    commandType: 'START_TEAM_RUN',
    issuedAtIso: '2026-02-13T00:00:00.000Z',
    payload: {
      teamDefinitionId,
      teamName: 'Remote Team',
      sourceNodeId: 'embedded-local',
      homeNodeId: 'remote-1',
    },
  };
}

describe('node window command consumer', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
    navigateToMock.mockReset();
    navigateToMock.mockResolvedValue(undefined);
    setElectronApiMock(null);
  });

  it('prepares run and navigates when destination definition exists', async () => {
    const store = useAgentDefinitionStore();
    const runConfigStore = useAgentRunConfigStore();

    store.agentDefinitions = [
      {
        id: 'agent-1',
        name: 'Remote Agent',
        role: 'role',
        description: 'desc',
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
      },
    ] as any;
    (store.reloadAllAgentDefinitions as any) = vi.fn().mockResolvedValue(undefined);

    await handleStartAgentRunCommand(makeCommand('agent-1'));

    expect(runConfigStore.config?.agentDefinitionId).toBe('agent-1');
  });

  it('records ui error when destination definition is missing', async () => {
    const store = useAgentDefinitionStore();
    const uiErrorStore = useUiErrorStore();
    (store.reloadAllAgentDefinitions as any) = vi.fn().mockResolvedValue(undefined);
    store.agentDefinitions = [];

    await handleStartAgentRunCommand(makeCommand('missing-agent'));

    expect(uiErrorStore.errors.length).toBe(1);
    expect(uiErrorStore.errors[0]?.message).toContain('is no longer available on this node');
  });

  it('prepares team run when destination team definition exists', async () => {
    const store = useAgentTeamDefinitionStore();
    const teamRunConfigStore = useTeamRunConfigStore();

    store.agentTeamDefinitions = [
      {
        id: 'team-1',
        name: 'Remote Team',
        role: 'role',
        description: 'desc',
        avatarUrl: null,
        coordinatorMemberName: 'lead',
        nodes: [
          {
            memberName: 'lead',
            referenceType: 'AGENT',
            referenceId: 'agent-1',
          },
        ],
      },
    ] as any;
    (store.reloadAllAgentTeamDefinitions as any) = vi.fn().mockResolvedValue(undefined);

    await handleStartTeamRunCommand(makeTeamCommand('team-1'));

    expect(teamRunConfigStore.config?.teamDefinitionId).toBe('team-1');
  });

  it('records ui error when destination team definition is missing', async () => {
    const store = useAgentTeamDefinitionStore();
    const uiErrorStore = useUiErrorStore();
    (store.reloadAllAgentTeamDefinitions as any) = vi.fn().mockResolvedValue(undefined);
    store.agentTeamDefinitions = [];

    await handleStartTeamRunCommand(makeTeamCommand('missing-team'));

    expect(uiErrorStore.errors.length).toBe(1);
    expect(uiErrorStore.errors[0]?.message).toContain('is no longer available on this node');
  });

  it('registers electron listener and routes START_AGENT_RUN/START_TEAM_RUN commands', async () => {
    let listener: ((command: NodeWindowCommand) => void) | null = null;
    const cleanup = vi.fn();

    setElectronApiMock({
      onNodeWindowCommand: vi.fn().mockImplementation((callback) => {
        listener = callback as (command: NodeWindowCommand) => void;
        return cleanup;
      }),
    });

    const store = useAgentDefinitionStore();
    store.agentDefinitions = [
      {
        id: 'agent-1',
        name: 'Remote Agent',
        role: 'role',
        description: 'desc',
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
      },
    ] as any;
    (store.reloadAllAgentDefinitions as any) = vi.fn().mockResolvedValue(undefined);
    const teamStore = useAgentTeamDefinitionStore();
    teamStore.agentTeamDefinitions = [
      {
        id: 'team-1',
        name: 'Remote Team',
        role: 'role',
        description: 'desc',
        avatarUrl: null,
        coordinatorMemberName: 'lead',
        nodes: [
          {
            memberName: 'lead',
            referenceType: 'AGENT',
            referenceId: 'agent-1',
          },
        ],
      },
    ] as any;
    (teamStore.reloadAllAgentTeamDefinitions as any) = vi.fn().mockResolvedValue(undefined);

    const unsubscribe = installNodeWindowCommandConsumer();
    expect(typeof unsubscribe).toBe('function');
    expect(listener).not.toBeNull();

    listener?.(makeCommand('agent-1'));
    await Promise.resolve();
    await Promise.resolve();

    expect(useAgentRunConfigStore().config?.agentDefinitionId).toBe('agent-1');

    listener?.(makeTeamCommand('team-1'));
    await Promise.resolve();
    await Promise.resolve();

    expect(useTeamRunConfigStore().config?.teamDefinitionId).toBe('team-1');
    unsubscribe?.();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
