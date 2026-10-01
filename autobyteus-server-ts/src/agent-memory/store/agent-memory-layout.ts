import fs from "node:fs/promises";
import path from "node:path";
import type { AgentMemoryScope } from "../domain/agent-memory-location.js";
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

  getOrgAgentRunDirPath(orgRunId: string, agentRunId: string): string {
    return resolveSafePath(
      this.getOrgDirPath(orgRunId),
      normalizePathSegment(agentRunId, "agentRunId"),
    );
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

  async ensureStandaloneRunSubtree(agentRunId: string): Promise<void> {
    await fs.mkdir(this.getStandaloneRunDirPath(agentRunId), { recursive: true });
  }

  async ensureTeamAgentRunSubtree(scope: AgentMemoryScope, agentRunId: string): Promise<void> {
    await fs.mkdir(this.getTeamAgentRunDirPath(scope, agentRunId), { recursive: true });
  }

  async ensureOrgAgentRunSubtree(orgRunId: string, agentRunId: string): Promise<void> {
    await fs.mkdir(this.getOrgAgentRunDirPath(orgRunId, agentRunId), { recursive: true });
  }

  async ensureRootedAgentRunSubtree(scope: RootExecutionPhysicalScope, agentRunId: string): Promise<void> {
    await fs.mkdir(this.getRootedAgentRunDirPath(scope, agentRunId), { recursive: true });
  }
}
