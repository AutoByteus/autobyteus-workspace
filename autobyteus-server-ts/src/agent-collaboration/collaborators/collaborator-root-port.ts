import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import type { CollaboratorEntry } from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { RootSubjectKind } from "../execution/domain/root-execution-identity.js";

/** Definitions that belong to the run by configuration (never offered, never admitted). */
export type ConfiguredDefinitionIds = Readonly<{
  agentDefinitionIds: ReadonlySet<string>;
  teamDefinitionIds: ReadonlySet<string>;
}>;

/**
 * Read port every collaboration root implements for candidate policy and admission. It
 * exposes facts only; "in the run" is decided by `CollaboratorCandidatePolicy`.
 */
export interface CollaboratorRootPort {
  readonly rootKind: RootSubjectKind;
  /** Application-owned runs are excluded from `@`. */
  readonly isApplicationBound: boolean;
  /** The run's root launch settings, snapshotted into new collaborator entries. */
  rootLaunchConfiguration(): AgentLaunchConfiguration;
  /** The root's own definition(s) and every configured member definition. */
  configuredDefinitionIds(): ConfiguredDefinitionIds;
  collaborators(): readonly CollaboratorEntry[];
  /** Whether at least one task execution sits at this address. */
  hasTaskExecutionAt(address: string): boolean;
  /** Root-level address segments already used by the run (configured, host, collaborators). */
  addressesInUse(): ReadonlySet<string>;
}
