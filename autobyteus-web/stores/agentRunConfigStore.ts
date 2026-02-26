import { defineStore } from 'pinia';
import type { AgentDefinition } from '~/stores/agentDefinitionStore';
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig';

/**
 * State for workspace loading (eager loading feature).
 */
interface WorkspaceLoadingState {
  isLoading: boolean;
  error: string | null;
  loadedPath: string | null;
}

interface AgentRunConfigState {
  /** Current configuration buffer (for new runs mostly) */
  config: AgentRunConfig | null;
  
  /** Whether the Run Config panel is expanded */
  isPanelExpanded: boolean;
  
  /** Whether at least one message has been sent (UI state) */
  hasFirstMessageSent: boolean;
  
  /** Workspace loading state for eager loading */
  workspaceLoadingState: WorkspaceLoadingState;
}

/**
 * Store for managing agent run configuration buffer (template).
 * This is the agent-only version - teams have their own store.
 */
export const useAgentRunConfigStore = defineStore('agentRunConfig', {
  state: (): AgentRunConfigState => ({
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
     * Check if the required configuration is complete (model + workspace selected).
     */
    isConfigured(): boolean {
      return !!this.config?.llmModelIdentifier && !!this.config?.workspaceId;
    },

    /**
     * Display name from the agent definition.
     */
    displayName(): string {
      return this.config?.agentDefinitionName ?? '';
    },
  },

  actions: {
    /**
     * Set the config from an agent definition (new run template).
     */
    setTemplate(agentDefinition: AgentDefinition) {
      this.config = {
        agentDefinitionId: agentDefinition.id,
        agentDefinitionName: agentDefinition.name,
        agentAvatarUrl: agentDefinition.avatarUrl ?? null,
        llmModelIdentifier: '',
        workspaceId: null,
        autoExecuteTools: false,
        skillAccessMode: 'PRELOADED_ONLY',
        isLocked: false,
      };
      this.isPanelExpanded = true;
      this.hasFirstMessageSent = false;
      this.clearWorkspaceState();
    },

    /**
     * Load config from an existing run (edit mode).
     */
    setAgentConfig(config: AgentRunConfig) {
        this.config = {
          ...config,
          skillAccessMode: config.skillAccessMode ?? 'PRELOADED_ONLY',
        };
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
    updateAgentConfig(updates: Partial<AgentRunConfig>) {
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
