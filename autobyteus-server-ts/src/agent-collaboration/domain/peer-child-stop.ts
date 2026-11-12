/**
 * The user's Stop of a run its delegator delegated to a peer node (autobyteus-278 DEC-804; autobyteus-461 SR-065): the
 * one command about a delegated run that still goes through its delegator, because the run is on another node. A run
 * delegated on this node is stopped as itself (rule 2).
 */

/** A delegated run's identity: exactly one of the two. */
export type DelegatedRunReference = Readonly<{ agentRunId: string }> | Readonly<{ teamRunId: string }>;

export type DelegatedStopOutcome = "STOPPED" | "ALREADY_STOPPED" | "NOT_FOUND" | "ROOT_NOT_ACTIVE";

export type DelegatedStopResult = Readonly<{
  outcome: DelegatedStopOutcome;
  message: string;
  /** Kept for the API's shape: a peer run is stopped by its identity, so none is left unattributed. */
  notStoppedUnattributed: number;
}>;
