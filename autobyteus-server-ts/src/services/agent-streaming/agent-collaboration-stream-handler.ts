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

const serialize = (message: CollaborationStreamServerMessage): string =>
  JSON.stringify(CollaborationStreamServerMessageSchema.parse(message));
const error = (code: string, message: string): CollaborationStreamServerMessage =>
  CollaborationStreamServerMessageSchema.parse({ type: "ERROR", payload: { code, message } });
const commandAck = (
  message: CollaborationStreamClientMessage,
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
 * Agent-root stream `/ws/agent-collaboration/:hostRunId`: snapshot, events and commands for
 * the run's collaborators. Connecting resolves the run's root and makes its host ready
 * (restoring it when needed). Child commands use the active root as is: a crashed host is not
 * restarted for them. Commands for the host itself stay on `/ws/agent/:runId`.
 */
export class AgentCollaborationStreamHandler {
  private readonly sessions = new Map<string, { connection: WebSocketConnection; hostRunId: string; close(): void }>();

  constructor(private readonly roots: Pick<StandaloneAgentRunRootManager, "resolveRoot" | "getActive">) {}

  /** The run's root with its host ready, as the stream's connect needs it. */
  private async readyRoot(hostRunId: string): Promise<StandaloneAgentRunRoot> {
    const root = await this.roots.resolveRoot(hostRunId);
    if (!root) throw new StandaloneRootUnavailableError(`Agent run '${hostRunId}' cannot host collaborators.`);
    await root.ensureHostReady();
    return root;
  }

  async connect(connection: WebSocketConnection, hostRunIdInput: string): Promise<string | null> {
    const hostRunId = hostRunIdInput.trim();
    let root;
    try {
      root = await this.readyRoot(hostRunId);
    } catch (cause) {
      connection.send(serialize(error("AGENT_ROOT_UNAVAILABLE", cause instanceof Error ? cause.message : String(cause))));
      connection.close(4004);
      return null;
    }
    const sessionId = randomUUID();
    const barrier = await root.openPackageSnapshotConnection();
    try {
      connection.send(serialize(CollaborationStreamServerMessageSchema.parse({
        type: "CONNECTED", payload: { root_subject_kind: "agent", root_run_id: hostRunId, session_id: sessionId },
      })));
      connection.send(serialize(CollaborationStreamServerMessageSchema.parse({
        type: "ROOT_EXECUTION_VIEW_SNAPSHOT",
        payload: projectAgentCollaborationView({ hostRunId, isActive: root.isHostLive(), snapshot: barrier.snapshot, baseChangeSequence: barrier.baseChangeSequence }),
      })));
      const unsubscribe = barrier.subscribe((event) => {
        try {
          const projected = projectAgentCollaborationEvent(hostRunId, root.getExecutionTreeSnapshot(), event);
          if (projected) connection.send(serialize(CollaborationStreamServerMessageSchema.parse({ type: "ROOT_EXECUTION_EVENT", payload: projected })));
        } catch (cause) {
          connection.send(serialize(error("AGENT_ROOT_STREAM_PROJECTION_FAILED", cause instanceof Error ? cause.message : String(cause))));
          queueMicrotask(() => { this.disconnect(sessionId); connection.close(1011); });
          return;
        }
        if (event.event.kind === "lifecycle") {
          connection.send(serialize(CollaborationStreamServerMessageSchema.parse({
            type: "ROOT_LIFECYCLE", payload: { root_subject_kind: "agent", root_run_id: hostRunId, is_active: event.event.isActive },
          })));
          if (!event.event.isActive) queueMicrotask(() => { this.disconnect(sessionId); connection.close(1000); });
        }
      });
      connection.send(serialize(CollaborationStreamServerMessageSchema.parse({
        type: "ROOT_LIFECYCLE", payload: { root_subject_kind: "agent", root_run_id: hostRunId, is_active: true },
      })));
      this.sessions.set(sessionId, { connection, hostRunId, close: unsubscribe });
      return sessionId;
    } catch (cause) {
      barrier.close();
      connection.send(serialize(error("AGENT_ROOT_STREAM_UNAVAILABLE", String(cause))));
      connection.close(1011);
      return null;
    }
  }

  async handleMessage(sessionId: string, raw: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    let message: CollaborationStreamClientMessage;
    try {
      message = CollaborationStreamClientMessageSchema.parse(JSON.parse(raw));
    } catch (cause) {
      session.connection.send(serialize(error("AGENT_ROOT_COMMAND_INVALID", cause instanceof Error ? cause.message : String(cause))));
      return;
    }
    try {
      if (message.payload.root_subject_kind !== "agent" || message.payload.root_run_id !== session.hostRunId) {
        throw new Error("Agent-root command root correlation mismatch.");
      }
      // Child commands never need the host: an active root (host crashed or not) takes them directly.
      const root = this.roots.getActive(session.hostRunId) ?? await this.readyRoot(session.hostRunId);
      const target = message.payload.target_agent_run_id;
      if (message.type === "SEND_MESSAGE") {
        let content = message.payload.content;
        if (message.payload.mentions?.length) {
          const admission = await root.admitCollaboratorMentions({
            focusedAgentRunId: target, mentions: toCollaboratorMentions(message.payload.mentions),
          });
          if (!admission.admitted) {
            session.connection.send(serialize(commandAck(
              message, "rejected", admission.code, admission.message,
              "collaboratorName" in admission ? admission.collaboratorName : undefined,
            )));
            return;
          }
          content = composeCollaboratorMentionNote(content, admission.collaborators);
        }
        const contextFiles = [
          ...message.payload.context_file_paths.map((filePath) => new ContextFile(filePath)),
          ...message.payload.image_urls.map((url) => new ContextFile(url, ContextFileType.IMAGE)),
        ];
        const result = await root.executeAgentCommand(target, {
          kind: "post_message",
          message: AgentInputUserMessage.fromDict({
            content,
            context_files: contextFiles.length ? contextFiles.map((file) => file.toDict()) : null,
            metadata: { input_origin: "user_message", message_id: message.payload.message_id, dedupe_key: message.payload.dedupe_key },
          }),
        });
        session.connection.send(serialize(commandAck(message, result.accepted ? "accepted" : "rejected",
          result.accepted ? null : result.code ?? "AGENT_ROOT_COMMAND_REJECTED", result.message ?? null)));
        return;
      }
      const result = await root.executeAgentCommand(target, message.type === "INTERRUPT_GENERATION"
        ? { kind: "interrupt" }
        : { kind: "approve_tool", invocationId: message.payload.invocation_id, approved: message.type === "APPROVE_TOOL", reason: message.payload.reason });
      session.connection.send(serialize(commandAck(message, result.accepted ? "accepted" : "rejected",
        result.accepted ? null : result.code ?? "AGENT_ROOT_COMMAND_REJECTED", result.message ?? null)));
    } catch (cause) {
      session.connection.send(serialize(commandAck(message, "failed", "AGENT_ROOT_COMMAND_FAILED", cause instanceof Error ? cause.message : String(cause))));
    }
  }

  disconnect(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.close();
    this.sessions.delete(sessionId);
  }
}
