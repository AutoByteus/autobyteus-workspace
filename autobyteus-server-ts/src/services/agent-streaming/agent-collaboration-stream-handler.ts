import { executePeerCommand, PEER_MENTIONS_REFUSAL } from "../../agent-collaboration/execution/remote/peer-runs.js";
import { createAgentRootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { isChildRowRootEvent, readRowEvent, readRowsAtBase, readViewRows, type RunViewRowSources } from "./run-view-rows.js";
import { randomUUID } from "node:crypto";
import {
  CollaborationStreamClientMessageSchema,
  CollaborationStreamServerMessageSchema,
  type CollaborationStreamClientMessage,
  type CollaborationStreamServerMessage,
} from "@autobyteus/collaboration-stream-contracts";
import { AgentInputUserMessage, ContextFile, ContextFileType } from "autobyteus-ts";
import { composeCollaboratorMentionNote } from "@autobyteus/agent-presentation-contracts";
import { toCollaboratorMentions } from "../../agent-collaboration/collaborators/collaborator-admission.js";
import {
  StandaloneRootUnavailableError,
  type StandaloneAgentRunRootManager,
} from "../../standalone-agent-run-root/services/standalone-agent-run-root-manager.js";
import type { StandaloneAgentRunRoot } from "../../standalone-agent-run-root/domain/standalone-agent-run-root.js";
import { projectAgentCollaborationEvent, projectAgentCollaborationView } from "./agent-collaboration-view-projector.js";
import type { WebSocketConnection } from "./agent-team-stream-handler.js";
import { createRootExecutionStreamEgress, type RootExecutionStreamEgress } from "./websocket-egress/root-execution-stream-egress.js";

/** A command for one agent of the root (every client command but Retry). */
type AgentCommand = Exclude<CollaborationStreamClientMessage, { type: "REFRESH_REMOTE_TASK_EXECUTIONS" }>;

const error = (code: string, message: string): CollaborationStreamServerMessage =>
  CollaborationStreamServerMessageSchema.parse({ type: "ERROR", payload: { code, message } });
const commandAck = (
  message: AgentCommand,
  state: "accepted" | "rejected" | "failed",
  code: string | null,
  detail: string | null,
  collaboratorName?: string,
): CollaborationStreamServerMessage => CollaborationStreamServerMessageSchema.parse({
  type: "AGENT_COMMAND_ACK",
  payload: {
    root_subject_kind: "agent",
    root_run_id: message.payload.root_run_id,
    command_id: message.payload.command_id,
    command_type: message.type,
    target_agent_run_id: message.payload.target_agent_run_id,
    state,
    code,
    message: detail,
    ...(collaboratorName ? { collaborator_name: collaboratorName } : {}),
  },
});

/**
 * Agent-run stream `/ws/agent-collaboration/:hostRunId` (design DS-8; SR-061 … SR-063): the run's view in base's shapes,
 * from its one `RunViewStream`: the snapshot (its rows read with the base), then every frame after it in order (the run's
 * own events, base's row events with their records, its rows' statuses). Connecting resolves the run's root and never
 * starts its agent. A delegated run is reached by its own stream (rule 2); a peer run's commands go through the root to
 * its node, as at base. Commands for the run's own agent stay on `/ws/agent/:runId`.
 */
export class AgentCollaborationStreamHandler {
  private readonly sessions = new Map<string, { egress: RootExecutionStreamEgress; hostRunId: string; close(): void }>();

  constructor(
    private readonly roots: Pick<StandaloneAgentRunRootManager, "resolveRoot" | "getActive">,
    /** What the run's view reads about its rows (SR-061 … SR-063, passed in by the composition root). */
    private readonly views: RunViewRowSources,
  ) {}

  /** The run's root; opening a view never starts its agent (DS-8, REQ-004): it starts on its first input. */
  private async readyRoot(hostRunId: string): Promise<StandaloneAgentRunRoot> {
    const root = await this.roots.resolveRoot(hostRunId);
    if (!root) throw new StandaloneRootUnavailableError(`Agent run '${hostRunId}' is not a collaboration run.`);
    return root;
  }

  async connect(connection: WebSocketConnection, hostRunIdInput: string): Promise<string | null> {
    const hostRunId = hostRunIdInput.trim();
    // Every message to this socket leaves through its egress; an ERROR or ROOT_LIFECYCLE sent
    // before a close flushes pending content first.
    const egress = createRootExecutionStreamEgress(connection, `agent root '${hostRunId}'`);
    let root;
    try {
      root = await this.readyRoot(hostRunId);
    } catch (cause) {
      egress.send(error("AGENT_ROOT_UNAVAILABLE", cause instanceof Error ? cause.message : String(cause)));
      egress.dispose();
      connection.close(4004);
      return null;
    }
    const sessionId = randomUUID();
    const identity = root.rootIdentity;
    // The rows' statuses are followed into the run's stream before its snapshot: each after the base is a frame.
    const stopFollowing = this.views.followers.follow(identity);
    let barrier;
    try {
      barrier = await root.openViewSnapshotConnection(() => readRowsAtBase(this.views, identity),
        async (own, atBase) => ({ own, statuses: atBase.statuses, rows: await readViewRows(this.views.projection, identity, atBase) }));
    } catch (cause) {
      stopFollowing();
      egress.send(error("AGENT_ROOT_STREAM_UNAVAILABLE", String(cause)));
      egress.dispose();
      connection.close(1011);
      return null;
    }
    try {
      egress.send(CollaborationStreamServerMessageSchema.parse({
        type: "CONNECTED", payload: { root_subject_kind: "agent", root_run_id: hostRunId, session_id: sessionId },
      }));
      egress.send(CollaborationStreamServerMessageSchema.parse({
        type: "ROOT_EXECUTION_VIEW_SNAPSHOT",
        payload: projectAgentCollaborationView({ hostRunId, isActive: root.isHostLive(), snapshot: barrier.snapshot.own,
          baseChangeSequence: barrier.baseChangeSequence, liveSequenceId: barrier.liveSequenceId,
          lastMessageChangeSequence: barrier.lastMessageChangeSequence, rows: barrier.snapshot.rows, childStatuses: barrier.snapshot.statuses }),
      }));
      // Every frame after the base, in order; a row event's records are read when it is sent.
      let sending: Promise<void> = Promise.resolve();
      let open = true;
      const unsubscribe = barrier.subscribe((event) => {
        sending = sending.then(async () => {
          if (!open) return;
          try {
            const rowEvent = isChildRowRootEvent(event.event) ? await readRowEvent(this.views.projection, event.event) : null;
            const projected = projectAgentCollaborationEvent(hostRunId, event, rowEvent);
            if (projected && open) egress.send(CollaborationStreamServerMessageSchema.parse({ type: "ROOT_EXECUTION_EVENT", payload: projected }));
          } catch (cause) {
            egress.send(error("AGENT_ROOT_STREAM_PROJECTION_FAILED", cause instanceof Error ? cause.message : String(cause)));
            queueMicrotask(() => { this.disconnect(sessionId); connection.close(1011); });
            return;
          }
          if (event.event.kind === "lifecycle") {
            egress.send(CollaborationStreamServerMessageSchema.parse({
              type: "ROOT_LIFECYCLE", payload: { root_subject_kind: "agent", root_run_id: hostRunId, is_active: event.event.isActive },
            }));
            if (!event.event.isActive) queueMicrotask(() => { this.disconnect(sessionId); connection.close(1000); });
          }
        });
      });
      // The run's own agent's state (SR-045): a stopped run's view keeps its stream; its agent starts on its first input.
      egress.send(CollaborationStreamServerMessageSchema.parse({
        type: "ROOT_LIFECYCLE", payload: { root_subject_kind: "agent", root_run_id: hostRunId, is_active: root.isHostLive() },
      }));
      // The view's peer rows, observed after its snapshot (SR-066): never through the root.
      const stopPeers = this.views.peers.follow(root.rootIdentity);
      this.sessions.set(sessionId, { egress, hostRunId, close: () => { open = false; unsubscribe(); stopPeers(); stopFollowing(); egress.dispose(); } });
      return sessionId;
    } catch (cause) {
      barrier.close();
      stopFollowing();
      egress.send(error("AGENT_ROOT_STREAM_UNAVAILABLE", String(cause)));
      egress.dispose();
      connection.close(1011);
      return null;
    }
  }

  async handleMessage(sessionId: string, raw: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    let parsed: CollaborationStreamClientMessage;
    try {
      parsed = CollaborationStreamClientMessageSchema.parse(JSON.parse(raw));
    } catch (cause) {
      session.egress.send(error("AGENT_ROOT_COMMAND_INVALID", cause instanceof Error ? cause.message : String(cause)));
      return;
    }
    if (parsed.type === "REFRESH_REMOTE_TASK_EXECUTIONS") {
      // Retry: the answers arrive as root events.
      if (parsed.payload.root_subject_kind === "agent" && parsed.payload.root_run_id === session.hostRunId) {
        void this.views.peers.refresh(createAgentRootExecutionIdentity(session.hostRunId));
      }
      return;
    }
    const message: AgentCommand = parsed;
    try {
      if (message.payload.root_subject_kind !== "agent" || message.payload.root_run_id !== session.hostRunId) {
        throw new Error("Agent-root command root correlation mismatch.");
      }
      // The view takes commands for its peer rows only, through each one's handle (SR-066): a delegated run on this node
      // is reached by its own stream (rule 2), and the run's own agent by `/ws/agent/:runId`.
      const target = message.payload.target_agent_run_id;
      const peer = this.views.peerRunOf(target);
      if (!peer) {
        session.egress.send(commandAck(message, "rejected", "RUN_NOT_FOUND", `AgentRun '${target}' is not a run on another node; it is reached by its own stream.`));
        return;
      }
      if (message.type === "SEND_MESSAGE") {
        const result = toCollaboratorMentions(message.payload.mentions).length ? PEER_MENTIONS_REFUSAL
          : await executePeerCommand(peer, target, { kind: "post_message", message: AgentInputUserMessage.fromDict({
          content: message.payload.content,
          metadata: { input_origin: "user_message", message_id: message.payload.message_id, dedupe_key: message.payload.dedupe_key },
        }) });
        session.egress.send(commandAck(message, result.accepted ? "accepted" : "rejected",
          result.accepted ? null : result.code ?? "AGENT_ROOT_COMMAND_REJECTED", result.message ?? null));
        return;
      }
      const result = await executePeerCommand(peer, target, message.type === "INTERRUPT_GENERATION"
        ? { kind: "interrupt" }
        : { kind: "approve_tool", invocationId: message.payload.invocation_id, approved: message.type === "APPROVE_TOOL", reason: message.payload.reason });
      session.egress.send(commandAck(message, result.accepted ? "accepted" : "rejected",
        result.accepted ? null : result.code ?? "AGENT_ROOT_COMMAND_REJECTED", result.message ?? null));
    } catch (cause) {
      session.egress.send(commandAck(message, "failed", "AGENT_ROOT_COMMAND_FAILED", cause instanceof Error ? cause.message : String(cause)));
    }
  }

  disconnect(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.close();
    this.sessions.delete(sessionId);
  }
}
