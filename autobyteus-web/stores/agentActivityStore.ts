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
    activitiesByAgentId: new Map<string, AgentActivities>(),
  }),

  getters: {
    getActivities: (state) => (agentId: string): ToolActivity[] => {
      const activities = state.activitiesByAgentId.get(agentId)?.activities ?? [];
      return activities.filter(
        (activity) =>
          typeof activity?.invocationId === 'string' && activity.invocationId.trim().length > 0
      );
    },
    
    hasAwaitingApproval: (state) => (agentId: string): boolean => {
      return state.activitiesByAgentId.get(agentId)?.hasAwaitingApproval ?? false;
    },

    getHighlightedActivityId: (state) => (agentId: string): string | null => {
      return state.activitiesByAgentId.get(agentId)?.highlightedActivityId ?? null;
    }
  },

  actions: {
    _ensureAgentState(agentId: string) {
      if (!this.activitiesByAgentId.has(agentId)) {
        this.activitiesByAgentId.set(agentId, {
          activities: [],
          hasAwaitingApproval: false,
          highlightedActivityId: null,
        });
      }
      return this.activitiesByAgentId.get(agentId)!;
    },

    _updateAwaitingFlag(agentState: AgentActivities) {
      agentState.hasAwaitingApproval = agentState.activities.some(
        (a) => a.status === 'awaiting-approval'
      );
    },

    addActivity(agentId: string, activity: ToolActivity) {
      if (typeof activity.invocationId !== 'string' || activity.invocationId.trim().length === 0) {
        console.warn('[agentActivityStore] Dropping activity with invalid invocationId', activity);
        return;
      }
      const state = this._ensureAgentState(agentId);
      // Avoid duplicates
      if (state.activities.some((a) => a.invocationId === activity.invocationId)) {
        return;
      }
      state.activities.push(activity);
      this._updateAwaitingFlag(state);
    },

    updateActivityStatus(
      agentId: string,
      invocationId: string,
      status: ToolInvocationStatus
    ) {
      const state = this._ensureAgentState(agentId);
      const activity = state.activities.find((a) => a.invocationId === invocationId);
      if (activity) {
        activity.status = status;
        this._updateAwaitingFlag(state);
      }
    },

    addActivityLog(agentId: string, invocationId: string, log: string) {
      const state = this._ensureAgentState(agentId);
      const activity = state.activities.find((a) => a.invocationId === invocationId);
      if (activity) {
        activity.logs.push(log);
      }
    },

    setActivityResult(agentId: string, invocationId: string, result: any, error: string | null = null) {
      const state = this._ensureAgentState(agentId);
      const activity = state.activities.find((a) => a.invocationId === invocationId);
      if (activity) {
        activity.result = result;
        activity.error = error;
        // Status typically updated separately, but error implies error status? 
        // We leave status update explicit to keep it flexible.
      }
    },

    updateActivityArguments(agentId: string, invocationId: string, args: Record<string, any>) {
      const state = this._ensureAgentState(agentId);
      const activity = state.activities.find((a) => a.invocationId === invocationId);
      if (activity) {
        activity.arguments = { ...activity.arguments, ...args };
      }
    },

    updateActivityToolName(agentId: string, invocationId: string, toolName: string) {
      if (typeof toolName !== 'string' || toolName.trim().length === 0) {
        return;
      }
      const state = this._ensureAgentState(agentId);
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

    setHighlightedActivity(agentId: string, invocationId: string | null) {
      const state = this._ensureAgentState(agentId);
      state.highlightedActivityId = invocationId;
    },
    
    clearActivities(agentId: string) {
      this.activitiesByAgentId.delete(agentId);
    }
  },
});
