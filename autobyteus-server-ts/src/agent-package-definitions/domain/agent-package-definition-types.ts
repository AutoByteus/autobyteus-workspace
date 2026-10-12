import type { AgentDefinition } from "../../agent-definition/domain/models.js";
import type { AgentTeamDefinition } from "../../agent-team-definition/domain/agent-team-definition.js";
import type { AgentOrgDefinition } from "../../agent-org-definition/domain/agent-org-definition.js";
import type { DefinitionSourceClass } from "../../collaboration-definition-admission/domain/definition-source-descriptor.js";

/** The three kinds of agent package definitions. */
export const AGENT_PACKAGE_DEFINITION_KINDS = ["agent", "agent_team", "agent_org"] as const;
export type AgentPackageDefinitionKind = (typeof AGENT_PACKAGE_DEFINITION_KINDS)[number];

/** The web lists a change announcement names; `agent_packages` covers package registration and watch status. */
export const AGENT_PACKAGE_DEFINITION_LISTS = ["agents", "agent_teams", "agent_orgs", "agent_packages"] as const;
export type AgentPackageDefinitionList = (typeof AGENT_PACKAGE_DEFINITION_LISTS)[number];

export type DefinitionLoadIssueCode =
  | "DEFINITION_CONTRACT_INVALID"
  | "DEFINITION_FAMILY_MISMATCH"
  | "DEFINITION_SOURCE_UNAVAILABLE"
  | "DEFINITION_IDENTITY_DUPLICATED";

/**
 * Why one definition's files could not be read: its last working version is used, or (with no
 * last working version) it is unusable.
 */
export type DefinitionLoadIssue = Readonly<{
  code: DefinitionLoadIssueCode;
  reason: string;
  definitionPath: string;
  packageRoot: string;
}>;

/**
 * One load issue inside a definition folder (its own definition or a nested one), as shown on the
 * owning card. `name` is the last working version's name; `usingLastGood` says it still works.
 */
export type DefinitionLoadIssueEntry = Readonly<{
  kind: AgentPackageDefinitionKind;
  definitionId: string;
  name: string | null;
  issue: DefinitionLoadIssue;
  usingLastGood: boolean;
}>;

export type DefinitionByKind = {
  agent: AgentDefinition;
  agent_team: AgentTeamDefinition;
  agent_org: AgentOrgDefinition;
};

/** The classified result of reading one definition's files. */
export type DefinitionReadResult<T> =
  | Readonly<{ status: "valid"; definition: T; fingerprint: string }>
  | Readonly<{
      status: "invalid";
      code: Exclude<DefinitionLoadIssueCode, "DEFINITION_SOURCE_UNAVAILABLE">;
      reason: string;
      definitionPath: string;
    }>
  | Readonly<{ status: "absent" }>;

/** One definition's read result, tagged with its kind. */
export type KindDefinitionReadResult = {
  [K in AgentPackageDefinitionKind]: Readonly<{ kind: K; result: DefinitionReadResult<DefinitionByKind[K]> }>;
}[AgentPackageDefinitionKind];

export type KindFolderName = "agents" | "agent-teams" | "agent-orgs";

/** One registered agent package folder in precedence order, with its three kind folders. */
export type RegisteredPackageRoot = Readonly<{
  rootPath: string;
  sourceClass: Extract<DefinitionSourceClass, "server_data" | "external_read_only">;
  kindDirs: Readonly<Record<KindFolderName, string>>;
}>;

/** Identifies a top-level definition folder (an agent, team or org folder) by kind and folder ID. */
export type DefinitionFolderRef = Readonly<{ kind: AgentPackageDefinitionKind; folderId: string }>;

/** Where a definition folder was read from: its agent package and the folder itself. */
export type DefinitionFolderLocation = Readonly<{
  packageRoot: string;
  folderDir: string;
  sourceClass: RegisteredPackageRoot["sourceClass"];
}>;

/**
 * The result of reading one definition folder: its own definition plus the definitions nested in
 * it, keyed by canonical ID. `nested: null` means the nested structure could not be determined,
 * so the previous nested definitions are kept unchanged.
 */
export type DefinitionFolderReadResult =
  | Readonly<{ status: "absent" }>
  | Readonly<{
      status: "read";
      location: DefinitionFolderLocation;
      root: KindDefinitionReadResult;
      nested: ReadonlyMap<string, KindDefinitionReadResult> | null;
    }>;

export type DefinitionFolderReadContext<K extends AgentPackageDefinitionKind> = Readonly<{
  /** Registered package folders that are present, in precedence order. */
  roots: readonly RegisteredPackageRoot[];
  /** The folder's last working root definition, used when its own files cannot be read. */
  previousRoot: DefinitionByKind[K] | null;
}>;

/** Lists and reads the definition folders of one kind (agent folders, team folders or org folders). */
export interface DefinitionFolderReader<K extends AgentPackageDefinitionKind> {
  readonly kind: K;
  /** Definition folder IDs present under the given package folders, in precedence order. */
  listFolderIds(roots: readonly RegisteredPackageRoot[]): Promise<readonly string[]>;
  readFolder(folderId: string, context: DefinitionFolderReadContext<K>): Promise<DefinitionFolderReadResult>;
}

export type DefinitionFolderReaders = Readonly<{ [K in AgentPackageDefinitionKind]: DefinitionFolderReader<K> }>;
