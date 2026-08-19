import { AgentRunManager } from "../agent-execution/services/agent-run-manager.js";
import { AgentTeamRunManager } from "../agent-team-execution/services/agent-team-run-manager.js";
import type { ConfiguredAgentExecution, ConfiguredMemberExecution } from "../agent-team-execution/domain/team-run-execution-tree.js";
import { buildFilesystemWorkspaceId } from "./workspace-registry-store.js";
import { canonicalizeWorkspaceRootPath } from "./workspace-path-utils.js";

export interface WorkspaceRemovalGuardBlocker {
  kind: "agent_run" | "team_run";
  runId: string;
}

export interface WorkspaceRemovalGuardResult {
  blocked: boolean;
  message: string | null;
  blockers: WorkspaceRemovalGuardBlocker[];
}

export type WorkspaceRootPathResolver = (workspaceId: string) => string | null | undefined;

export class WorkspaceRemovalGuard {
  constructor(
    private readonly agentRunManager?: Pick<AgentRunManager, "listActiveRuns" | "getActiveRun">,
    private readonly teamRunManager?: Pick<AgentTeamRunManager, "listManagedTeamRunIds" | "getManagedTeamRun">,
    private readonly workspaceRootPathResolver: WorkspaceRootPathResolver = () => null,
  ) {}

  async checkWorkspaceCanBeRemoved(input: {
    workspaceId: string;
    workspaceRootPath: string;
  }): Promise<WorkspaceRemovalGuardResult> {
    const workspaceId = input.workspaceId.trim();
    const workspaceRootPath = canonicalizeWorkspaceRootPath(input.workspaceRootPath);
    const expectedWorkspaceId = buildFilesystemWorkspaceId(workspaceRootPath);
    const blockers: WorkspaceRemovalGuardBlocker[] = [];
    const agentRunManager = this.agentRunManager ?? AgentRunManager.getInstance();
    const teamRunManager = this.teamRunManager ?? AgentTeamRunManager.getInstance();

    for (const runId of agentRunManager.listActiveRuns()) {
      const run = agentRunManager.getActiveRun(runId);
      const activeWorkspaceId = run?.config.workspaceId?.trim() || null;
      if (activeWorkspaceId && workspaceIdUsesRoot(
        activeWorkspaceId,
        workspaceId,
        expectedWorkspaceId,
        workspaceRootPath,
        this.workspaceRootPathResolver,
      )) {
        blockers.push({ kind: "agent_run", runId });
      }
    }

    for (const teamRunId of teamRunManager.listManagedTeamRunIds()) {
      const teamRun = teamRunManager.getManagedTeamRun(teamRunId);
      if (teamRun && teamMemberTreeUsesWorkspace(teamRun.getExecutionTreeSnapshot().rootTeam.members, workspaceRootPath)) {
        blockers.push({ kind: "team_run", runId: teamRunId });
      }
    }

    if (blockers.length === 0) {
      return { blocked: false, message: null, blockers };
    }

    return {
      blocked: true,
      message: "Stop active agent or team runs in this workspace before removing it from Workspaces.",
      blockers,
    };
  }
}

const workspaceIdUsesRoot = (
  activeWorkspaceId: string,
  workspaceId: string,
  expectedWorkspaceId: string,
  workspaceRootPath: string,
  workspaceRootPathResolver: WorkspaceRootPathResolver,
): boolean => {
  if (activeWorkspaceId === workspaceId || activeWorkspaceId === expectedWorkspaceId) {
    return true;
  }

  const activeWorkspaceRootPath = workspaceRootPathResolver(activeWorkspaceId);
  if (!activeWorkspaceRootPath) {
    return false;
  }

  try {
    return canonicalizeWorkspaceRootPath(activeWorkspaceRootPath) === workspaceRootPath;
  } catch {
    return false;
  }
};

const teamMemberTreeUsesWorkspace = (
  members: readonly ConfiguredMemberExecution[],
  workspaceRootPath: string,
): boolean => members.some((member) => teamMemberUsesWorkspace(member, workspaceRootPath));

const teamMemberUsesWorkspace = (
  member: ConfiguredMemberExecution,
  workspaceRootPath: string,
): boolean => {
  if ("teamRunId" in member) {
    return teamMemberTreeUsesWorkspace(member.members, workspaceRootPath);
  }
  return agentMemberUsesWorkspace(member, workspaceRootPath);
};

const agentMemberUsesWorkspace = (
  member: ConfiguredAgentExecution,
  workspaceRootPath: string,
): boolean => {
  const candidateRoot = member.launchConfiguration.workspaceRootPath?.trim();
  if (!candidateRoot) {
    return false;
  }
  try {
    return canonicalizeWorkspaceRootPath(candidateRoot) === workspaceRootPath;
  } catch {
    return false;
  }
};
