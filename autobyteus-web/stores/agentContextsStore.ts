import { defineStore } from 'pinia';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { DEFAULT_AGENT_RUNTIME_KIND, type AgentRunConfig } from '~/types/agent/AgentRunConfig';
import type { Conversation } from '~/types/conversation';
import { AgentStatus } from '~/types/agent/AgentStatus';

interface AgentContextsStoreState {
  /** All running agent contexts, keyed by runId */
  runs: Map<string, AgentContext>;
}

let temporaryRunSequence = 0

/**
 * @store agentContexts
 * @description Central repository for active agent context state.
 */
export const useAgentContextsStore = defineStore('agentContexts', {
  state: (): AgentContextsStoreState => ({
    runs: new Map(),
  }),

  getters: {
    /**
     * Currently selected agent run (via selection store).
     */
    activeRun(): AgentContext | undefined {
      const selectionStore = useAgentSelectionStore();
      if (selectionStore.selectedType !== 'agent' || !selectionStore.selectedRunId) return undefined;
      return this.runs.get(selectionStore.selectedRunId);
    },

    /**
     * Runs grouped by agent definition id.
     */
    runsByDefinition(): Map<string, AgentContext[]> {
      const grouped = new Map<string, AgentContext[]>();
      for (const run of this.runs.values()) {
        const defId = run.config.agentDefinitionId;
        if (!grouped.has(defId)) grouped.set(defId, []);
        grouped.get(defId)!.push(run);
      }
      return grouped;
    },

    /**
     * Get run by ID.
     */
    getRun: (state) => (id: string) => state.runs.get(id),

    /**
     * Get config for a specific run.
     */
    getConfigForRun: (state) => (id: string): AgentRunConfig | null => {
      return state.runs.get(id)?.config ?? null;
    },
  },

  actions: {
    /**
     * Create a new agent run from the current run config template.
     * Sets it as the selected run.
     */
    createRunFromTemplate(): string {
      const configStore = useAgentRunConfigStore();
      const template = configStore.config;

      if (!template) {
        throw new Error('No run config template available');
      }

      const config: AgentRunConfig = {
        agentDefinitionId: template.agentDefinitionId,
        agentDefinitionName: template.agentDefinitionName,
        agentAvatarUrl: template.agentAvatarUrl ?? null,
        llmModelIdentifier: template.llmModelIdentifier,
        runtimeKind: template.runtimeKind ?? DEFAULT_AGENT_RUNTIME_KIND,
        workspaceId: template.workspaceId,
        autoExecuteTools: template.autoExecuteTools,
        skillAccessMode: template.skillAccessMode,
        llmConfig: template.llmConfig ?? null,
        isLocked: false,
      };

      const tempId = `temp-${Date.now()}-${++temporaryRunSequence}`;
      const conversation: Conversation = {
        id: tempId,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        agentDefinitionId: template.agentDefinitionId,
      };

      const runState = new AgentRunState(tempId, conversation);
      const runContext = new AgentContext(config, runState);
      this.runs.set(tempId, runContext);

      const selectionStore = useAgentSelectionStore();
      selectionStore.selectRun(tempId, 'agent');

      return tempId;
    },

    /**
     * Remove a run.
     * If the removed run was selected, auto-select another remaining run.
     */
    removeRun(runId: string) {
      const selectionStore = useAgentSelectionStore();
      const isSelected = selectionStore.selectedType === 'agent' && selectionStore.selectedRunId === runId;

      if (this.runs.has(runId)) {
        this.runs.delete(runId);
        if (isSelected) {
          // Auto-select another agent run if available
          const remainingRunIds = Array.from(this.runs.keys());
          if (remainingRunIds.length > 0) {
            selectionStore.selectRun(remainingRunIds[0], 'agent');
          } else {
            selectionStore.clearSelection();
          }
        }
      }
    },

    /**
     * Lock the configuration of a run (e.g. after first message).
     */
    lockConfig(runId: string) {
      const run = this.runs.get(runId);
      if (run) {
        run.config.isLocked = true;
      }
    },

    /**
     * Promote a temporary ID (pre-run) to a permanent ID (from backend).
     */
    promoteTemporaryId(tempId: string, permanentId: string) {
      const runContext = this.runs.get(tempId);
      if (!runContext) return;

      this.runs.delete(tempId);
      runContext.state.promoteTemporaryId(permanentId);
      this.runs.set(permanentId, runContext);

      const selectionStore = useAgentSelectionStore();
      if (selectionStore.selectedType === 'agent' && selectionStore.selectedRunId === tempId) {
        selectionStore.selectRun(permanentId, 'agent');
      }
    },

    /**
     * Hydrate or replace an existing run from persisted run projection data.
     */
    hydrateFromProjection(options: {
      runId: string;
      config: AgentRunConfig;
      conversation: Conversation;
      status?: AgentStatus;
    }) {
      this.upsertProjectionContext(options);
    },

    /**
     * Upsert a run from persisted projection data.
     * This is the explicit state-ownership API for restore/hydration flows.
     */
    upsertProjectionContext(options: {
      runId: string;
      config: AgentRunConfig;
      conversation: Conversation;
      status?: AgentStatus;
    }) {
      const existing = this.runs.get(options.runId);
      const nextStatus = options.status ?? AgentStatus.Idle;

      if (existing) {
        existing.config = {
          ...options.config,
        };
        existing.state.runId = options.runId;
        existing.state.conversation = options.conversation;
        existing.state.currentStatus = nextStatus;
        return;
      }

      const state = new AgentRunState(options.runId, options.conversation);
      state.currentStatus = nextStatus;
      const runContext = new AgentContext(options.config, state);
      this.runs.set(options.runId, runContext);
    },

    /**
     * Patch only runtime config fields for an existing context without replacing
     * conversation or status state.
     */
    patchConfigOnly(runId: string, patch: Partial<AgentRunConfig>): boolean {
      const run = this.runs.get(runId);
      if (!run) {
        return false;
      }

      run.config = {
        ...run.config,
        ...patch,
      };
      return true;
    },
  },
});
