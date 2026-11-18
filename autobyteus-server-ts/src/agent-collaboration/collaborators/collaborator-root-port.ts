import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import type { AgentTeamAddress } from "../domain/agent-team-address.js";
import { catalogDefinitionKey, type CatalogDefinitionRef } from "./catalog-address-map.js";
import type { ReachedPlacement } from "../delegation/collaboration-tree.js";

/**
 * Where a definition is in the run, in address precedence order (AR-002): the run's own agent
 * (a standalone Agent run's own agent), then a configured Agent placement or an Org mounted Team.
 */
export type InRunPlacementRank = "run_agent" | "configured";
/**
 * A placement in the run's in-run set: what it reaches by address (contract §2.3, autobyteus-461 SR-059), with the
 * step that reaches it: 1, its own team (a Team root's members); 2, an assigner's standing agent; 3, its own run's
 * agents (a standalone run's agent, an Org's placements). A definition at two addresses is preferred by step.
 */
export type InRunPlacement = Readonly<{ address: AgentTeamAddress; rank: InRunPlacementRank; step: 1 | 2 | 3 }>;
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

/** The base with another folder, so a copy's launches (and their usability check) resolve for the folder it runs in. */
export const baseInFolder = (base: CollaboratorLaunchBase, workspaceRootPath: string): CollaboratorLaunchBase =>
  base.kind === "inherited"
    ? Object.freeze({ kind: "inherited", launch: Object.freeze({ ...base.launch, workspaceRootPath }) })
    : Object.freeze({ ...base, workspaceRootPath });

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
   * a standalone Agent run's own definition only when the viewer is its agent; null otherwise
   * and for an Org root.
   */
  ownDefinition(): CatalogDefinitionRef | null;
  /**
   * Every in-run placement by `catalogDefinitionKey`: the run's own agent, configured Agents and
   * Org mounted Teams, and what the run reaches by address step 2 (SR-059). Delegated runs are not placements.
   */
  inRunPlacementsByDefinition(): Promise<InRunPlacementsByDefinition>;
  /** Addresses already used: the run's own placements and the addresses step 2 reaches (no catalog address lands on one). */
  addressesInUse(): Promise<ReadonlySet<string>>;
}

/** What a run reaches by address step 2, for its port (its collaboration tree's `stepTwo`); none for a run that works on no Task. */
export type ReachedPlacements = () => Promise<readonly ReachedPlacement[]>;
export const NOTHING_REACHED: ReachedPlacements = async () => [];

/**
 * Builds a root's in-run placements from its run agent (standalone Agent roots only, step 3), its configured placements
 * (step 1 in a Team root, its own team; step 3 in an Org root) and what it reaches by step 2 (`reached`).
 */
export const buildInRunPlacements = (input: Readonly<{
  runAgent?: Readonly<{ ref: CatalogDefinitionRef; address: AgentTeamAddress }>;
  configured: Iterable<Readonly<{ ref: CatalogDefinitionRef; address: AgentTeamAddress }>>;
  configuredStep: 1 | 3;
  reached: readonly ReachedPlacement[];
}>): InRunPlacementsByDefinition => {
  const placements = new Map<string, InRunPlacement[]>();
  const add = (ref: CatalogDefinitionRef, address: AgentTeamAddress, rank: InRunPlacementRank, step: InRunPlacement["step"]) => {
    const key = catalogDefinitionKey(ref);
    const list = placements.get(key) ?? [];
    list.push(Object.freeze({ address, rank, step }));
    placements.set(key, list);
  };
  if (input.runAgent) add(input.runAgent.ref, input.runAgent.address, "run_agent", 3);
  for (const { ref, address } of input.configured) add(ref, address, "configured", input.configuredStep);
  for (const reached of input.reached) if (reached.ref) add(reached.ref, reached.address, reached.rank, 2);
  return placements;
};

/** The addresses in use: the run's own and the ones step 2 reaches. */
export const addressesInUseOf = (own: Iterable<string>, reached: readonly ReachedPlacement[]): ReadonlySet<string> =>
  new Set([...own, ...reached.map((placement) => placement.address)]);
