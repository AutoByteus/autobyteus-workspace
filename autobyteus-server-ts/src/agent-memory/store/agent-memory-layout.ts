import { createHash } from "node:crypto";
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

/** An encoded definition ID up to this length is the folder name itself; file systems allow 255 bytes per name. */
const MAX_FULL_DEFINITION_FOLDER_NAME_BYTES = 200;
/** A longer one keeps this many leading bytes, then `#` and a hash of the ID. */
const SHORTENED_DEFINITION_FOLDER_PREFIX_BYTES = 120;
const SHORTENED_DEFINITION_FOLDER_HASH_LENGTH = 16;

/**
 * At most the first `maxBytes` of `encodeURIComponent(id)`, cut between characters: never inside a `%XX` escape nor
 * between the escapes of one multi-byte character, so the prefix always decodes (N-13).
 */
const encodedPrefix = (id: string, maxBytes: number): string => {
  let prefix = "";
  for (const character of id) {
    const encoded = encodeURIComponent(character);
    if (prefix.length + encoded.length > maxBytes) break;
    prefix += encoded;
  }
  return prefix;
};

/**
 * One agent definition's folder name under `semantic/` and `episodic/` (DEC-016), the only rule for it: the
 * URI-encoded definition ID when it is at most 200 bytes; otherwise its first 120 bytes (cut between characters, never
 * inside a `%XX`), `#`, and the first 16 hex characters of the ID's SHA-256. `encodeURIComponent` output is ASCII, so
 * its length is its byte count, and it always escapes `#`, so a shortened name never equals a full one.
 * Application-bundled team-local IDs hold the bundle's path in hex and need the short form.
 */
const definitionFolderName = (agentDefinitionId: string): string => {
  const id = normalizeRequiredString(agentDefinitionId, "agentDefinitionId");
  const encoded = encodeURIComponent(id);
  const name = encoded.length <= MAX_FULL_DEFINITION_FOLDER_NAME_BYTES
    ? encoded
    : `${encodedPrefix(id, SHORTENED_DEFINITION_FOLDER_PREFIX_BYTES)}#${createHash("sha256").update(id).digest("hex").slice(0, SHORTENED_DEFINITION_FOLDER_HASH_LENGTH)}`;
  return normalizePathSegment(name, "agentDefinitionId");
};

/** The folder of agents' semantic memories, a sibling of the run folders; run tooling never walks it. */
export const SEMANTIC_MEMORY_DIR_NAME = "semantic";

/** The node's global semantic memory folder, shared by every agent (autobyteus-554); a sibling of `semantic/`. */
export const GLOBAL_SEMANTIC_MEMORY_DIR_NAME = "semantic-global";

/** The folder of agents' episodic catalogs, a sibling of the semantic folder; run tooling never walks it. */
export const EPISODIC_MEMORY_DIR_NAME = "episodic";

export class AgentMemoryLayout {
  private readonly standaloneRootDir: string;
  private readonly teamRootDir: string;
  private readonly orgRootDir: string;
  private readonly semanticRootDir: string;
  private readonly globalSemanticMemoryDir: string;
  private readonly episodicRootDir: string;

  constructor(memoryDir: string) {
    this.standaloneRootDir = path.join(memoryDir, "agents");
    this.teamRootDir = path.join(memoryDir, "agent_teams");
    this.orgRootDir = path.join(memoryDir, "agent_orgs");
    this.semanticRootDir = path.join(memoryDir, SEMANTIC_MEMORY_DIR_NAME);
    this.globalSemanticMemoryDir = path.join(memoryDir, GLOBAL_SEMANTIC_MEMORY_DIR_NAME);
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
   * The semantic memory folder of one agent definition: `<memory>/semantic/<definition folder name>`.
   * The name (`definitionFolderName`) is URI-encoded so every ID form (team-local IDs hold `:`) gives one valid,
   * distinct folder name on every desktop OS, and shortened when it would be too long for one.
   */
  getAgentSemanticMemoryDirPath(agentDefinitionId: string): string {
    return resolveSafePath(this.semanticRootDir, definitionFolderName(agentDefinitionId));
  }

  /** `<memory>/semantic-global/`: the node's global semantic memory folder, shared by every agent. */
  getGlobalSemanticMemoryDirPath(): string {
    return this.globalSemanticMemoryDir;
  }

  /** `<memory>/episodic/`: every agent's episodic folder and the node overview `index.md`. */
  getEpisodicRootDirPath(): string {
    return this.episodicRootDir;
  }

  /** The episodic folder of one agent definition: `<memory>/episodic/<definition folder name>`, named as its semantic folder. */
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
