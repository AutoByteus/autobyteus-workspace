import type { DelegatedRunReference, DelegatedStopResult } from "../../domain/peer-child-stop.js";

export type DelegatorRootKind = "AGENT" | "AGENT_TEAM" | "AGENT_ORG";

/** A live delegator's route to its peer children: `null` for a run it did not delegate to a peer node. */
type PeerStopRoot = Readonly<{ stopDelegatedExecution(target: DelegatedRunReference): Promise<DelegatedStopResult | null> }>;

/** As at base, a refusal from the run's node is `INTERNAL_ERROR` with its message. */
export type PeerChildStopResult = Readonly<{ success: boolean; outcome: DelegatedStopResult["outcome"] | "INTERNAL_ERROR"; message: string; notStoppedUnattributed: number }>;

const result = (outcome: PeerChildStopResult["outcome"], message: string, notStoppedUnattributed = 0): PeerChildStopResult =>
  Object.freeze({ success: outcome === "STOPPED" || outcome === "ALREADY_STOPPED", outcome, message, notStoppedUnattributed });

/**
 * The user's Stop of a run its delegator delegated to a peer node (autobyteus-278 DEC-804; autobyteus-461 SR-065): it goes
 * to the run's node through its live delegator (`stopRemoteChild`). A run delegated on this node is stopped as itself
 * (rule 2), so a reference to one is `NOT_FOUND`; a delegator that is not running is `ROOT_NOT_ACTIVE`, as at base.
 */
export class PeerChildStop {
  constructor(private readonly roots: Readonly<{
    teams: Readonly<{ getManagedTeamRun(teamRunId: string): PeerStopRoot | null }>;
    orgs: Readonly<{ getActive(orgRunId: string): PeerStopRoot | null }>;
    agents: Readonly<{ getActive(agentRunId: string): PeerStopRoot | null }>;
  }>) {}

  async stop(input: Readonly<{ rootKind: DelegatorRootKind; rootRunId: string; target: DelegatedRunReference }>): Promise<PeerChildStopResult> {
    const root = this.liveRoot(input.rootKind, input.rootRunId.trim());
    if (!root) return result("ROOT_NOT_ACTIVE", "This run is not running; a run on another node is stopped from a running run.");
    try {
      const stopped = await root.stopDelegatedExecution(input.target);
      return stopped
        ? result(stopped.outcome, stopped.message, stopped.notStoppedUnattributed)
        : result("NOT_FOUND", "This run did not delegate to that run on another node.");
    } catch (error) {
      return result("INTERNAL_ERROR", `The run could not be stopped: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private liveRoot(rootKind: DelegatorRootKind, rootRunId: string): PeerStopRoot | null {
    switch (rootKind) {
      case "AGENT_TEAM": return this.roots.teams.getManagedTeamRun(rootRunId);
      case "AGENT_ORG": return this.roots.orgs.getActive(rootRunId);
      case "AGENT": return this.roots.agents.getActive(rootRunId);
    }
  }
}
