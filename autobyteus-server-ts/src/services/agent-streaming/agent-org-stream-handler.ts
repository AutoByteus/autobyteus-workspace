import { randomUUID } from "node:crypto";
import {
  CollaborationStreamClientMessageSchema,
  CollaborationStreamServerMessageSchema,
  type CollaborationStreamClientMessage,
  type CollaborationStreamServerMessage,
} from "@autobyteus/collaboration-stream-contracts";
import { AgentInputUserMessage, ContextFile, ContextFileType } from "autobyteus-ts";
import type { AgentOrgRunService } from "../../agent-org-execution/services/agent-org-run-service.js";
import { projectAgentOrgExecutionEvent, projectAgentOrgExecutionView } from "./agent-org-execution-view-projector.js";
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
): CollaborationStreamServerMessage => CollaborationStreamServerMessageSchema.parse({
  type: "AGENT_COMMAND_ACK",
  payload: {
    root_subject_kind: "agent_org",
    root_run_id: message.payload.root_run_id,
    command_id: message.payload.command_id,
    command_type: message.type,
    target_agent_run_id: message.payload.target_agent_run_id,
    state,
    code,
    message: detail,
  },
});

/** Native AgentOrg stream. It does not reuse or reinterpret the Team envelope. */
export class AgentOrgStreamHandler {
  private readonly sessions = new Map<string, { connection: WebSocketConnection; orgRunId: string; close(): void }>();
  constructor(private readonly service: Pick<AgentOrgRunService, "getActive" | "recordRunActivity">) {}

  async connect(connection: WebSocketConnection, orgRunIdInput: string): Promise<string | null> {
    const orgRunId = orgRunIdInput.trim();
    const run = orgRunId ? this.service.getActive(orgRunId) : null;
    if (!run) {
      connection.send(serialize(error("AGENT_ORG_NOT_ACTIVE", `AgentOrg run '${orgRunId}' is not active.`)));
      connection.close(4004);
      return null;
    }
    const sessionId = randomUUID();
    const barrier = await run.openPackageSnapshotConnection();
    try {
      connection.send(serialize(CollaborationStreamServerMessageSchema.parse({
        type: "CONNECTED",
        payload: { root_subject_kind: "agent_org", root_run_id: orgRunId, session_id: sessionId },
      })));
      connection.send(serialize(CollaborationStreamServerMessageSchema.parse({
        type: "ROOT_EXECUTION_VIEW_SNAPSHOT",
        payload: projectAgentOrgExecutionView(run, barrier.snapshot, barrier.baseChangeSequence),
      })));
      const unsubscribe = barrier.subscribe((event) => {
        try {
          const projected = projectAgentOrgExecutionEvent(run, event);
          if (projected) connection.send(serialize(CollaborationStreamServerMessageSchema.parse({
            type: "ROOT_EXECUTION_EVENT",
            payload: projected,
          })));
        } catch (cause) {
          connection.send(serialize(error(
            "AGENT_ORG_STREAM_PROJECTION_FAILED",
            cause instanceof Error ? cause.message : String(cause),
          )));
          queueMicrotask(() => {
            this.disconnect(sessionId);
            connection.close(1011);
          });
          return;
        }
        if (event.event.kind === "lifecycle") {
          connection.send(serialize(CollaborationStreamServerMessageSchema.parse({
            type: "ROOT_LIFECYCLE",
            payload: { root_subject_kind: "agent_org", root_run_id: orgRunId, is_active: event.event.isActive },
          })));
          if (!event.event.isActive) queueMicrotask(() => {
            this.disconnect(sessionId);
            connection.close(1000);
          });
        }
      });
      connection.send(serialize(CollaborationStreamServerMessageSchema.parse({
        type: "ROOT_LIFECYCLE",
        payload: { root_subject_kind: "agent_org", root_run_id: orgRunId, is_active: true },
      })));
      this.sessions.set(sessionId, { connection, orgRunId, close: unsubscribe });
      return sessionId;
    } catch (cause) {
      barrier.close();
      connection.send(serialize(error("AGENT_ORG_STREAM_UNAVAILABLE", String(cause))));
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
      session.connection.send(serialize(error(
        "AGENT_ORG_COMMAND_INVALID",
        cause instanceof Error ? cause.message : String(cause),
      )));
      return;
    }
    try {
      if (message.payload.root_run_id !== session.orgRunId) throw new Error("AgentOrg command root correlation mismatch.");
      const run = this.service.getActive(session.orgRunId);
      if (!run) throw new Error(`AgentOrg run '${session.orgRunId}' is not active.`);
      const command = message.type === "SEND_MESSAGE"
        ? (() => {
            const contextFiles = [
              ...message.payload.context_file_paths.map((filePath) => new ContextFile(filePath)),
              ...message.payload.image_urls.map((url) => new ContextFile(url, ContextFileType.IMAGE)),
            ];
            return {
              kind: "post_message" as const,
              message: AgentInputUserMessage.fromDict({
                content: message.payload.content,
                context_files: contextFiles.length ? contextFiles.map((file) => file.toDict()) : null,
                metadata: {
                  input_origin: "user_message",
                  message_id: message.payload.message_id,
                  dedupe_key: message.payload.dedupe_key,
                },
              }),
            };
          })()
        : message.type === "INTERRUPT_GENERATION"
          ? { kind: "interrupt" as const }
          : {
              kind: "approve_tool" as const,
              invocationId: message.payload.invocation_id,
              approved: message.type === "APPROVE_TOOL",
              reason: message.payload.reason,
            };
      const outcome = message.type === "SEND_MESSAGE"
        ? await run.executeAgentCommandWithExecutionKind(message.payload.target_agent_run_id, command)
        : Object.freeze({
            result: await run.executeAgentCommand(message.payload.target_agent_run_id, command),
            executionKind: null,
          });
      const result = outcome.result;
      if (message.type === "SEND_MESSAGE" && result.accepted && outcome.executionKind === "configured") {
        const historyCommit = this.service.recordRunActivity(run, { summary: message.payload.content });
        try {
          await historyCommit;
        } catch (cause) {
          console.error(`Accepted AgentOrg input history summary commit failed for '${session.orgRunId}':`, cause);
        }
      }
      session.connection.send(serialize(commandAck(
        message,
        result.accepted ? "accepted" : "rejected",
        result.accepted ? null : result.code ?? "AGENT_ORG_COMMAND_REJECTED",
        result.message ?? null,
      )));
    } catch (cause) {
      session.connection.send(serialize(commandAck(
        message,
        "failed",
        "AGENT_ORG_COMMAND_FAILED",
        cause instanceof Error ? cause.message : String(cause),
      )));
    }
  }

  disconnect(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.close();
    this.sessions.delete(sessionId);
  }
}
