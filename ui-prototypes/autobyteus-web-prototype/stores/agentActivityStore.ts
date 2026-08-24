import { defineStore } from 'pinia';
import type { ToolApprovalTarget, ToolInvocationStatus } from '~/types/segments';
import { isPlaceholderToolName } from '~/utils/toolNamePlaceholders';
import { canTransitionToolInvocationStatus } from '~/utils/toolInvocationStatus';
import {
  isRunActivityComplete,
  RUN_ACTIVITY_WINDOW_LIMIT,
} from '~/services/activity/runActivityWindowPolicy';
import type {
  CompactionActivity,
  RunActivity,
  SystemInstructionActivity,
  ToolActivity,
} from '~/types/activity/RunActivity';

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

const presentationValuesEqual = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) return true;
  if (left instanceof Date && right instanceof Date) return left.getTime() === right.getTime();
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((value, index) => presentationValuesEqual(value, right[index]));
  }
  if (left && right && typeof left === 'object' && typeof right === 'object') {
    const leftRecord = left as Record<string, unknown>;
    const rightRecord = right as Record<string, unknown>;
    const keys = new Set([...Object.keys(leftRecord), ...Object.keys(rightRecord)]);
    return [...keys].every((key) => presentationValuesEqual(leftRecord[key], rightRecord[key]));
  }
  return false;
};

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

    _enforceRecentWindow(agentState: AgentActivities): boolean {
      let overflow = agentState.activities.length - RUN_ACTIVITY_WINDOW_LIMIT;
      if (overflow <= 0) {
        this._updateAwaitingFlag(agentState);
        return false;
      }
      const removedIds = new Set<string>();
      for (const activity of agentState.activities) {
        if (overflow === 0) break;
        if (!isRunActivityComplete(activity)) continue;
        removedIds.add(activity.activityId);
        overflow -= 1;
      }
      for (const activity of agentState.activities) {
        if (overflow === 0) break;
        if (removedIds.has(activity.activityId)) continue;
        removedIds.add(activity.activityId);
        overflow -= 1;
      }
      agentState.activities = agentState.activities.filter((activity) => !removedIds.has(activity.activityId));
      if (agentState.highlightedActivityId && removedIds.has(agentState.highlightedActivityId)) {
        agentState.highlightedActivityId = null;
      }
      this._updateAwaitingFlag(agentState);
      return removedIds.size > 0;
    },

    addActivity(runId: string, activity: RunActivity): boolean {
      if (!isValidActivityId(activity.activityId)) {
        console.warn('[agentActivityStore] Dropping activity with invalid activityId', activity);
        return false;
      }
      if (activity.kind === 'tool' && !isValidToolInvocationId(activity.invocationId)) {
        console.warn('[agentActivityStore] Dropping tool activity with invalid invocationId', activity);
        return false;
      }
      const state = this._ensureRunState(runId);
      if (state.activities.some((a) => a.activityId === activity.activityId)) {
        return false;
      }
      state.activities.push(activity);
      this._enforceRecentWindow(state);
      return true;
    },

    addToolActivity(runId: string, activity: ToolActivity): boolean {
      return this.addActivity(runId, activity);
    },

    upsertCompactionActivity(runId: string, activity: CompactionActivity): boolean {
      if (!isValidActivityId(activity.activityId)) {
        console.warn('[agentActivityStore] Dropping compaction activity with invalid activityId', activity);
        return false;
      }
      const state = this._ensureRunState(runId);
      const existing = state.activities.find(
        (item): item is CompactionActivity =>
          item.kind === 'compaction' && item.activityId === activity.activityId,
      );
      if (!existing) {
        state.activities.push(activity);
        this._enforceRecentWindow(state);
        return true;
      }

      const originalTimestamp = existing.timestamp;
      const originalCenterTimelineTimestamp = existing.centerTimelineTimestamp ?? null;
      const patch = {
        ...activity,
        timestamp: originalTimestamp,
        centerTimelineTimestamp: originalCenterTimelineTimestamp ?? activity.centerTimelineTimestamp ?? null,
      };
      const changed = Object.entries(patch)
        .some(([key, value]) => !presentationValuesEqual((existing as unknown as Record<string, unknown>)[key], value));
      if (changed) Object.assign(existing, patch);
      this._enforceRecentWindow(state);
      return changed;
    },

    upsertSystemInstructionActivity(runId: string, activity: SystemInstructionActivity): boolean {
      if (!isValidActivityId(activity.activityId)
        || !(activity.timestamp instanceof Date)
        || !Number.isFinite(activity.timestamp.getTime())) {
        console.warn('[agentActivityStore] Dropping invalid system instruction activity.');
        return false;
      }
      const state = this._ensureRunState(runId);
      const existing = state.activities.find((item) => item.activityId === activity.activityId);
      if (!existing) {
        state.activities.push(activity);
        this._enforceRecentWindow(state);
        return true;
      }
      if (existing.kind !== 'system_instruction'
        || existing.content !== activity.content
        || existing.timestamp.getTime() !== activity.timestamp.getTime()) {
        console.warn(`[agentActivityStore] Rejected conflicting activity ID '${activity.activityId}'.`);
      }
      return false;
    },

    updateToolActivityStatus(
      runId: string,
      invocationId: string,
      status: ToolInvocationStatus
    ): boolean {
      const state = this._ensureRunState(runId);
      const activity = state.activities.find(
        (a): a is ToolActivity => a.kind === 'tool' && a.invocationId === invocationId,
      );
      if (activity) {
        if (!canTransitionToolInvocationStatus(activity.status, status)) {
          return false;
        }
        if (activity.status === status) return false;
        activity.status = status;
        this._enforceRecentWindow(state);
        return true;
      }
      return false;
    },

    addToolActivityLog(runId: string, invocationId: string, log: string): boolean {
      const state = this._ensureRunState(runId);
      const activity = state.activities.find(
        (a): a is ToolActivity => a.kind === 'tool' && a.invocationId === invocationId,
      );
      if (activity) {
        if (activity.logs.at(-1) === log) return false;
        activity.logs.push(log);
        this._enforceRecentWindow(state);
        return true;
      }
      return false;
    },

    setToolActivityResult(runId: string, invocationId: string, result: any, error: string | null = null): boolean {
      const state = this._ensureRunState(runId);
      const activity = state.activities.find(
        (a): a is ToolActivity => a.kind === 'tool' && a.invocationId === invocationId,
      );
      if (activity) {
        if (presentationValuesEqual(activity.result, result) && activity.error === error) return false;
        activity.result = result;
        activity.error = error;
        this._enforceRecentWindow(state);
        return true;
      }
      return false;
    },

    updateToolActivityArguments(runId: string, invocationId: string, args: Record<string, any>): boolean {
      const state = this._ensureRunState(runId);
      const activity = state.activities.find(
        (a): a is ToolActivity => a.kind === 'tool' && a.invocationId === invocationId,
      );
      if (activity) {
        const next = { ...activity.arguments, ...args };
        if (presentationValuesEqual(activity.arguments, next)) return false;
        activity.arguments = next;
        this._enforceRecentWindow(state);
        return true;
      }
      return false;
    },

    updateToolActivityApprovalTarget(runId: string, invocationId: string, approvalTarget: ToolApprovalTarget | null): boolean {
      const state = this._ensureRunState(runId);
      const activity = state.activities.find(
        (a): a is ToolActivity => a.kind === 'tool' && a.invocationId === invocationId,
      );
      if (activity) {
        if (presentationValuesEqual(activity.approvalTarget ?? null, approvalTarget)) return false;
        activity.approvalTarget = approvalTarget;
        return true;
      }
      return false;
    },

    updateToolActivityToolName(runId: string, invocationId: string, toolName: string): boolean {
      if (typeof toolName !== 'string' || toolName.trim().length === 0) {
        return false;
      }
      const state = this._ensureRunState(runId);
      const activity = state.activities.find(
        (a): a is ToolActivity => a.kind === 'tool' && a.invocationId === invocationId,
      );
      if (!activity) {
        return false;
      }
      if (isPlaceholderToolName(activity.toolName)) {
        if (activity.toolName === toolName) return false;
        activity.toolName = toolName;
        return true;
      }
      return false;
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
