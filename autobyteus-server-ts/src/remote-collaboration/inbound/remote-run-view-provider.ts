import type { AgentPresentationMessage } from "@autobyteus/agent-presentation-contracts";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import { runAgentStatusFrame, type RunAgentObservation } from "../../agent-collaboration/execution/remote/run-agent-access.js";
import type {
  RemoteAgentLaunch,
  RemoteAgentProjection,
  RemoteRunSummary,
  RemoteStartedRunRef,
  RemoteTargetRoot,
} from "../../agent-collaboration/execution/remote/remote-run-channel.js";
import type { PeerHandlerRefusal } from "../channel/peer-gateway.js";
import type { PeerNode } from "../domain/peer-node.js";
import { REMOTE_REFUSAL } from "../domain/remote-refusals.js";
import type {
  AgentProjectionRequest,
  OwnerCommandRequest,
  RunObservationOpening,
  RunSummariesRequest,
} from "../domain/remote-requests.js";
import type { RemoteRootDirectory } from "./remote-message-receiver.js";
import { getAgentStreamSequences, type AgentStreamSequences } from "../../services/agent-streaming/agent-stream-sequence.js";
import type { AgentStreamSnapshotPayload } from "../../services/agent-streaming/agent-stream-snapshot.js";
import { observePeerAgentStream, peerAgentStreamSnapshot, type PeerAgentStreamFrame } from "./peer-agent-stream.js";

/** The stored reads of a run a peer started, as this node's own window has them. */
export type PeerStartedRunViews = Readonly<{
  /** The run's title from its history catalog; `null` when it has none yet. */
  runTitle(run: RemoteStartedRunRef): Promise<string | null>;
  /** Each agent's launch, from the run's own file (SR-038): the run's own facts, read when the peer asks. */
  runLaunches(run: RemoteStartedRunRef): Promise<readonly RemoteAgentLaunch[]>;
  /** One agent's stored conversation projection (the run-view projection this node's window reads). */
  agentProjection(run: RemoteStartedRunRef, agentRunId: string): Promise<RemoteAgentProjection>;
}>;

/** Where the frames of an open observation go: the peer's stream, until either side closes it. */
export type RunObservationSink = Readonly<{
  /** A run observation's presentation frame, or an agent stream observation's numbered frame (SR-088). */
  send(frame: Readonly<{ agentRunId: string; message: AgentPresentationMessage }> | PeerAgentStreamFrame): void;
  close(): void;
}>;

const refusal = (code: string, message: string): PeerHandlerRefusal => Object.freeze({ accepted: false, code, message });
const notFound = () => refusal(REMOTE_REFUSAL.TARGET_NOT_FOUND, "That run does not exist on this node.");
const notLinked = () => refusal(REMOTE_REFUSAL.TARGET_NOT_PERMITTED, "That run was not started by the calling node's delegation.");
const answerOf = (result: AgentOperationResult) => result.accepted
  ? Object.freeze({ accepted: true as const })
  : refusal(result.code ?? "REMOTE_OWNER_COMMAND_NOT_ACCEPTED", result.message ?? "The command was not accepted.");

/** Only Agents and Agent Teams are started for a peer; an Org target is never one. */
const startedRunOf = (root: RemoteTargetRoot): RemoteStartedRunRef | null =>
  root.kind === "agent_org" ? null : Object.freeze({ kind: root.kind, runId: root.runId });

/**
 * autobyteus-278: the one inbound owner of what a peer's owner reads and drives on this node: the summaries, stored
 * conversations, live output and commands of runs that peer's delegation started, about their own agents only
 * (an Agent run's own agent, a Team's members). Every request is checked against the run's stored back-link first (the
 * calling node started it), and then served by the root kind's own API behind `RemoteRootDirectory` (N-304).
 */
export class RemoteRunViewProvider {
  constructor(
    private readonly roots: RemoteRootDirectory,
    private readonly views: PeerStartedRunViews,
    /** This node's agent stream sequences (SR-088): an agent's own stream, served to the peer that started its run. */
    private readonly sequences: Pick<AgentStreamSequences, "of" | "follow"> = getAgentStreamSequences(),
  ) {}

  async summaries(request: RunSummariesRequest, from: PeerNode): Promise<Readonly<{ accepted: true; runs: readonly RemoteRunSummary[] }>> {
    const runs: RemoteRunSummary[] = [];
    for (const run of request.runs) {
      if (await this.check(run, from, null)) continue;
      runs.push(Object.freeze({
        kind: run.kind,
        runId: run.runId,
        title: await this.views.runTitle(run).catch(() => null),
        statuses: this.roots.runAgents(run.kind).runAgentStatuses(run.runId),
        // A run whose launches cannot be read answers none, with a warning naming it (`DESIGN.md` rule 7).
        launches: await this.views.runLaunches(run).catch((error: unknown) => {
          console.warn(`The launches of ${run.kind} run '${run.runId}' are left out of its summary: ${error instanceof Error ? error.message : String(error)}`);
          return Object.freeze([]);
        }),
      }));
    }
    return Object.freeze({ accepted: true as const, runs: Object.freeze(runs) });
  }

