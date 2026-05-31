import { defineStore } from 'pinia';
import type { ToolApprovalTarget, ToolInvocationStatus } from '~/types/segments';
import type { CompactionStatusPhase } from '~/types/agent/AgentRunState';
import { isPlaceholderToolName } from '~/utils/toolNamePlaceholders';
import { canTransitionToolInvocationStatus } from '~/utils/toolInvocationStatus';

export type ToolActivityType = 'tool_call' | 'write_file' | 'terminal_command' | 'edit_file';

export interface ToolActivity {
  kind: 'tool';
  activityId: string;
  invocationId: string;
  toolName: string;
  type: ToolActivityType;
  status: ToolInvocationStatus;
  contextText: string;
  arguments: Record<string, any>;
  approvalTarget?: ToolApprovalTarget | null;
  logs: string[];
  result: any | null;
  error: string | null;
  timestamp: Date;
}

export interface CompactionActivity {
  kind: 'compaction';
  activityId: string;
  phase: CompactionStatusPhase;
  message: string;
  turnId?: string | null;
  selectedBlockCount?: number | null;
  compactedBlockCount?: number | null;
  rawTraceCount?: number | null;
  semanticFactCount?: number | null;
  compactionAgentDefinitionId?: string | null;
  compactionAgentName?: string | null;
  compactionRuntimeKind?: string | null;
  compactionModelIdentifier?: string | null;
  compactionRunId?: string | null;
  compactionTaskId?: string | null;
  provider?: string | null;
  sourceSurface?: string | null;
  boundaryKey?: string | null;
  providerEventId?: string | null;
  providerSessionId?: string | null;
  trigger?: string | null;
  preTokens?: number | null;
  rotationEligible?: boolean | null;
  errorMessage?: string | null;
  timestamp: Date;
  updatedAt: Date;
}

export type RunActivity = ToolActivity | CompactionActivity;

interface AgentActivities {
  activities: RunActivity[];
  hasAwaitingApproval: boolean;
  highlightedActivityId: string | null;
}

const isValidActivityId = (activityId: unknown): activityId is string =>
  typeof activityId === 'string' && activityId.trim().length > 0;

const isValidToolInvocationId = (invocationId: unknown): invocationId is string =>
  typeof invocationId === 'string' && invocationId.trim().length > 0;

const isToolActivity = (activity: RunActivity): activity is ToolActivity => activity.kind === 'tool';
const isCompactionActivity = (activity: RunActivity): activity is CompactionActivity => activity.kind === 'compaction';

export const useAgentActivityStore = defineStore('agentActivity', {
  state: () => ({
    activitiesByRunId: new Map<string, AgentActivities>(),
  }),

  getters: {
    getActivities: (state) => (runId: string): RunActivity[] => {
      return state.activitiesByRunId.get(runId)?.activities.filter((activity) =>
        isValidActivityId(activity?.activityId),
      ) ?? [];
    },

    getToolActivities: (state) => (runId: string): ToolActivity[] => {
      const activities = state.activitiesByRunId.get(runId)?.activities ?? [];
      return activities.filter(
        (activity): activity is ToolActivity =>
          isToolActivity(activity) && isValidToolInvocationId(activity.invocationId),
      );
    },

    getCompactionActivities: (state) => (runId: string): CompactionActivity[] => {
      const activities = state.activitiesByRunId.get(runId)?.activities ?? [];
      return activities.filter(isCompactionActivity);
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
        (a) => a.kind === 'tool' && a.status === 'awaiting-approval'
      );
    },

    addActivity(runId: string, activity: RunActivity) {
      if (!isValidActivityId(activity.activityId)) {
        console.warn('[agentActivityStore] Dropping activity with invalid activityId', activity);
        return;
      }
      if (activity.kind === 'tool' && !isValidToolInvocationId(activity.invocationId)) {
        console.warn('[agentActivityStore] Dropping tool activity with invalid invocationId', activity);
        return;
      }
      const state = this._ensureRunState(runId);
      if (state.activities.some((a) => a.activityId === activity.activityId)) {
        return;
      }
      state.activities.push(activity);
      this._updateAwaitingFlag(state);
    },

    addToolActivity(runId: string, activity: ToolActivity) {
      this.addActivity(runId, activity);
    },

    upsertCompactionActivity(runId: string, activity: CompactionActivity) {
      if (!isValidActivityId(activity.activityId)) {
        console.warn('[agentActivityStore] Dropping compaction activity with invalid activityId', activity);
        return;
      }
      const state = this._ensureRunState(runId);
      const existing = state.activities.find(
        (item): item is CompactionActivity =>
          item.kind === 'compaction' && item.activityId === activity.activityId,
      );
      if (!existing) {
        state.activities.push(activity);
        return;
      }

      const originalTimestamp = existing.timestamp;
      Object.assign(existing, activity, { timestamp: originalTimestamp });
    },

    updateToolActivityStatus(
      runId: string,
      invocationId: string,
      status: ToolInvocationStatus
    ) {
      const state = this._ensureRunState(runId);
      const activity = state.activities.find(
        (a): a is ToolActivity => a.kind === 'tool' && a.invocationId === invocationId,
      );
      if (activity) {
        if (!canTransitionToolInvocationStatus(activity.status, status)) {
          return;
        }
        activity.status = status;
        this._updateAwaitingFlag(state);
      }
    },

    addToolActivityLog(runId: string, invocationId: string, log: string) {
      const state = this._ensureRunState(runId);
      const activity = state.activities.find(
        (a): a is ToolActivity => a.kind === 'tool' && a.invocationId === invocationId,
      );
      if (activity) {
        activity.logs.push(log);
      }
    },

    setToolActivityResult(runId: string, invocationId: string, result: any, error: string | null = null) {
      const state = this._ensureRunState(runId);
      const activity = state.activities.find(
        (a): a is ToolActivity => a.kind === 'tool' && a.invocationId === invocationId,
      );
      if (activity) {
        activity.result = result;
        activity.error = error;
      }
    },

    updateToolActivityArguments(runId: string, invocationId: string, args: Record<string, any>) {
      const state = this._ensureRunState(runId);
      const activity = state.activities.find(
        (a): a is ToolActivity => a.kind === 'tool' && a.invocationId === invocationId,
      );
      if (activity) {
        activity.arguments = { ...activity.arguments, ...args };
      }
    },

    updateToolActivityApprovalTarget(runId: string, invocationId: string, approvalTarget: ToolApprovalTarget | null) {
      const state = this._ensureRunState(runId);
      const activity = state.activities.find(
        (a): a is ToolActivity => a.kind === 'tool' && a.invocationId === invocationId,
      );
      if (activity) {
        activity.approvalTarget = approvalTarget;
      }
    },

    updateToolActivityToolName(runId: string, invocationId: string, toolName: string) {
      if (typeof toolName !== 'string' || toolName.trim().length === 0) {
        return;
      }
      const state = this._ensureRunState(runId);
      const activity = state.activities.find(
        (a): a is ToolActivity => a.kind === 'tool' && a.invocationId === invocationId,
      );
      if (!activity) {
        return;
      }
      if (isPlaceholderToolName(activity.toolName)) {
        activity.toolName = toolName;
      }
    },

    setHighlightedActivity(runId: string, activityId: string | null) {
      const state = this._ensureRunState(runId);
      state.highlightedActivityId = activityId;
    },

    clearActivities(runId: string) {
      this.activitiesByRunId.delete(runId);
    }
  },
});
