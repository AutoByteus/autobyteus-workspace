import { randomUUID } from "node:crypto";
import type {
  RemoteRunChannel,
  RemoteRunObservationStream,
  RemoteTargetRoot,
} from "../../agent-collaboration/execution/remote/remote-run-channel.js";
import { buildInterruptGenerationCommandAck } from "./interrupt-generation-command-ack.js";
import { userInterruptOutcome } from "./user-interrupt-outcome.js";

type Frame = Readonly<Record<string, unknown>>;
export type PeerRunStreamSink = Readonly<{ send(message: Frame): void; close(code: number): void }>;

const message = (type: string, payload: Record<string, unknown>): Frame => Object.freeze({ type, payload });
const textOf = (value: unknown): string | null => typeof value === "string" && value.trim() ? value.trim() : null;

/**
 * A peer's run opened by its own identity (autobyteus-461 G-D1, SR-088): `/ws/peer-run` on this node, in the
 * `/ws/agent` protocol, served through the run's channel to its node. It relays node B's own agent stream one for one:
 * node B's snapshot (`agentStreamSnapshot`), then its numbered frames (`observeAgentStream`) after the snapshot's base,
 * in the same sequence. On a gap or a new `liveSequenceId` (a restore on node B) it takes a new snapshot, sent in-band.
 * A frame without a sequence is a contract violation (`DESIGN.md` rule 9): logged and dropped. A message and an
 * interrupt go to the agent through the owner commands, with no tool approval, as at base.
 */
export class PeerRunStreamSession {
  readonly sessionId = randomUUID();
  private observation: RemoteRunObservationStream | null = null;
  private liveSequenceId: string | null = null;
  private last: number | null = null;
  /** Frames that arrive while a snapshot is taken; replayed after it against its base. */
  private held: [string, Frame][] | null = null;
  private closed = false;

  constructor(private readonly input: Readonly<{
    channel: Pick<RemoteRunChannel, "agentStreamSnapshot" | "observeAgentStream" | "ownerCommand">;
    nodeId: string;
    targetRoot: RemoteTargetRoot;
    agentRunId: string;
    sink: PeerRunStreamSink;
  }>) {}

  start(): void {
    const { agentRunId } = this.input;
    this.input.sink.send(message("CONNECTED", { agent_id: agentRunId, session_id: this.sessionId }));
    // The observation first, so a frame after the snapshot's base is never missed (a lost one shows as a gap).
    this.observation = this.input.channel.observeAgentStream(this.input.nodeId, this.input.targetRoot, agentRunId, {
      onFrame: (liveSequenceId, frame) => this.onFrame(liveSequenceId, frame),
      onEnd: () => this.end(`The stream of agent run '${agentRunId}' on its node ended.`),
    });
    void this.snapshot();
  }

  close(): void {
    this.closed = true;
    this.observation?.close();
    this.observation = null;
  }

  /** The client's commands: a message and an interrupt, through the owner commands of the run that started it. */
  async handleMessage(raw: string): Promise<void> {
    let data: { type?: unknown; payload?: Record<string, unknown> };
    try { data = JSON.parse(raw) as typeof data; } catch { return; }
    const payload = data.payload ?? {};
    if (data.type === "SEND_MESSAGE") await this.sendMessage(payload);
    else if (data.type === "INTERRUPT_GENERATION") await this.interrupt(payload);
  }

  private async snapshot(): Promise<void> {
    if (this.closed) return;
    this.held = this.held ?? [];
    const answer = await this.input.channel.agentStreamSnapshot(this.input.nodeId, this.input.targetRoot, this.input.agentRunId)
      .catch((error: unknown) => ({ accepted: false as const, code: "PEER_UNREACHABLE", message: String(error) }));
    if (this.closed) return;
    if (!answer.accepted) return this.end(answer.message);
    const snapshot = answer.snapshot;
    this.liveSequenceId = textOf(snapshot.live_sequence_id);
    this.last = typeof snapshot.base_sequence === "number" ? snapshot.base_sequence : 0;
    this.input.sink.send(answer.status);
    this.input.sink.send(message("AGENT_STREAM_SNAPSHOT", snapshot as Record<string, unknown>));
    const held = this.held ?? [];
    this.held = null;
    for (const [liveSequenceId, frame] of held) this.onFrame(liveSequenceId, frame);
  }

  private onFrame(liveSequenceId: string, frame: Frame): void {
    if (this.closed) return;
    if (this.held) { this.held.push([liveSequenceId, frame]); return; }
    const sequence = frame.sequence;
    if (typeof sequence !== "number") {
      console.error(`A frame of agent run '${this.input.agentRunId}' from node '${this.input.nodeId}' has no sequence; it was dropped.`);
      return;
    }
    // A restore on node B (a new sequence), or a frame its snapshot does not continue: take a new snapshot.
    if (liveSequenceId !== this.liveSequenceId || this.last === null) { void this.snapshot(); return; }
    if (sequence <= this.last) return;
    if (sequence !== this.last + 1) { void this.snapshot(); return; }
    this.last = sequence;
    this.input.sink.send(frame);
  }

  private async sendMessage(payload: Record<string, unknown>): Promise<void> {
    const content = typeof payload.content === "string" ? payload.content : "";
    const messageId = textOf(payload.message_id) ?? randomUUID();
    const dedupeKey = textOf(payload.dedupe_key) ?? messageId;
    const receipt = await this.input.channel.ownerCommand(this.input.nodeId, this.input.targetRoot, this.input.agentRunId,
      { kind: "post_message", content, messageId, dedupeKey });
    this.input.sink.send(message("AGENT_COMMAND_ACK", {
      command_type: "SEND_MESSAGE", run_id: this.input.agentRunId, message_id: messageId, dedupe_key: dedupeKey,
      state: receipt.accepted ? "accepted" : "rejected", accepted: receipt.accepted, duplicate: false,
      ...(receipt.accepted ? {} : { code: "RUNTIME_REJECTED", message: receipt.message }),
    }));
  }

  private async interrupt(payload: Record<string, unknown>): Promise<void> {
    const target = { target_kind: "standalone_run" as const, run_id: this.input.agentRunId };
    const receipt = await this.input.channel.ownerCommand(this.input.nodeId, this.input.targetRoot, this.input.agentRunId, { kind: "interrupt" });
    this.input.sink.send(message("AGENT_COMMAND_ACK", buildInterruptGenerationCommandAck({ commandId: payload.command_id, target,
      result: userInterruptOutcome(receipt.accepted ? { accepted: true } : { accepted: false, code: receipt.code, message: receipt.message }) }) as unknown as Record<string, unknown>));
  }

  private end(reason: string): void {
    if (this.closed) return;
    this.input.sink.send(message("ERROR", { code: "PEER_RUN_STREAM_ENDED", message: reason, error_scope: null, error_effect: null, turn_id: null }));
    this.close();
    this.input.sink.close(1011);
  }
}