  async projection(request: AgentProjectionRequest, from: PeerNode) {
    const run = startedRunOf(request.targetRoot);
    if (!run) return notFound();
    const refused = await this.check(run, from, request.agentRunId);
    if (refused) return refused;
    try {
      return Object.freeze({ accepted: true as const, projection: await this.views.agentProjection(run, request.agentRunId) });
    } catch (error) {
      return refusal(REMOTE_REFUSAL.TARGET_NOT_FOUND, error instanceof Error ? error.message : String(error));
    }
  }

  async command(request: OwnerCommandRequest, from: PeerNode) {
    const run = startedRunOf(request.targetRoot);
    if (!run) return notFound();
    const refused = await this.check(run, from, request.agentRunId);
    if (refused) return refused;
    const result = await this.roots.runAgents(run.kind)
      .executeOwnerCommand(run.runId, request.agentRunId, request.command, { nodeName: from.name })
      .catch((error: unknown): AgentOperationResult => ({ accepted: false, code: "REMOTE_OWNER_COMMAND_FAILED",
        message: error instanceof Error ? error.message : String(error) }));
    return answerOf(result);
  }

  /**
   * Opens the run's live output to `sink`; the answer is the refusal, or the observation to close with the socket. A run
   * that ends by stop, terminate or delete through any path closes the sink (DS-006); the peer then reads its final
   * summary (AR-403). Idle shutdown does not end it.
   */
  async observe(opening: RunObservationOpening, from: PeerNode, sink: RunObservationSink): Promise<PeerHandlerRefusal | Readonly<{ accepted: true; observation: RunAgentObservation }>> {
    const run = startedRunOf(opening.targetRoot);
    if (!run) return notFound();
    const refused = await this.check(run, from, null);
    if (refused) return refused;
    const agents = this.roots.runAgents(run.kind);
    const observation = await agents
      .observeRunAgents(run.runId, (agentRunId, message) => sink.send({ agentRunId, message }), () => sink.close())
      .catch(() => null);
    if (!observation) return notFound();
    // CR-461-090: the stream carries changes only, so it opens with each running agent's current status, read after the
    // listener is attached (no change falls between them). A run that is not running has none: its peer reads offline.
    for (const live of agents.runAgentStatuses(run.runId)) sink.send({ agentRunId: live.agentRunId, message: runAgentStatusFrame(live.status, live.backgroundTasksRunning) });
    return Object.freeze({ accepted: true as const, observation });
  }

  /**
   * One agent's own stream snapshot (autobyteus-461 SR-088): this node's, by 3b's rule; a stopped agent's is its full
   * stored read. With it, the agent's current status (`offline` when it is not running), which the peer shows first.
   */
  async agentStreamSnapshot(request: AgentProjectionRequest, from: PeerNode) {
    const run = startedRunOf(request.targetRoot);
    if (!run) return notFound();
    const refused = await this.check(run, from, request.agentRunId);
    if (refused) return refused;
    try {
      const snapshot: AgentStreamSnapshotPayload = await peerAgentStreamSnapshot(this.sequences, request.agentRunId,
        () => this.views.agentProjection(run, request.agentRunId));
      const live = this.roots.runAgents(run.kind).runAgentStatuses(run.runId).find((agent) => agent.agentRunId === request.agentRunId);
      return Object.freeze({ accepted: true as const, snapshot, status: runAgentStatusFrame(live?.status ?? "offline", live?.backgroundTasksRunning ?? 0) });
    } catch (error) {
      return refusal(REMOTE_REFUSAL.TARGET_NOT_FOUND, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * One agent's own numbered frames (SR-088), following it across stops and restores until the peer closes the stream.
   * The run-level `observe` stays for statuses and summaries.
   */
  async observeAgentStream(opening: RunObservationOpening & Readonly<{ agentRunId: string }>, from: PeerNode, sink: RunObservationSink) {
    const run = startedRunOf(opening.targetRoot);
    if (!run) return notFound();
    const refused = await this.check(run, from, opening.agentRunId);
    if (refused) return refused;
    return Object.freeze({ accepted: true as const, observation: observePeerAgentStream(this.sequences, opening.agentRunId, (frame) => sink.send(frame)) });
  }

  /** The link check against the stored back-link (N-303/N-304): `null` when the calling node started the run. */
  private async check(run: RemoteStartedRunRef, from: PeerNode, targetAgentRunId: string | null): Promise<PeerHandlerRefusal | null> {
    const stored = await this.roots.storedLinkCheck(run, { kind: "owner", fromNodeId: from.nodeId, targetAgentRunId }).catch(() => "not_found" as const);
    return stored === "proceed" ? null : stored === "not_linked" ? notLinked() : notFound();
  }
}
