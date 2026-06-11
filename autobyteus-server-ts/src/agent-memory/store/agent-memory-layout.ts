import fs from "node:fs/promises";
import path from "node:path";
import type { AgentMemoryScope } from "../domain/agent-memory-location.js";

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

export class AgentMemoryLayout {
  private readonly standaloneRootDir: string;
  private readonly teamRootDir: string;

  constructor(memoryDir: string) {
    this.standaloneRootDir = path.join(memoryDir, "agents");
    this.teamRootDir = path.join(memoryDir, "agent_teams");
  }

  getStandaloneRootDirPath(): string {
    return this.standaloneRootDir;
  }

  getTeamRootDirPath(): string {
    return this.teamRootDir;
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
      ...scope.teamRunPath.map((segment, index) => normalizePathSegment(segment, `teamRunPath[${index}]`)),
    ];
    return resolveSafePath(this.teamRootDir, ...segments);
  }

  getTeamAgentRunDirPath(scope: AgentMemoryScope, agentRunId: string): string {
    return resolveSafePath(
      this.getTeamDirPath(scope),
      normalizePathSegment(agentRunId, "agentRunId"),
    );
  }

  async ensureStandaloneRunSubtree(agentRunId: string): Promise<void> {
    await fs.mkdir(this.getStandaloneRunDirPath(agentRunId), { recursive: true });
  }

  async ensureTeamAgentRunSubtree(scope: AgentMemoryScope, agentRunId: string): Promise<void> {
    await fs.mkdir(this.getTeamAgentRunDirPath(scope, agentRunId), { recursive: true });
  }
}
