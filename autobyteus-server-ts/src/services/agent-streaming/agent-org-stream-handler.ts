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
import { composeCollaboratorMentionNote } from "@autobyteus/agent-presentation-contracts";
import { toCollaboratorMentions } from "../../agent-collaboration/collaborators/collaborator-admission.js";
import { createRootExecutionStreamEgress, type RootExecutionStreamEgress } from "./websocket-egress/root-execution-stream-egress.js";
import { remoteTaskExecutionDtos } from "./remote-task-execution-dto-projection.js";

/** A command for one agent of the Org (every client command but Retry). */
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
    root_subject_kind: "agent_org",
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

/** Native AgentOrg stream. It does not reuse or reinterpret the Team envelope. */
export class AgentOrgStreamHandler {
  private readonly sessions = new Map<string, { egress: RootExecutionStreamEgress; orgRunId: string; close(): void }>();
  constructor(private readonly service: Pick<AgentOrgRunService, "getActive" | "recordRunActivity">) {}

  async connect(connection: WebSocketConnection, orgRunIdInput: string): Promise<string | null> {
    const orgRunId = orgRunIdInput.trim();
    // Every message to this socket leaves through its egress; an ERROR or ROOT_LIFECYCLE sent
    // before a close flushes pending content first.
    const egress = createRootExecutionStreamEgress(connection, `AgentOrg run '${orgRunId}'`);
    const run = orgRunId ? this.service.getActive(orgRunId) : null;
    if (!run) {
      egress.send(error("AGENT_ORG_NOT_ACTIVE", `AgentOrg run '${orgRunId}' is not active.`));
      egress.dispose();
      connection.close(4004);
      return null;
    }
    const sessionId = randomUUID();
    const remoteTaskExecutions = await remoteTaskExecutionDtos(run.getExecutionTreeSnapshot().rootOrg.remoteTaskExecutions);
    const barrier = await run.openPackageSnapshotConnection();
    try {
      egress.send(CollaborationStreamServerMessageSchema.parse({
        type: "CONNECTED",
        payload: { root_subject_kind: "agent_org", root_run_id: orgRunId, session_id: sessionId },
      }));
      egress.send(CollaborationStreamServerMessageSchema.parse({
        type: "ROOT_EXECUTION_VIEW_SNAPSHOT",
        payload: projectAgentOrgExecutionView(run, barrier.snapshot, barrier.baseChangeSequence, remoteTaskExecutions),
      }));
      const unsubscribe = barrier.subscribe((event) => {
        try {
          const projected = projectAgentOrgExecutionEvent(run, event);
          if (projected) egress.send(CollaborationStreamServerMessageSchema.parse({
            type: "ROOT_EXECUTION_EVENT",
            payload: projected,
          }));
        } catch (cause) {
          egress.send(error(
            "AGENT_ORG_STREAM_PROJECTION_FAILED",
            cause instanceof Error ? cause.message : String(cause),
          ));
          queueMicrotask(() => {
            this.disconnect(sessionId);
            connection.close(1011);
          });
          return;
        }
        if (event.event.kind === "lifecycle") {
          egress.send(CollaborationStreamServerMessageSchema.parse({
            type: "ROOT_LIFECYCLE",
            payload: { root_subject_kind: "agent_org", root_run_id: orgRunId, is_active: event.event.isActive },
          }));
          if (!event.event.isActive) queueMicrotask(() => {
            this.disconnect(sessionId);
            connection.close(1000);
          });
        }
      });
      egress.send(CollaborationStreamServerMessageSchema.parse({
        type: "ROOT_LIFECYCLE",
        payload: { root_subject_kind: "agent_org", root_run_id: orgRunId, is_active: true },
      }));
      // autobyteus-278: a viewer of the Org observes its remote children while connected.
      run.remoteChildren.viewerAttached();
      this.sessions.set(sessionId, { egress, orgRunId, close: () => { unsubscribe(); run.remoteChildren.viewerDetached(); egress.dispose(); } });
      return sessionId;
    } catch (cause) {
      barrier.close();
      egress.send(error("AGENT_ORG_STREAM_UNAVAILABLE", String(cause)));
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
      session.egress.send(error(
        "AGENT_ORG_COMMAND_INVALID",
        cause instanceof Error ? cause.message : String(cause),
      ));
      return;
    }
    if (parsed.type === "REFRESH_REMOTE_TASK_EXECUTIONS") {
      // Retry: the answers arrive as root events.
      if (parsed.payload.root_subject_kind === "agent_org" && parsed.payload.root_run_id === session.orgRunId) {
        void this.service.getActive(session.orgRunId)?.remoteChildren.refresh();
      }
      return;
    }
    const message: AgentCommand = parsed;
    try {
      if (message.payload.root_subject_kind !== "agent_org" || message.payload.root_run_id !== session.orgRunId) {
        throw new Error("AgentOrg command root correlation mismatch.");
      }
      const run = this.service.getActive(session.orgRunId);
      if (!run) throw new Error(`AgentOrg run '${session.orgRunId}' is not active.`);
      let content = message.type === "SEND_MESSAGE" ? message.payload.content : "";
      if (message.type === "SEND_MESSAGE" && message.payload.mentions?.length) {
        const admission = await run.resolveCollaboratorMentions({
          focusedAgentRunId: message.payload.target_agent_run_id,
          mentions: toCollaboratorMentions(message.payload.mentions),
        });
        if (!admission.admitted) {
          // Nothing was posted; the client keeps the draft and shows the notice.
          session.egress.send(commandAck(
            message, "rejected", admission.code, admission.message,
            "collaboratorName" in admission ? admission.collaboratorName : undefined,
          ));
          return;
        }
        content = composeCollaboratorMentionNote(content, admission.collaborators);
      }
      const command = message.type === "SEND_MESSAGE"
        ? (() => {
            const contextFiles = [
              ...message.payload.context_file_paths.map((filePath) => new ContextFile(filePath)),
              ...message.payload.image_urls.map((url) => new ContextFile(url, ContextFileType.IMAGE)),
            ];
            return {
              kind: "post_message" as const,
              message: AgentInputUserMessage.fromDict({
                content,
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
      if (message.type === "SEND_MESSAGE" && result.accepted && outcome.executionKind !== null
        && outcome.executionKind !== "task" && outcome.executionKind !== "task_team_member") {
        const historyCommit = this.service.recordRunActivity(run, { summary: message.payload.content });
        try {
          await historyCommit;
        } catch (cause) {
          console.error(`Accepted AgentOrg input history summary commit failed for '${session.orgRunId}':`, cause);
        }
      }
      session.egress.send(commandAck(
        message,
        result.accepted ? "accepted" : "rejected",
        result.accepted ? null : result.code ?? "AGENT_ORG_COMMAND_REJECTED",
        result.message ?? null,
      ));
    } catch (cause) {
      session.egress.send(commandAck(
        message,
        "failed",
        "AGENT_ORG_COMMAND_FAILED",
        cause instanceof Error ? cause.message : String(cause),
      ));
    }
  }

  disconnect(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.close();
    this.sessions.delete(sessionId);
  }
}
