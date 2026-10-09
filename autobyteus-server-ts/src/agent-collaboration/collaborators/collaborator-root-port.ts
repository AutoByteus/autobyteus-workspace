import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import type { CollaboratorEntry } from "../../run-history/domain/run-execution-tree-shared-records.js";
import type { AgentTeamAddress } from "../domain/agent-team-address.js";
import type { RootSubjectKind } from "../execution/domain/root-execution-identity.js";
import { catalogDefinitionKey, type CatalogDefinitionRef } from "./catalog-address-map.js";

/**
 * Where a definition is in the run, in address precedence order (AR-002): the run's own agent
 * (a standalone Agent run's host), a configured Agent placement or an Org mounted Team, then a
 * collaborator entry, then a collaborator-Team member.
 */
export type InRunPlacementRank = "run_agent" | "configured" | "collaborator" | "collaborator_member";
export type InRunPlacement = Readonly<{ address: AgentTeamAddress; rank: InRunPlacementRank }>;
export type InRunPlacementsByDefinition = ReadonlyMap<string, readonly InRunPlacement[]>;

/**
 * Read port every collaboration root implements for candidate policy and admission. It
 * exposes facts only; "in the run" is decided by `CollaboratorCandidatePolicy`.
 */
export interface CollaboratorRootPort {
  readonly rootKind: RootSubjectKind;
  /** Application-owned runs are excluded from `@` and from the catalog. */
  readonly isApplicationBound: boolean;
  /** The run's root launch settings, snapshotted into new collaborator entries and catalog copies. */
  rootLaunchConfiguration(): AgentLaunchConfiguration;
  /**
   * The viewer's own definition: never listed, mentioned or brought in. A Team root's own Team;
   * a standalone Agent root's host definition only when the viewer is the host; null otherwise
   * and for an Org root.
   */
  ownDefinition(): CatalogDefinitionRef | null;
  /**
   * Every in-run placement by `catalogDefinitionKey`: the run's own agent, configured Agents and
   * Org mounted Teams, collaborator entries and collaborator-Team members. Task copies are not
   * placements.
   */
  inRunPlacementsByDefinition(): InRunPlacementsByDefinition;
  /** One instance per entry; its runs are recorded in the entry. */
  collaborators(): readonly CollaboratorEntry[];
  /** Addresses already used by the run (configured, host, collaborators). */
  addressesInUse(): ReadonlySet<string>;
}

/**
 * Builds a root's in-run placements from its run agent (standalone Agent roots only), its
 * configured placements and its collaborator entries (shared by every root port).
 */
export const buildInRunPlacements = (input: Readonly<{
  runAgent?: Readonly<{ ref: CatalogDefinitionRef; address: AgentTeamAddress }>;
  configured: Iterable<Readonly<{ ref: CatalogDefinitionRef; address: AgentTeamAddress }>>;
  collaborators: readonly CollaboratorEntry[];
}>): InRunPlacementsByDefinition => {
  const placements = new Map<string, InRunPlacement[]>();
  const add = (ref: CatalogDefinitionRef, address: AgentTeamAddress, rank: InRunPlacementRank) => {
    const key = catalogDefinitionKey(ref);
    const list = placements.get(key) ?? [];
    list.push(Object.freeze({ address, rank }));
    placements.set(key, list);
  };
  if (input.runAgent) add(input.runAgent.ref, input.runAgent.address, "run_agent");
  for (const { ref, address } of input.configured) add(ref, address, "configured");
  for (const entry of input.collaborators) {
    if (entry.kind === "agent") {
      add({ kind: "agent", definitionId: entry.agentDefinitionId }, entry.address, "collaborator");
      continue;
    }
    add({ kind: "agent_team", definitionId: entry.teamDefinitionId }, entry.address, "collaborator");
    for (const member of entry.members) {
      add({ kind: "agent", definitionId: member.agentDefinitionId }, member.address, "collaborator_member");
    }
  }
  return placements;
};
