import type { RootExecutionIdentity } from "../agent-collaboration/execution/domain/root-execution-identity.js";
import type { LiveAgentOrg } from "../agent-org-execution/services/agent-org-run-manager.js";
import type { AgentOrgRunService } from "../agent-org-execution/services/agent-org-run-service.js";
import type { RootTeamRun } from "../agent-team-execution/domain/root-team-run.js";
import type { TeamRunService } from "../agent-team-execution/services/team-run-service.js";
import type { StandaloneAgentRunRoot } from "../standalone-agent-run-root/domain/standalone-agent-run-root.js";
import {
  StandaloneRootUnavailableError,
  type StandaloneAgentRunRootManager,
} from "../standalone-agent-run-root/services/standalone-agent-run-root-manager.js";

/** A root of this node, by kind, as its manager resolves or restores it. */
export type ResolvedRoot =
  | Readonly<{ kind: "agent"; root: StandaloneAgentRunRoot }>
  | Readonly<{ kind: "agent_team"; root: RootTeamRun }>
  | Readonly<{ kind: "agent_org"; root: LiveAgentOrg }>;

/**
 * One resolution of a root by its identity, through the root managers' public resolve / restore APIs
 * (autobyteus-285 D5), shared by deliveries between runs, inbound remote messages and restart resume. A run whose root
 * is ending is never handed out: the delivery waits for that end, then the run is restored (CR-461-001; the managers'
 * restore finishes a stopping root first, and the standalone manager waits for a stop in progress). One root per run.
 * - `null`: no such root here (deleted history, a run that cannot be a root, or a manager's not-found);
 * - a throw: the root exists but could not be restored.
 */
export type CollaborationRootResolver = Readonly<{
  resolveOrRestore(root: RootExecutionIdentity): Promise<ResolvedRoot | null>;
  /**
   * autobyteus-492: the run's active root as it is now, never restored (a message by run ID alone reaches only a running
   * agent, DEC-003); `null` when it is not active.
   */
  resolveActive(root: RootExecutionIdentity): ResolvedRoot | null;
}>;

/** The managers' "no such admitted package" codes; every other failure is a restore failure. */
const NOT_FOUND_CODES = ["TEAM_RUN_STATE_PACKAGE_NOT_CATALOGED", "AGENT_ORG_STATE_PACKAGE_NOT_CATALOGED"] as const;
const isNotFound = (error: unknown): boolean => error instanceof StandaloneRootUnavailableError
  || (error instanceof Error && NOT_FOUND_CODES.some((code) => error.message.startsWith(`${code}:`)));

/**
 * The run's active root, else a restore (which first finishes a root that is stopping). A restore that loses to a
 * concurrent one ("already managed") takes the root that one registered.
 */
const activeOrRestored = async <T>(active: () => T | null, restore: () => Promise<T>): Promise<T> => {
  const current = active();
  if (current) return current;
  try {
    return await restore();
  } catch (error) {
    const registered = active();
    if (registered) return registered;
    throw error;
  }
};

export const createCollaborationRootResolver = (input: Readonly<{
  standaloneRoots: Pick<StandaloneAgentRunRootManager, "resolveRoot" | "getActive">;
  teamRuns: Pick<TeamRunService, "getActiveTeamRun" | "restoreTeamRun">;
  orgRuns: Pick<AgentOrgRunService, "getActive" | "restore">;
}>): CollaborationRootResolver => Object.freeze({
  async resolveOrRestore(root: RootExecutionIdentity): Promise<ResolvedRoot | null> {
    try {
      switch (root.rootSubjectKind) {
        case "agent": {
          const resolved = await input.standaloneRoots.resolveRoot(root.rootRunId);
          return resolved ? Object.freeze({ kind: "agent", root: resolved }) : null;
        }
        case "agent_team": {
          const resolved = await activeOrRestored(() => input.teamRuns.getActiveTeamRun(root.rootRunId), () => input.teamRuns.restoreTeamRun(root.rootRunId));
          return Object.freeze({ kind: "agent_team", root: resolved });
        }
        case "agent_org": {
          const resolved = await activeOrRestored(() => input.orgRuns.getActive(root.rootRunId), () => input.orgRuns.restore(root.rootRunId));
          return Object.freeze({ kind: "agent_org", root: resolved });
        }
      }
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  },
  resolveActive(root: RootExecutionIdentity): ResolvedRoot | null {
    switch (root.rootSubjectKind) {
      case "agent": { const active = input.standaloneRoots.getActive(root.rootRunId); return active ? Object.freeze({ kind: "agent", root: active }) : null; }
      case "agent_team": { const active = input.teamRuns.getActiveTeamRun(root.rootRunId); return active ? Object.freeze({ kind: "agent_team", root: active }) : null; }
      case "agent_org": { const active = input.orgRuns.getActive(root.rootRunId); return active ? Object.freeze({ kind: "agent_org", root: active }) : null; }
    }
  },
});
