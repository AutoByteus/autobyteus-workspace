import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import type { AgentDefinition } from '~/stores/agentDefinitionStore';
import type { AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore';

/**
 * Composable for starting agent or team runs.
 * 
 * Ensures mutual exclusivity: when starting an agent, the team config is cleared and vice versa.
 * This is the single source of truth for "run" actions across the application.
 */
export function useRunActions() {
  const agentRunConfigStore = useAgentRunConfigStore();
  const teamRunConfigStore = useTeamRunConfigStore();
  const selectionStore = useAgentSelectionStore();

  /**
   * Prepares to run a new agent from a definition.
   * Clears any existing team config and selection.
   */
  const prepareAgentRun = (agentDef: AgentDefinition) => {
    teamRunConfigStore.clearConfig();
    agentRunConfigStore.setTemplate(agentDef);
    selectionStore.clearSelection();
  };

  /**
   * Prepares to run a new team from a definition.
   * Clears any existing agent config and selection.
   */
  const prepareTeamRun = (teamDef: AgentTeamDefinition) => {
    agentRunConfigStore.clearConfig();
    teamRunConfigStore.setTemplate(teamDef);
    selectionStore.clearSelection();
  };

  return { prepareAgentRun, prepareTeamRun };
}
