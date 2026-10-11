import type { AgentDefinition } from "../../agent-definition/domain/models.js";
import type { AgentTeamDefinition } from "../../agent-team-definition/domain/agent-team-definition.js";
import type { AgentOrgDefinition } from "../../agent-org-definition/domain/agent-org-definition.js";
import type { DefinitionSourceClass } from "../../collaboration-definition-admission/domain/definition-source-descriptor.js";

/** The definition subjects the catalog holds. */
export const DEFINITION_SUBJECTS = ["agent", "agent_team", "agent_org"] as const;
export type DefinitionSubject = (typeof DEFINITION_SUBJECTS)[number];

/** What a catalog change publication names; `agent_package` covers root registration and watch status. */
export type DefinitionCatalogChangeSubject = DefinitionSubject | "agent_package";

export type DefinitionCatalogIssueCode =
  | "DEFINITION_CONTRACT_INVALID"
  | "DEFINITION_FAMILY_MISMATCH"
  | "DEFINITION_SOURCE_MISSING"
  | "DEFINITION_IDENTITY_DUPLICATED";

/** Why one definition could not be read as current. Attached to a last good definition or standing alone. */
export type DefinitionCatalogIssue = Readonly<{
  code: DefinitionCatalogIssueCode;
  reason: string;
  definitionPath: string;
  packageRoot: string;
}>;

export type DefinitionBySubject = {
  agent: AgentDefinition;
  agent_team: AgentTeamDefinition;
  agent_org: AgentOrgDefinition;
};

/** The classified result of reading one definition's files. */
export type NodeReadOutcome<T> =
  | Readonly<{ kind: "valid"; definition: T; fingerprint: string }>
  | Readonly<{
      kind: "invalid";
      code: Exclude<DefinitionCatalogIssueCode, "DEFINITION_SOURCE_MISSING">;
      reason: string;
      definitionPath: string;
    }>
  | Readonly<{ kind: "absent" }>;

/** One node outcome tagged with the subject of the definition it reads. */
export type SubjectNodeOutcome = {
  [S in DefinitionSubject]: Readonly<{ subject: S; outcome: NodeReadOutcome<DefinitionBySubject[S]> }>;
}[DefinitionSubject];

/** Where a unit was read from. Application-owned units have no registered package root. */
export type DefinitionUnitLocation = Readonly<{
  packageRoot: string;
  unitDir: string;
  sourceClass: DefinitionSourceClass;
  fromRegisteredRoot: boolean;
}>;

/**
 * The result of reading one unit: its root definition plus its nested definitions keyed by
 * canonical ID. `children: null` means the nested structure could not be determined, so the
 * previous nested nodes are kept unchanged.
 */
export type UnitReadOutcome =
  | Readonly<{ kind: "absent" }>
  | Readonly<{
      kind: "read";
      location: DefinitionUnitLocation;
      root: SubjectNodeOutcome;
      children: ReadonlyMap<string, SubjectNodeOutcome> | null;
    }>;

export type DefinitionKindDirName = "agents" | "agent-teams" | "agent-orgs";

/** One registered package root in precedence order, with its three definition kind folders. */
export type RegisteredPackageRoot = Readonly<{
  rootPath: string;
  sourceClass: Extract<DefinitionSourceClass, "server_data" | "external_read_only">;
  kindDirs: Readonly<Record<DefinitionKindDirName, string>>;
}>;

export type UnitReadContext<S extends DefinitionSubject> = Readonly<{
  /** Registered roots whose folder is present, in precedence order. */
  roots: readonly RegisteredPackageRoot[];
  /** The unit's last good root definition, used when its own files cannot be read. */
  previousRoot: DefinitionBySubject[S] | null;
}>;

/** Enumerates and reads the units of one subject (shared agents, team units or org units). */
export interface DefinitionSourceReader<S extends DefinitionSubject> {
  readonly subject: S;
  /** Unit IDs present under the given roots, in precedence order. */
  listUnitIds(roots: readonly RegisteredPackageRoot[]): Promise<readonly string[]>;
  /** Application-owned list entries of this subject (reconciled only by a full reconcile). */
  listApplicationOwnedUnitIds(): Promise<readonly string[]>;
  readUnit(unitId: string, context: UnitReadContext<S>): Promise<UnitReadOutcome>;
}

export type DefinitionSourceReaders = Readonly<{ [S in DefinitionSubject]: DefinitionSourceReader<S> }>;
