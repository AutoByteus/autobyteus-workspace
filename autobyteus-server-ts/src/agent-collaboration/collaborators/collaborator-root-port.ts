import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import type { AgentTeamAddress } from "../domain/agent-team-address.js";
import { catalogDefinitionKey, type CatalogDefinitionRef } from "./catalog-address-map.js";

/**
 * Where a definition is in the run, in address precedence order (AR-002): the run's own agent
 * (a standalone Agent run's host), then a configured Agent placement or an Org mounted Team.
 */
export type InRunPlacementRank = "run_agent" | "configured";
export type InRunPlacement = Readonly<{ address: AgentTeamAddress; rank: InRunPlacementRank }>;
export type InRunPlacementsByDefinition = ReadonlyMap<string, readonly InRunPlacement[]>;

/**
 * What launch resolution starts from (design § Terminology):
 * - `inherited`: a run root's launch, the last layer every agent falls back to, and the source of every
 *   configured candidate's workspace and auto-approve;
 * - `defaults_only`: no run to inherit from (a run started for a peer node): only configured defaults count,
 *   with this workspace and auto-approve.
 */
export type CollaboratorLaunchBase =
  | Readonly<{ kind: "inherited"; launch: AgentLaunchConfiguration }>
  | Readonly<{ kind: "defaults_only"; workspaceRootPath: string; autoExecuteTools: boolean }>;

/**
 * Read port every collaboration root implements for candidate policy and admission. It
 * exposes facts only; "in the run" is decided by `CollaboratorCandidatePolicy`.
 */
export interface CollaboratorRootPort {
  /** Application-owned runs are excluded from `@` and from the catalog. */
  readonly isApplicationBound: boolean;
  /** The launch base for new collaborator entries and catalog copies. */
  launchBase(): CollaboratorLaunchBase;
  /**
   * The viewer's own definition: never listed, mentioned or brought in. A Team root's own Team;
   * a standalone Agent root's host definition only when the viewer is the host; null otherwise
   * and for an Org root.
   */
  ownDefinition(): CatalogDefinitionRef | null;
  /**
   * Every in-run placement by `catalogDefinitionKey`: the run's own agent, configured Agents and
   * Org mounted Teams. Delegated copies are not placements.
   */
  inRunPlacementsByDefinition(): InRunPlacementsByDefinition;
  /** Addresses already used by the run (configured placements and the host). */
  addressesInUse(): ReadonlySet<string>;
}

/**
 * Builds a root's in-run placements from its run agent (standalone Agent roots only) and its
 * configured placements (shared by every root port).
 */
export const buildInRunPlacements = (input: Readonly<{
  runAgent?: Readonly<{ ref: CatalogDefinitionRef; address: AgentTeamAddress }>;
  configured: Iterable<Readonly<{ ref: CatalogDefinitionRef; address: AgentTeamAddress }>>;
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
  return placements;
};
