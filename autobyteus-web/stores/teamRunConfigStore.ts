import { defineStore } from 'pinia';
import type { AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore';
import { type TeamRunConfig, createDefaultTeamRunConfig } from '~/types/agent/TeamRunConfig';

/**
 * State for workspace loading (eager loading feature).
 */
interface WorkspaceLoadingState {
  isLoading: boolean;
  error: string | null;
  loadedPath: string | null;
}

interface TeamRunConfigState {
  /** Current configuration buffer (primarily for new team runs) */
  config: TeamRunConfig | null;
  
  /** Whether the Run Config panel is expanded */
  isPanelExpanded: boolean;
  
  /** Whether at least one message has been sent (UI state) */
  hasFirstMessageSent: boolean;
  
  /** Workspace loading state for eager loading */
  workspaceLoadingState: WorkspaceLoadingState;
}

/**
 * Store for managing agent TEAM run configuration buffer (template).
 */
export const useTeamRunConfigStore = defineStore('teamRunConfig', {
  state: (): TeamRunConfigState => ({
    config: null,
    isPanelExpanded: true,
    hasFirstMessageSent: false,
    workspaceLoadingState: {
      isLoading: false,
      error: null,
      loadedPath: null,
    },
  }),

  getters: {
    /**
     * Whether a config is set.
     */
    hasConfig(): boolean {
      return this.config !== null;
    },

    /**
     * Check if the required configuration is complete (model selected).
     */
    isConfigured(): boolean {
      return !!this.config?.llmModelIdentifier;
    },

    /**
     * Display name from the agent definition.
     */
    displayName(): string {
      return this.config?.teamDefinitionName ?? '';
    },
  },

  actions: {
    /**
     * Set the config from an agent definition (new run template).
     */
    setTemplate(teamDefinition: AgentTeamDefinition) {
      this.config = createDefaultTeamRunConfig(teamDefinition);
      this.isPanelExpanded = true;
      this.hasFirstMessageSent = false;
      this.clearWorkspaceState();
    },

    /**
     * Load config from an existing run (Edit Mode).
     */
    setConfig(config: TeamRunConfig) {
        this.config = config;
        this.isPanelExpanded = true;
        this.hasFirstMessageSent = false;

        this.workspaceLoadingState = {
          isLoading: false,
          error: null,
          loadedPath: null,
        };
    },

    /**
     * Update config fields.
     */
    updateConfig(updates: Partial<TeamRunConfig>) {
      if (this.config) {
        Object.assign(this.config, updates);
      }
    },

    /**
     * Set workspace loading state.
     */
    setWorkspaceLoading(isLoading: boolean) {
      this.workspaceLoadingState.isLoading = isLoading;
      if (isLoading) {
        this.workspaceLoadingState.error = null;
      }
    },

    /**
     * Set workspace as successfully loaded.
     */
    setWorkspaceLoaded(workspaceId: string, path: string) {
      this.workspaceLoadingState.isLoading = false;
      this.workspaceLoadingState.loadedPath = path;
      this.workspaceLoadingState.error = null;
      if (this.config) {
        this.config.workspaceId = workspaceId;
      }
    },

    /**
     * Set workspace loading error.
     */
    setWorkspaceError(error: string) {
      this.workspaceLoadingState.isLoading = false;
      this.workspaceLoadingState.error = error;
    },

    /**
     * Clear workspace loading state.
     */
    clearWorkspaceState() {
      this.workspaceLoadingState = {
        isLoading: false,
        error: null,
        loadedPath: null,
      };
      if (this.config) {
        this.config.workspaceId = null;
      }
    },

    /**
     * Collapse the panel.
     */
    collapsePanel() {
      this.isPanelExpanded = false;
    },

    /**
     * Expand the panel.
     */
    expandPanel() {
      this.isPanelExpanded = true;
    },

    /**
     * Toggle panel expansion state.
     */
    togglePanel() {
      this.isPanelExpanded = !this.isPanelExpanded;
    },

    /**
     * Mark that the first message has been sent.
     */
    markFirstMessageSent() {
      this.hasFirstMessageSent = true;
      this.collapsePanel();
    },

    /**
     * Clear the config and reset to initial state.
     */
    clearConfig() {
      this.config = null;
      this.isPanelExpanded = true;
      this.hasFirstMessageSent = false;
      this.clearWorkspaceState();
    },
  },
});
