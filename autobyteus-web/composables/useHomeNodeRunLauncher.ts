import { EMBEDDED_NODE_ID } from '~/types/node';
import {
  type NodeWindowCommand,
  type StartAgentRunCommand,
  type StartTeamRunCommand,
} from '~/types/node-window-command';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore';
import { useNodeStore } from '~/stores/nodeStore';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { useRunActions } from '~/composables/useRunActions';

export interface HomeNodeRunnableAgent {
  homeNodeId: string;
  definitionId: string;
  name: string;
}

export interface HomeNodeRunnableTeam {
  homeNodeId: string;
  definitionId: string;
  name: string;
}

function generateCommandId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `cmd-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export function buildStartAgentRunCommand(input: {
  agent: HomeNodeRunnableAgent;
  sourceNodeId: string;
}): StartAgentRunCommand {
  return {
    commandId: generateCommandId(),
    commandType: 'START_AGENT_RUN',
    issuedAtIso: new Date().toISOString(),
    payload: {
      agentDefinitionId: input.agent.definitionId,
      agentName: input.agent.name,
      sourceNodeId: input.sourceNodeId,
      homeNodeId: input.agent.homeNodeId,
    },
  };
}

export function buildStartTeamRunCommand(input: {
  team: HomeNodeRunnableTeam;
  sourceNodeId: string;
}): StartTeamRunCommand {
  return {
    commandId: generateCommandId(),
    commandType: 'START_TEAM_RUN',
    issuedAtIso: new Date().toISOString(),
    payload: {
      teamDefinitionId: input.team.definitionId,
      teamName: input.team.name,
      sourceNodeId: input.sourceNodeId,
      homeNodeId: input.team.homeNodeId,
    },
  };
}

export function useHomeNodeRunLauncher() {
  const nodeStore = useNodeStore();
  const agentDefinitionStore = useAgentDefinitionStore();
  const agentTeamDefinitionStore = useAgentTeamDefinitionStore();
  const windowNodeContextStore = useWindowNodeContextStore();
  const { prepareAgentRun, prepareTeamRun } = useRunActions();

  const launchLocal = async (agent: HomeNodeRunnableAgent): Promise<void> => {
    if (agentDefinitionStore.agentDefinitions.length === 0) {
      await agentDefinitionStore.fetchAllAgentDefinitions();
    }

    const localDefinition = agentDefinitionStore.getAgentDefinitionById(agent.definitionId);
    if (!localDefinition) {
      throw new Error(`Agent definition '${agent.definitionId}' is not available on this node.`);
    }

    prepareAgentRun(localDefinition);
    await navigateTo('/workspace');
  };

  const launchLocalTeam = async (team: HomeNodeRunnableTeam): Promise<void> => {
    if (agentTeamDefinitionStore.agentTeamDefinitions.length === 0) {
      await agentTeamDefinitionStore.fetchAllAgentTeamDefinitions();
    }

    const localDefinition = agentTeamDefinitionStore.getAgentTeamDefinitionById(team.definitionId);
    if (!localDefinition) {
      throw new Error(`Team definition '${team.definitionId}' is not available on this node.`);
    }

    prepareTeamRun(localDefinition);
    await navigateTo('/workspace');
  };

  const dispatchRemoteCommand = async (homeNodeId: string, command: NodeWindowCommand): Promise<void> => {
    if (!window.electronAPI?.dispatchNodeWindowCommand) {
      throw new Error('Remote run handoff requires Electron desktop runtime.');
    }

    await nodeStore.ensureNodeWindowReady(homeNodeId);

    const result = await window.electronAPI.dispatchNodeWindowCommand(homeNodeId, command);
    if (!result.accepted) {
      throw new Error(result.reason || 'Failed to hand off run to destination node window.');
    }
  };

  const launchFromCatalogAgent = async (agent: HomeNodeRunnableAgent): Promise<void> => {
    const sourceNodeId = windowNodeContextStore.nodeId || EMBEDDED_NODE_ID;
    if (agent.homeNodeId === sourceNodeId) {
      await launchLocal(agent);
      return;
    }
    await dispatchRemoteCommand(agent.homeNodeId, buildStartAgentRunCommand({
      agent,
      sourceNodeId,
    }));
  };

  const launchFromCatalogTeam = async (team: HomeNodeRunnableTeam): Promise<void> => {
    const sourceNodeId = windowNodeContextStore.nodeId || EMBEDDED_NODE_ID;
    if (team.homeNodeId === sourceNodeId) {
      await launchLocalTeam(team);
      return;
    }
    await dispatchRemoteCommand(team.homeNodeId, buildStartTeamRunCommand({
      team,
      sourceNodeId,
    }));
  };

  return {
    launchFromCatalogAgent,
    launchFromCatalogTeam,
  };
}
