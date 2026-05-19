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
    setRunSelection(runId: string, type: SelectionType = 'agent') {
      this.selectedRunId = runId;
      this.selectedType = type;
    },

    clearRunSelection() {
      this.selectedRunId = null;
      this.selectedType = null;
    },

    /**
     * Select a run without invoking a shell navigation side effect.
     * Mobile and other non-desktop shells use this pure domain selection path.
     */
    selectRunWithoutShellNavigation(runId: string, type: SelectionType = 'agent') {
      this.setRunSelection(runId, type);
    },

    clearSelectionWithoutShellNavigation() {
      this.clearRunSelection();
    },

    /**
     * Select a run (agent or team) for the desktop workspace shell.
     */
    selectRun(runId: string, type: SelectionType = 'agent') {
      this.setRunSelection(runId, type);
      useWorkspaceCenterViewStore().showChat();
    },

    /**
     * Clear the current desktop workspace selection.
     */
    clearSelection() {
      this.clearRunSelection();
      useWorkspaceCenterViewStore().showChat();
    },
  },
});
