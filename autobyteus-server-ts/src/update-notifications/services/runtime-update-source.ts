import type { AgentRuntimeStatusService } from "../../runtime-management/agent-runtimes/agent-runtime-status-service.js";
import type { UpdateNotificationSource, UpdateSourceState } from "../domain/update-notification.js";

type RuntimeStates = Pick<AgentRuntimeStatusService, "listUpdateStates">;

/**
 * The agent runtimes as a notification source: a runtime not yet checked keeps its record (its
 * installed version is unknown); a checked runtime that is not installed has none; a failed check
 * keeps a known update (its newest version is unknown). The name is the runtime's kind; the web
 * names it as the Agent Runtimes page does.
 */
export const runtimeUpdateSource = (runtimes: RuntimeStates): UpdateNotificationSource => ({
  kind: "AGENT_RUNTIME",
  listUpdateStates: () => runtimes.listUpdateStates().flatMap((state): UpdateSourceState[] => {
    if (state.checked && state.installedVersion === null) return [];
    return [{
      sourceId: state.runtimeKind,
      displayName: state.runtimeKind,
      installedRevision: state.checked ? state.installedVersion : null,
      latestRevision: state.checked && !state.checkFailed ? state.latestVersion : null,
      lastCheckedAt: state.lastCheckedAt?.toISOString() ?? null,
      repositoryUrl: null,
      defaultBranch: null,
    }];
  }),
});
