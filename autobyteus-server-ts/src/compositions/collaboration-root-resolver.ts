import type { RootExecutionIdentity } from "../agent-collaboration/execution/domain/root-execution-identity.js";
import type { AgentOrgRun } from "../agent-org-execution/domain/agent-org-run.js";
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
  | Readonly<{ kind: "agent_org"; root: AgentOrgRun }>;

/**
 * One resolution of a root by its identity, through the root managers' public resolve / restore APIs
 * (autobyteus-285 D5), shared by inbound remote messages and restart resume.
 * - `null`: no such root here (deleted history, a run that cannot be a root, or a manager's not-found);
 * - a throw: the root exists but could not be restored.
 */
export type CollaborationRootResolver = Readonly<{
  resolveOrRestore(root: RootExecutionIdentity): Promise<ResolvedRoot | null>;
}>;

/** The managers' "no such admitted package" codes; every other failure is a restore failure. */
const NOT_FOUND_CODES = ["TEAM_RUN_STATE_PACKAGE_NOT_CATALOGED", "AGENT_ORG_STATE_PACKAGE_NOT_CATALOGED"] as const;
const isNotFound = (error: unknown): boolean => error instanceof StandaloneRootUnavailableError
  || (error instanceof Error && NOT_FOUND_CODES.some((code) => error.message.startsWith(`${code}:`)));

export const createCollaborationRootResolver = (input: Readonly<{
  standaloneRoots: Pick<StandaloneAgentRunRootManager, "resolveRoot">;
  teamRuns: Pick<TeamRunService, "getManagedTeamRun" | "restoreTeamRun">;
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
          const resolved = input.teamRuns.getManagedTeamRun(root.rootRunId) ?? await input.teamRuns.restoreTeamRun(root.rootRunId);
          return Object.freeze({ kind: "agent_team", root: resolved });
        }
        case "agent_org": {
          const resolved = input.orgRuns.getActive(root.rootRunId) ?? await input.orgRuns.restore(root.rootRunId);
          return Object.freeze({ kind: "agent_org", root: resolved });
        }
      }
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  },
});
