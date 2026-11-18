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

/** One agent definition's folder name under `semantic/` and `episodic/`: the URI-encoded definition ID. */
const definitionFolderName = (agentDefinitionId: string): string =>
  normalizePathSegment(encodeURIComponent(normalizeRequiredString(agentDefinitionId, "agentDefinitionId")), "agentDefinitionId");

/** The folder of agents' semantic memories, a sibling of the run folders; run tooling never walks it. */
export const SEMANTIC_MEMORY_DIR_NAME = "semantic";

/** The folder of agents' episodic catalogs, a sibling of the semantic folder; run tooling never walks it. */
export const EPISODIC_MEMORY_DIR_NAME = "episodic";

export class AgentMemoryLayout {
  private readonly standaloneRootDir: string;
  private readonly teamRootDir: string;
  private readonly orgRootDir: string;
  private readonly semanticRootDir: string;
  private readonly episodicRootDir: string;

  constructor(memoryDir: string) {
    this.standaloneRootDir = path.join(memoryDir, "agents");
    this.teamRootDir = path.join(memoryDir, "agent_teams");
    this.orgRootDir = path.join(memoryDir, "agent_orgs");
    this.semanticRootDir = path.join(memoryDir, SEMANTIC_MEMORY_DIR_NAME);
    this.episodicRootDir = path.join(memoryDir, EPISODIC_MEMORY_DIR_NAME);
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

  /**
   * The semantic memory folder of one agent definition: `<memory>/semantic/<encoded definition ID>`.
   * The ID is URI-encoded so every ID form (team-local IDs hold `:`) gives one valid, distinct folder
   * name on every desktop OS.
   */
  getAgentSemanticMemoryDirPath(agentDefinitionId: string): string {
    return resolveSafePath(this.semanticRootDir, definitionFolderName(agentDefinitionId));
  }

  /** `<memory>/episodic/`: every agent's episodic folder and the node overview `index.md`. */
  getEpisodicRootDirPath(): string {
    return this.episodicRootDir;
  }

  /** The episodic folder of one agent definition: `<memory>/episodic/<encoded definition ID>`, named as its semantic folder. */
  getAgentEpisodicDirPath(agentDefinitionId: string): string {
    return resolveSafePath(this.episodicRootDir, definitionFolderName(agentDefinitionId));
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

  getRootExecutionDirPath(scopeInput: RootExecutionPhysicalScope): string {
    const scope = createRootExecutionPhysicalScope(scopeInput);
    const ancestors = scope.ancestorTeamRunIds.map((id, index) => normalizePathSegment(id, `ancestorTeamRunIds[${index}]`));
    switch (scope.root.rootSubjectKind) {
      case "agent_team":
        return resolveSafePath(this.teamRootDir, normalizePathSegment(scope.root.rootRunId, "rootRunId"), ...ancestors);
      case "agent_org":
        return resolveSafePath(this.orgRootDir, normalizePathSegment(scope.root.rootRunId, "rootRunId"), ...ancestors);
      case "agent":
        // A run's memory is never inside another run (autobyteus-461, autobyteus-500 N6): an agent run has no members.
        throw new Error(`Agent run '${scope.root.rootRunId}' has no member memory; its own memory is its run folder.`);
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
    return this.getRootedAgentRunDirPath(placement.scope, agentRunId);
  }
}
