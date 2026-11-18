import { executePeerCommand, PEER_MENTIONS_REFUSAL } from "../../agent-collaboration/execution/remote/peer-runs.js";
import { inOrderViewDelivery, isReadBeforeSending, readTreeAtBase, readViewTree, type RunViewRowSources } from "./run-view-rows.js";
import { isRunTreeChangedEvent } from "../../agent-collaboration/delegation/run-tree-view.js";
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
import { userInterruptOutcome } from "./user-interrupt-outcome.js";

/** A command for one agent of the root (every client command but Retry). */
type AgentCommand = CollaborationStreamClientMessage;

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
 * Agent-run stream `/ws/agent-collaboration/:agentRunId` (design DS-8; SR-061 … SR-063, SR-084): the run's view, from its
 * one `RunViewStream`: the snapshot and its tree (read with the base), then every frame after it in order (the run's own
 * events, and its tree's changes). Its rows' statuses are each run's own (`/ws/run-status`, SR-083). Connecting resolves the run's root and never
 * starts its agent. A delegated run is reached by its own stream (rule 2); a peer run's commands go through the root to
 * its node, as at base. Commands for the run's own agent stay on `/ws/agent/:runId`.
 */
export class AgentCollaborationStreamHandler {
  private readonly sessions = new Map<string, { egress: RootExecutionStreamEgress; agentRunId: string; close(): void }>();

  constructor(
    private readonly roots: Pick<StandaloneAgentRunRootManager, "resolveRoot" | "getActive">,
    /** What the run's view reads about its rows (SR-061 … SR-063, passed in by the composition root). */
    private readonly views: RunViewRowSources,
  ) {}

  /** The run's root; opening a view never starts its agent (DS-8, REQ-004): it starts on its first input. */
  private async readyRoot(agentRunId: string): Promise<StandaloneAgentRunRoot> {
    const root = await this.roots.resolveRoot(agentRunId);
    if (!root) throw new StandaloneRootUnavailableError(`Agent run '${agentRunId}' is not a collaboration run.`);
    return root;
  }

  async connect(connection: WebSocketConnection, agentRunIdInput: string): Promise<string | null> {
    const agentRunId = agentRunIdInput.trim();
    // Every message to this socket leaves through its egress; an ERROR or ROOT_LIFECYCLE sent
    // before a close flushes pending content first.
    const egress = createRootExecutionStreamEgress(connection, `agent root '${agentRunId}'`);
    let root;
    try {
      root = await this.readyRoot(agentRunId);
    } catch (cause) {
      egress.send(error("AGENT_ROOT_UNAVAILABLE", cause instanceof Error ? cause.message : String(cause)));
      egress.dispose();
      connection.close(4004);
      return null;
    }
    const sessionId = randomUUID();
    const identity = root.rootIdentity;
    let barrier;
    try {
      barrier = await root.openViewSnapshotConnection(() => readTreeAtBase(this.views, identity),
        async (own, atBase) => ({ own, tree: await readViewTree(this.views, identity, atBase) }));
    } catch (cause) {
      egress.send(error("AGENT_ROOT_STREAM_UNAVAILABLE", String(cause)));
      egress.dispose();
      connection.close(1011);
      return null;
    }
    try {
      egress.send(CollaborationStreamServerMessageSchema.parse({
        type: "CONNECTED", payload: { root_subject_kind: "agent", root_run_id: agentRunId, session_id: sessionId },
      }));
      egress.send(CollaborationStreamServerMessageSchema.parse({
        type: "ROOT_EXECUTION_VIEW_SNAPSHOT",
        payload: projectAgentCollaborationView({ agentRunId, isActive: root.isAgentLive(), snapshot: barrier.snapshot.own,
          baseChangeSequence: barrier.baseChangeSequence, liveSequenceId: barrier.liveSequenceId,
          lastMessageChangeSequence: barrier.lastMessageChangeSequence }),
      }));
      // The run's tree at the same base (SR-084); its changes follow as numbered `run_tree_changed` events.
      const tree = barrier.snapshot.tree;
      egress.send(CollaborationStreamServerMessageSchema.parse({ type: "RUN_TREE_SNAPSHOT", payload: { root_subject_kind: "agent", root_run_id: agentRunId,
        base_change_sequence: barrier.baseChangeSequence, rows: tree.current } }));
      // Every frame after the base, in order; the tree is read again on its notice, when the notice is sent.
      let open = true;
      const unsubscribe = barrier.subscribe(inOrderViewDelivery((event) => isReadBeforeSending(event.event), async (event) => {
        if (!open) return;
        try {
          if (isRunTreeChangedEvent(event.event)) {
            const change = await tree.next();
            if (open) egress.send(CollaborationStreamServerMessageSchema.parse({ type: "ROOT_EXECUTION_EVENT", payload: { root_subject_kind: "agent",
              root_run_id: agentRunId, change_sequence: event.changeSequence, event: { kind: "run_tree_changed", ...change } } }));
            return;
          }
          const projected = projectAgentCollaborationEvent(agentRunId, event);
          if (projected && open) egress.send(CollaborationStreamServerMessageSchema.parse({ type: "ROOT_EXECUTION_EVENT", payload: projected }));
        } catch (cause) {
          egress.send(error("AGENT_ROOT_STREAM_PROJECTION_FAILED", cause instanceof Error ? cause.message : String(cause)));
          queueMicrotask(() => { this.disconnect(sessionId); connection.close(1011); });
          return;
        }
        if (event.event.kind === "lifecycle") {
          egress.send(CollaborationStreamServerMessageSchema.parse({
            type: "ROOT_LIFECYCLE", payload: { root_subject_kind: "agent", root_run_id: agentRunId, is_active: event.event.isActive },
          }));
          if (!event.event.isActive) queueMicrotask(() => { this.disconnect(sessionId); connection.close(1000); });
        }
      }));
      // The run's own agent's state (SR-045): a stopped run's view keeps its stream; its agent starts on its first input.
      egress.send(CollaborationStreamServerMessageSchema.parse({
        type: "ROOT_LIFECYCLE", payload: { root_subject_kind: "agent", root_run_id: agentRunId, is_active: root.isAgentLive() },
      }));
      this.sessions.set(sessionId, { egress, agentRunId, close: () => { open = false; unsubscribe(); egress.dispose(); } });
      return sessionId;
    } catch (cause) {
      barrier.close();
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
    const message: AgentCommand = parsed;
    try {
      if (message.payload.root_subject_kind !== "agent" || message.payload.root_run_id !== session.agentRunId) {
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
      const result = message.type === "INTERRUPT_GENERATION"
        ? userInterruptOutcome(await executePeerCommand(peer, target, { kind: "interrupt" }))
        : await executePeerCommand(peer, target, { kind: "approve_tool", invocationId: message.payload.invocation_id, approved: message.type === "APPROVE_TOOL", reason: message.payload.reason });
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
