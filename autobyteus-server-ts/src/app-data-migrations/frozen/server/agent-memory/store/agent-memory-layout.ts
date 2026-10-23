import path from "node:path";
import type { AgentMemoryScope } from "../domain/agent-memory-location.js";
import type { AgentRunMemoryPlacement } from "../domain/agent-run-memory-placement.js";
import {
  createRootExecutionPhysicalScope,
  type RootExecutionPhysicalScope,
} from "../../agent-collaboration/execution/domain/root-execution-identity.js";

const normalizeRequiredString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

const normalizePathSegment = (value: string, fieldName: string): string => {
  const normalized = normalizeRequiredString(value, fieldName);
  if (normalized.includes("/") || normalized.includes("\\") || normalized === "." || normalized === "..") {
    throw new Error(`${fieldName} is invalid.`);
  }
  return normalized;
};

const resolveSafePath = (rootDir: string, ...segments: string[]): string => {
  const root = path.resolve(rootDir);
  const candidate = path.resolve(root, ...segments);
  if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) {
    throw new Error("Invalid memory directory path.");
  }
  return candidate;
};

export const AGENT_RUN_COLLABORATION_DIR_NAME = "collaboration";

export class AgentMemoryLayout {
  private readonly standaloneRootDir: string;
  private readonly teamRootDir: string;
  private readonly orgRootDir: string;

  constructor(memoryDir: string) {
    this.standaloneRootDir = path.join(memoryDir, "agents");
    this.teamRootDir = path.join(memoryDir, "agent_teams");
    this.orgRootDir = path.join(memoryDir, "agent_orgs");
  }

  getStandaloneRootDirPath(): string {
    return this.standaloneRootDir;
  }

  getTeamRootDirPath(): string {
    return this.teamRootDir;
  }

  getOrgRootDirPath(): string {
    return this.orgRootDir;
  }

  getStandaloneRunDirPath(agentRunId: string): string {
    return resolveSafePath(
      this.standaloneRootDir,
      normalizePathSegment(agentRunId, "agentRunId"),
    );
  }

  getTeamDirPath(scope: AgentMemoryScope): string {
    const segments = [
      normalizePathSegment(scope.rootTeamRunId, "rootTeamRunId"),
      ...scope.ancestorTeamRunIds.map((segment, index) => normalizePathSegment(segment, `ancestorTeamRunIds[${index}]`)),
    ];
    return resolveSafePath(this.teamRootDir, ...segments);
  }

  getTeamAgentRunDirPath(scope: AgentMemoryScope, agentRunId: string): string {
    return resolveSafePath(
      this.getTeamDirPath(scope),
      normalizePathSegment(agentRunId, "agentRunId"),
    );
  }

  getOrgDirPath(orgRunId: string): string {
    return resolveSafePath(this.orgRootDir, normalizePathSegment(orgRunId, "orgRunId"));
  }

  /** An Agent root keeps its package and child memory inside the host run directory. */
  getAgentRunCollaborationDirPath(hostRunId: string): string {
    return resolveSafePath(this.getStandaloneRunDirPath(hostRunId), AGENT_RUN_COLLABORATION_DIR_NAME);
  }

  getRootExecutionDirPath(scopeInput: RootExecutionPhysicalScope): string {
    const scope = createRootExecutionPhysicalScope(scopeInput);
    const ancestors = scope.ancestorTeamRunIds.map((id, index) => normalizePathSegment(id, `ancestorTeamRunIds[${index}]`));
    switch (scope.root.rootSubjectKind) {
      case "agent_team":
        return resolveSafePath(this.teamRootDir, normalizePathSegment(scope.root.rootRunId, "rootRunId"), ...ancestors);
      case "agent_org":
        return resolveSafePath(this.orgRootDir, normalizePathSegment(scope.root.rootRunId, "rootRunId"), ...ancestors);
      case "agent":
        return resolveSafePath(this.getAgentRunCollaborationDirPath(scope.root.rootRunId), ...ancestors);
    }
  }

  getRootedAgentRunDirPath(scope: RootExecutionPhysicalScope, agentRunId: string): string {
    return resolveSafePath(
      this.getRootExecutionDirPath(scope),
      normalizePathSegment(agentRunId, "agentRunId"),
    );
  }

  /** The memory directory of one agent at its placement (contract L1); the only composer of agent memory paths. */
  getAgentRunMemoryDirPath(placement: AgentRunMemoryPlacement, agentRunId: string): string {
    switch (placement.kind) {
      case "run_part":
        return this.getRootedAgentRunDirPath(placement.scope, agentRunId);
      case "task_agent":
        return this.getStandaloneRunDirPath(agentRunId);
      case "task_agent_team_member":
        return this.getTeamAgentRunDirPath({ rootTeamRunId: placement.teamRunId, ancestorTeamRunIds: [] }, agentRunId);
    }
  }
}

/**
 * The memory root that holds a coordinating run's package directory, as the layout composes it:
 * `<memory>/agent_teams/<id>`, `<memory>/agent_orgs/<id>` or `<memory>/agents/<id>/collaboration`. A task
 * agent's own files live under the same root (contract L1); any other directory shape is refused, so own
 * files are never written outside a memory root.
 */
export const memoryRootOfCoordinatingDir = (
  kind: "agent" | "agent_team" | "agent_org",
  coordinatingDir: string,
): string => {
  const dir = path.resolve(coordinatingDir);
  const [familyDir, expected] = kind === "agent"
    ? [path.dirname(path.dirname(dir)), "agents"]
    : [path.dirname(dir), kind === "agent_team" ? "agent_teams" : "agent_orgs"];
  if (kind === "agent" && path.basename(dir) !== AGENT_RUN_COLLABORATION_DIR_NAME) {
    throw new Error(`'${dir}' is not an Agent-root collaboration directory.`);
  }
  if (path.basename(familyDir) !== expected) {
    throw new Error(`'${dir}' is not inside a memory root's '${expected}' folder.`);
  }
  return path.dirname(familyDir);
};
