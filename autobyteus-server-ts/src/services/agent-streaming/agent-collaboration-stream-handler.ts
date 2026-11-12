import type { DelegatedRunCommands } from "../../agent-collaboration/execution/delegation/delegated-run-commands.js";
import type { ChildRowsStreams } from "../../agent-collaboration/delegation/child-rows-streams.js";
import type { LocalChildFollowers } from "../../agent-collaboration/execution/delegation/local-child-followers.js";
import type { RunViewChildren } from "./run-view-children.js";
import type { TeamMemberExecutionCommand } from "../../agent-team-execution/domain/team-member-execution-command.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
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
import { ChildRowsStreamSession, projectCollaborationChildRunsChanged } from "./child-rows-stream-session.js";

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
 * Agent-run stream `/ws/agent-collaboration/:hostRunId` (design DS-8): the snapshot and events of the run's view and the
 * commands of its child rows. Connecting resolves the run's root and never starts its agent. A local child's command
 * goes to the child's own run (`DelegatedRunCommands`), a peer child's through the root to its node. Commands for the
 * run's own agent stay on `/ws/agent/:runId`.
 */
export class AgentCollaborationStreamHandler {
  private readonly sessions = new Map<string, { egress: RootExecutionStreamEgress; hostRunId: string; close(): void }>();

  constructor(
    private readonly roots: Pick<StandaloneAgentRunRootManager, "resolveRoot" | "getActive">,
    /** What the views need of a run's children (DS-8; SR-047 step 7, passed in by the composition root). */
    private readonly views: Readonly<{
      streams: Pick<ChildRowsStreams, "open">;
      children: Pick<RunViewChildren, "rows" | "remote">;
      followers: Pick<LocalChildFollowers, "followLive">;
    }>,
    /** A child row's command goes to the child's own run (AR-011). */
    private readonly children: Pick<DelegatedRunCommands, "execute" | "postUserMessage">,
  ) {}

  /** A child row's command: a peer child's goes to its node through the root; a local child's to its own root (AR-011). */
  private async childCommand(root: StandaloneAgentRunRoot, target: string, command: TeamMemberExecutionCommand): Promise<AgentOperationResult> {
    return await this.children.execute(root.rootIdentity, target, command) ?? root.executeAgentCommand(target, command);
  }

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
    // SR-044: opened before the tree is read for the snapshot; changes published meanwhile follow the snapshot.
    const childRows = new ChildRowsStreamSession(this.views.streams, root.rootIdentity, (event) => egress.send(projectCollaborationChildRunsChanged("agent", hostRunId, event)));
    const remoteTaskExecutions = await this.views.children.remote(root.rootIdentity);
    const taskExecutions = await this.views.children.rows(root.rootIdentity);
    const barrier = await root.openPackageSnapshotConnection();
    try {
      egress.send(CollaborationStreamServerMessageSchema.parse({
        type: "CONNECTED", payload: { root_subject_kind: "agent", root_run_id: hostRunId, session_id: sessionId },
      }));
      egress.send(CollaborationStreamServerMessageSchema.parse({
        type: "ROOT_EXECUTION_VIEW_SNAPSHOT",
        payload: projectAgentCollaborationView({ hostRunId, isActive: root.isHostLive(), snapshot: barrier.snapshot,
          baseChangeSequence: barrier.baseChangeSequence, liveSequenceId: barrier.liveSequenceId,
          lastMessageChangeSequence: barrier.lastMessageChangeSequence, remoteTaskExecutions, taskExecutions }),
      }));
      childRows.snapshotSent();
      const unsubscribe = barrier.subscribe((event) => {
        try {
          const projected = projectAgentCollaborationEvent(hostRunId, null, event);
          if (projected) egress.send(CollaborationStreamServerMessageSchema.parse({ type: "ROOT_EXECUTION_EVENT", payload: projected }));
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
      // The run's own agent's state (SR-045): a stopped run's view keeps its stream; its agent starts on its first input.
      egress.send(CollaborationStreamServerMessageSchema.parse({
        type: "ROOT_LIFECYCLE", payload: { root_subject_kind: "agent", root_run_id: hostRunId, is_active: root.isHostLive() },
      }));
      // autobyteus-278: a viewer of the root observes its remote children while connected.
      root.remoteChildren.viewerAttached();
      const stopChildren = this.views.followers.followLive(root);
      this.sessions.set(sessionId, { egress, hostRunId, close: () => { unsubscribe(); childRows.dispose(); root.remoteChildren.viewerDetached(); stopChildren(); egress.dispose(); } });
      return sessionId;
    } catch (cause) {
      barrier.close();
      childRows.dispose();
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
        void this.roots.getActive(session.hostRunId)?.remoteChildren.refresh();
      }
      return;
    }
    const message: AgentCommand = parsed;
    try {
      if (message.payload.root_subject_kind !== "agent" || message.payload.root_run_id !== session.hostRunId) {
        throw new Error("Agent-root command root correlation mismatch.");
      }
      // Child commands never need the host: an active root (host crashed or not) takes them directly.
      const root = this.roots.getActive(session.hostRunId) ?? await this.readyRoot(session.hostRunId);
      const target = message.payload.target_agent_run_id;
      if (message.type === "SEND_MESSAGE") {
        const mentions = toCollaboratorMentions(message.payload.mentions);
        const contextFiles = [
          ...message.payload.context_file_paths.map((filePath) => new ContextFile(filePath)),
          ...message.payload.image_urls.map((url) => new ContextFile(url, ContextFileType.IMAGE)),
        ];
        const userMessage = (content: string) => AgentInputUserMessage.fromDict({
          content,
          context_files: contextFiles.length ? contextFiles.map((file) => file.toDict()) : null,
          metadata: { input_origin: "user_message", message_id: message.payload.message_id, dedupe_key: message.payload.dedupe_key },
        });
        // A child row's message, mentions included, goes to the child's own root (CR-461-032).
        const child = await this.children.postUserMessage(root.rootIdentity, target, { message: userMessage(message.payload.content), mentions });
        if (child) {
          session.egress.send(commandAck(message, child.accepted ? "accepted" : "rejected",
            child.accepted ? null : child.code ?? "AGENT_ROOT_COMMAND_REJECTED", child.message ?? null, child.collaboratorName));
          return;
        }
        // The run's own agent: its own root resolves its mentions.
        let content = message.payload.content;
        if (mentions.length) {
          const admission = await root.resolveCollaboratorMentions({ focusedAgentRunId: target, mentions });
          if (!admission.admitted) {
            session.egress.send(commandAck(
              message, "rejected", admission.code, admission.message,
              "collaboratorName" in admission ? admission.collaboratorName : undefined,
            ));
            return;
          }
          content = composeCollaboratorMentionNote(content, admission.collaborators);
        }
        const result = await root.executeAgentCommand(target, { kind: "post_message", message: userMessage(content) });
        session.egress.send(commandAck(message, result.accepted ? "accepted" : "rejected",
          result.accepted ? null : result.code ?? "AGENT_ROOT_COMMAND_REJECTED", result.message ?? null));
        return;
      }
      const result = await this.childCommand(root, target, message.type === "INTERRUPT_GENERATION"
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
