import { defineStore } from 'pinia';
import { useWorkspaceCenterViewStore } from '~/stores/workspaceCenterViewStore';

export type SelectionType = 'agent' | 'team';

interface AgentSelectionState {
  /** Currently selected run ID */
  selectedRunId: string | null;
  
  /** Type of the selected run */
  selectedType: SelectionType | null;
}

/**
 * Store for tracking which agent or team run is currently selected.
 */
export const useAgentSelectionStore = defineStore('agentSelection', {
  state: (): AgentSelectionState => ({
    selectedRunId: null,
    selectedType: null,
  }),

  getters: {
    isAgentSelected(): boolean {
        return this.selectedType === 'agent';
    },

    isTeamSelected(): boolean {
        return this.selectedType === 'team';
    },
  },

  actions: {
    /**
     * Select a run (agent or team).
     */
    selectRun(runId: string, type: SelectionType = 'agent') {
      this.selectedRunId = runId;
      this.selectedType = type;
      useWorkspaceCenterViewStore().showChat();
    },

    /**
     * Clear the current selection.
     */
    clearSelection() {
      this.selectedRunId = null;
      this.selectedType = null;
      useWorkspaceCenterViewStore().showChat();
    },
  },
});
