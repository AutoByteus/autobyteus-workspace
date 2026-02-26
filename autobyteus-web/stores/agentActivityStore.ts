import { defineStore } from 'pinia';
import type { ToolInvocationStatus } from '~/types/segments';

export interface ToolActivity {
  invocationId: string;
  toolName: string;
  type: 'tool_call' | 'write_file' | 'terminal_command' | 'edit_file';
  status: ToolInvocationStatus;
  contextText: string; // e.g. "file.py" or "npm install"
  arguments: Record<string, any>;
  logs: string[];
  result: any | null;
  error: string | null;
  timestamp: Date;
}

interface AgentActivities {
  activities: ToolActivity[];
  hasAwaitingApproval: boolean;
  highlightedActivityId: string | null;
}

export const useAgentActivityStore = defineStore('agentActivity', {
  state: () => ({
    activitiesByRunId: new Map<string, AgentActivities>(),
  }),

  getters: {
    getActivities: (state) => (runId: string): ToolActivity[] => {
      const activities = state.activitiesByRunId.get(runId)?.activities ?? [];
      return activities.filter(
        (activity) =>
          typeof activity?.invocationId === 'string' && activity.invocationId.trim().length > 0
      );
    },
    
    hasAwaitingApproval: (state) => (runId: string): boolean => {
      return state.activitiesByRunId.get(runId)?.hasAwaitingApproval ?? false;
    },

    getHighlightedActivityId: (state) => (runId: string): string | null => {
      return state.activitiesByRunId.get(runId)?.highlightedActivityId ?? null;
    }
  },

  actions: {
    _ensureRunState(runId: string) {
      if (!this.activitiesByRunId.has(runId)) {
        this.activitiesByRunId.set(runId, {
          activities: [],
          hasAwaitingApproval: false,
          highlightedActivityId: null,
        });
      }
      return this.activitiesByRunId.get(runId)!;
    },

    _updateAwaitingFlag(agentState: AgentActivities) {
      agentState.hasAwaitingApproval = agentState.activities.some(
        (a) => a.status === 'awaiting-approval'
      );
    },

    addActivity(runId: string, activity: ToolActivity) {
      if (typeof activity.invocationId !== 'string' || activity.invocationId.trim().length === 0) {
        console.warn('[agentActivityStore] Dropping activity with invalid invocationId', activity);
        return;
      }
      const state = this._ensureRunState(runId);
      // Avoid duplicates
      if (state.activities.some((a) => a.invocationId === activity.invocationId)) {
        return;
      }
      state.activities.push(activity);
      this._updateAwaitingFlag(state);
    },

    updateActivityStatus(
      runId: string,
      invocationId: string,
      status: ToolInvocationStatus
    ) {
      const state = this._ensureRunState(runId);
      const activity = state.activities.find((a) => a.invocationId === invocationId);
      if (activity) {
        activity.status = status;
        this._updateAwaitingFlag(state);
      }
    },

    addActivityLog(runId: string, invocationId: string, log: string) {
      const state = this._ensureRunState(runId);
      const activity = state.activities.find((a) => a.invocationId === invocationId);
      if (activity) {
        activity.logs.push(log);
      }
    },

    setActivityResult(runId: string, invocationId: string, result: any, error: string | null = null) {
      const state = this._ensureRunState(runId);
      const activity = state.activities.find((a) => a.invocationId === invocationId);
      if (activity) {
        activity.result = result;
        activity.error = error;
        // Status typically updated separately, but error implies error status? 
        // We leave status update explicit to keep it flexible.
      }
    },

    updateActivityArguments(runId: string, invocationId: string, args: Record<string, any>) {
      const state = this._ensureRunState(runId);
      const activity = state.activities.find((a) => a.invocationId === invocationId);
      if (activity) {
        activity.arguments = { ...activity.arguments, ...args };
      }
    },

    updateActivityToolName(runId: string, invocationId: string, toolName: string) {
      if (typeof toolName !== 'string' || toolName.trim().length === 0) {
        return;
      }
      const state = this._ensureRunState(runId);
      const activity = state.activities.find((a) => a.invocationId === invocationId);
      if (!activity) {
        return;
      }
      if (
        activity.toolName === 'MISSING_TOOL_NAME' ||
        activity.toolName.trim().length === 0 ||
        activity.toolName === 'tool_call'
      ) {
        activity.toolName = toolName;
      }
    },

    setHighlightedActivity(runId: string, invocationId: string | null) {
      const state = this._ensureRunState(runId);
      state.highlightedActivityId = invocationId;
    },
    
    clearActivities(runId: string) {
      this.activitiesByRunId.delete(runId);
    }
  },
});
