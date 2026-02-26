import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore';
import { useUiErrorStore } from '~/stores/uiErrorStore';
import { useRunActions } from '~/composables/useRunActions';
import type {
  NodeWindowCommand,
  StartAgentRunCommand,
  StartTeamRunCommand,
} from '~/types/node-window-command';

function isStartAgentRunCommand(command: NodeWindowCommand): command is StartAgentRunCommand {
  return command.commandType === 'START_AGENT_RUN';
}

function isStartTeamRunCommand(command: NodeWindowCommand): command is StartTeamRunCommand {
  return command.commandType === 'START_TEAM_RUN';
}

export async function handleStartAgentRunCommand(command: StartAgentRunCommand): Promise<void> {
  const agentDefinitionStore = useAgentDefinitionStore();
  const uiErrorStore = useUiErrorStore();
  const { prepareAgentRun } = useRunActions();

  try {
    await agentDefinitionStore.reloadAllAgentDefinitions();
    const agentDefinition = agentDefinitionStore.getAgentDefinitionById(command.payload.agentDefinitionId);

    if (!agentDefinition) {
      throw new Error(
        `Agent '${command.payload.agentName}' is no longer available on this node. Please refresh catalog and retry.`,
      );
    }

    prepareAgentRun(agentDefinition);
    await navigateTo('/workspace');
  } catch (error) {
    uiErrorStore.push(error, 'custom');
  }
}

export async function handleStartTeamRunCommand(command: StartTeamRunCommand): Promise<void> {
  const teamDefinitionStore = useAgentTeamDefinitionStore();
  const uiErrorStore = useUiErrorStore();
  const { prepareTeamRun } = useRunActions();

  try {
    await teamDefinitionStore.reloadAllAgentTeamDefinitions();
    const teamDefinition = teamDefinitionStore.getAgentTeamDefinitionById(command.payload.teamDefinitionId);

    if (!teamDefinition) {
      throw new Error(
        `Team '${command.payload.teamName}' is no longer available on this node. Please refresh catalog and retry.`,
      );
    }

    prepareTeamRun(teamDefinition);
    await navigateTo('/workspace');
  } catch (error) {
    uiErrorStore.push(error, 'custom');
  }
}

export function installNodeWindowCommandConsumer(): (() => void) | undefined {
  if (!window.electronAPI?.onNodeWindowCommand) {
    return undefined;
  }

  return window.electronAPI.onNodeWindowCommand((command: NodeWindowCommand) => {
    if (isStartAgentRunCommand(command)) {
      void handleStartAgentRunCommand(command);
      return;
    }
    if (isStartTeamRunCommand(command)) {
      void handleStartTeamRunCommand(command);
    }
  });
}

export default defineNuxtPlugin(() => {
  installNodeWindowCommandConsumer();
});
