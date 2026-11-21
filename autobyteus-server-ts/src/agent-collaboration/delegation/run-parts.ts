import type { RootExecutionIdentity } from "../execution/domain/root-execution-identity.js";

/**
 * An agent of a run: its run, its address in the run's own space (`null`: an agent run not yet collaborating), and its
 * definition (`null` for a peer's run, whose node keeps it).
 */
export type RunAgent = Readonly<{ agentRunId: string; address: string | null; agentDefinitionId: string | null }>;

/**
 * What a run's own file says about its agents, which changes only when a team run follows its definition (its index is
 * told, `DelegationIndex.runPartsChanged`) (contract §4, `model.py`
 * `agents_with_addresses`, `standing`): its agents (an agent run's own agent with its stored address; a team run's
 * members; an org run's direct agents and its mounted teams' members), a team run's coordinator address, and each
 * mounted team of an org run with its coordinator.
 */
export type RunParts = Readonly<{
  agents: readonly RunAgent[];
  /**
   * A team run's former members (removed from its definition while it ran): named in its history, never standing, so
   * `standingOf` leaves them out. Empty for every other run.
   */
  formerAgents: readonly RunAgent[];
  coordinatorAddress: string | null;
  mountedTeams: readonly Readonly<{ address: string; coordinatorAgentRunId: string }>[];
}>;

/** A run's standing agents by address (contract §2.3, `model.py` `standing`), and a team run's coordinator address. */
export type RunStanding = Readonly<{ agents: ReadonlyMap<string, string>; coordinatorAddress: string | null }>;

/**
 * Reads a run's parts from its own file. `null` when the file is absent; a read error rejects. Created by the
 * composition (run-history owns the files).
 */
export interface RunPartsReader {
  partsOf(run: RootExecutionIdentity): Promise<RunParts | null>;
  /** Whether the run's own file is stored, without reading it (SR-067: the startup build skips a deleted run). */
  isStored(run: RootExecutionIdentity): Promise<boolean>;
}
