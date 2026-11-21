import type { AgentRunService } from "../../agent-execution/services/agent-run-service.js";
import type { TeamRunService } from "../../agent-team-execution/services/team-run-service.js";
import type { RemoteStartedRunRef } from "../../agent-collaboration/execution/remote/remote-run-channel.js";
import type { PeerHandlerRefusal } from "../channel/peer-gateway.js";
import type { PeerNode } from "../domain/peer-node.js";
import { REMOTE_REFUSAL } from "../domain/remote-refusals.js";
import type { DelegatedRunStateRequest } from "../domain/remote-requests.js";
import type { ClosedDelegations } from "./closed-delegations.js";
import type { RemoteRootDirectory } from "./remote-message-receiver.js";

const refusal = (code: string, message: string): PeerHandlerRefusal => Object.freeze({ accepted: false, code, message });

/**
 * autobyteus-591 DN-2: the one owner on this node of a peer-started run's delegation state, as its delegating node sends
 * it. The request is checked against the run's stored back-link first (only the caller's own delegation, REQ-003).
 * - `open: false`: recorded in `ClosedDelegations` (the run leaves the run list, DN-6), then stopped through a closed
 *   Task's ordinary Stop, which re-checks the record where the run's gate closes; answered after the Stop completed.
 *   A run that is not running has nothing to stop.
 * - `open: true`: the record is removed (the run is listed again); nothing is started.
 * Nothing is deleted. Both are idempotent, so the delegating node may send the same state again.
 */
export class DelegatedRunStateHandler {
  constructor(private readonly dependencies: Readonly<{
    roots: Pick<RemoteRootDirectory, "storedLinkCheck">;
    closed: Pick<ClosedDelegations, "has" | "close" | "open">;
    agentRuns: Pick<AgentRunService, "stopForTaskClosure">;
    teamRuns: Pick<TeamRunService, "stopForTaskClosure">;
  }>) {}

  async apply(request: DelegatedRunStateRequest, from: PeerNode): Promise<Readonly<{ accepted: true; open: boolean }> | PeerHandlerRefusal> {
    const run = request.run;
    const stored = await this.dependencies.roots.storedLinkCheck(run, { kind: "owner", fromNodeId: from.nodeId, targetAgentRunId: null })
      .catch(() => "not_found" as const);
    if (stored === "not_found") return refusal(REMOTE_REFUSAL.TARGET_NOT_FOUND, "That run does not exist on this node.");
    if (stored === "not_linked") return refusal(REMOTE_REFUSAL.TARGET_NOT_PERMITTED, "That run was not started by the calling node's delegation.");
    if (request.open) {
      await this.dependencies.closed.open(run);
      return Object.freeze({ accepted: true as const, open: true });
    }
    await this.dependencies.closed.close(run, from.nodeId);
    const outcome = await this.stop(run);
    if (outcome === "not_stopped") return refusal("DELEGATED_RUN_NOT_STOPPED", `The ${run.kind === "agent" ? "agent" : "team"} run '${run.runId}' did not stop.`);
    // The state this node holds now: closed, or open again when an inbound message cleared it while the run stopped (S-5).
    return Object.freeze({ accepted: true as const, open: !this.dependencies.closed.has(run) });
  }

  private stop(run: RemoteStartedRunRef): Promise<"stopped" | "kept_open" | "not_stopped"> {
    const stillClosed = () => this.dependencies.closed.has(run);
    return run.kind === "agent"
      ? this.dependencies.agentRuns.stopForTaskClosure(run.runId, stillClosed)
      : this.dependencies.teamRuns.stopForTaskClosure(run.runId, stillClosed);
  }
}
