import { DelegatedRunCommands } from "../../agent-collaboration/execution/delegation/delegated-run-commands.js";
import { findDelegationTree } from "../../agent-collaboration/delegation/delegation-tree-binding.js";
import { getProcessStandaloneRunCommandPort } from "../../agent-execution/services/standalone-run-ports.js";
import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import { getTeamRunService } from "../../agent-team-execution/services/team-run-service.js";
import { createAgentOrgRootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { randomUUID } from "node:crypto";
import {
  CollaborationStreamClientMessageSchema,
  CollaborationStreamServerMessageSchema,
  type CollaborationStreamClientMessage,
  type CollaborationStreamServerMessage,
} from "@autobyteus/collaboration-stream-contracts";
import { AgentInputUserMessage, ContextFile, ContextFileType } from "autobyteus-ts";
import type { AgentOrgRunService } from "../../agent-org-execution/services/agent-org-run-service.js";
import type { WebSocketConnection } from "./agent-team-stream-handler.js";
import { composeCollaboratorMentionNote } from "@autobyteus/agent-presentation-contracts";
import { toCollaboratorMentions } from "../../agent-collaboration/collaborators/collaborator-admission.js";
import { createRootExecutionStreamEgress, type RootExecutionStreamEgress } from "./websocket-egress/root-execution-stream-egress.js";
import { OrgRunNotFoundError, OrgViewSession, type OrgViewSources } from "./org-view-session.js";

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

/**
 * Native AgentOrg stream `/ws/agent-org/:orgRunId` (autobyteus-461 DS-8, SR-046): one view session per connection
 * (`OrgViewSession`), active or stopped, which never restores the run to serve the view. A command to a child row goes
 * to the child's own run; a message to one of the Org's own agents restores a stopped Org through its service, on that
 * first input; an interrupt or tool approval for an agent of a stopped Org is refused.
 */
export class AgentOrgStreamHandler {
  private readonly sessions = new Map<string, { egress: RootExecutionStreamEgress; view: OrgViewSession }>();
  constructor(
    private readonly service: Pick<AgentOrgRunService, "getActive" | "restore" | "recordRunActivity">,
    private readonly sources: OrgViewSources,
    private readonly children: DelegatedRunCommands = new DelegatedRunCommands({
      tree: findDelegationTree, standaloneRuns: getProcessStandaloneRunCommandPort,
      activeAgentRun: (agentRunId) => AgentRunManager.getInstance().getActiveRun(agentRunId),
      teamRun: (teamRunId, restore) => restore ? getTeamRunService().resolveManagedTeamRun(teamRunId) : Promise.resolve(getTeamRunService().getActiveTeamRun(teamRunId)),
    }),
  ) {}

  async connect(connection: WebSocketConnection, orgRunIdInput: string): Promise<string | null> {
    const orgRunId = orgRunIdInput.trim();
    // Every message to this socket leaves through its egress; an ERROR sent before a close flushes pending content first.
    const egress = createRootExecutionStreamEgress(connection, `AgentOrg run '${orgRunId}'`);
    const sessionId = randomUUID();
    const view = new OrgViewSession(orgRunId, (message) => egress.send(message),
      { ...this.sources, activeOrgRun: (id) => this.service.getActive(id) });
    egress.send(CollaborationStreamServerMessageSchema.parse({
      type: "CONNECTED", payload: { root_subject_kind: "agent_org", root_run_id: orgRunId, session_id: sessionId },
    }));
    try {
      await view.open();
    } catch (cause) {
      view.close();
      const notFound = cause instanceof OrgRunNotFoundError;
      egress.send(error(notFound ? "AGENT_ORG_NOT_FOUND" : "AGENT_ORG_STREAM_UNAVAILABLE", cause instanceof Error ? cause.message : String(cause)));
      egress.dispose();
      connection.close(notFound ? 4004 : 1011);
      return null;
    }
    this.sessions.set(sessionId, { egress, view });
    return sessionId;
  }

  async handleMessage(sessionId: string, raw: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    // A message to an agent of a stopped Org restores it: the view's switch to live waits for the message.
    await (this.service.getActive(session.view.orgRunId) ? this.handle(session, raw) : session.view.whileRestoring(() => this.handle(session, raw)));
  }

  private async handle(session: { egress: RootExecutionStreamEgress; view: OrgViewSession }, raw: string): Promise<void> {
    const orgRunId = session.view.orgRunId;
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
      if (parsed.payload.root_subject_kind === "agent_org" && parsed.payload.root_run_id === orgRunId) {
        void this.service.getActive(orgRunId)?.remoteChildren.refresh();
      }
      return;
    }
    const message: AgentCommand = parsed;
    try {
      if (message.payload.root_subject_kind !== "agent_org" || message.payload.root_run_id !== orgRunId) {
        throw new Error("AgentOrg command root correlation mismatch.");
      }
      const target = message.payload.target_agent_run_id;
      const identity = createAgentOrgRootExecutionIdentity(orgRunId);
      const isChild = await this.children.isChildAgent(identity, target);
      let run = this.service.getActive(orgRunId);
      if (!run && !isChild) {
        if (message.type !== "SEND_MESSAGE") {
          session.egress.send(commandAck(message, "rejected", "AGENT_ORG_STOPPED", `AgentOrg run '${orgRunId}' is stopped. A message to one of its agents starts it.`));
          return;
        }
        // A message to one of the Org's own agents starts the stopped Org, on that first input (SR-046).
        run = await this.service.restore(orgRunId);
      }
      if (!run && message.type === "SEND_MESSAGE" && message.payload.mentions?.length) {
        session.egress.send(commandAck(message, "rejected", "AGENT_ORG_STOPPED", "Start the Org to mention collaborators in a message to a run it delegated to."));
        return;
      }
      let content = message.type === "SEND_MESSAGE" ? message.payload.content : "";
      if (message.type === "SEND_MESSAGE" && message.payload.mentions?.length) {
        const admission = await run!.resolveCollaboratorMentions({
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
      // AR-011: a child row's command goes to the child's own run (not this org's activity).
      const child = isChild ? await this.children.execute(identity, target, command) : null;
      const own = run!;
      const outcome = child ? Object.freeze({ result: child, executionKind: null })
        : message.type === "SEND_MESSAGE"
        ? await own.executeAgentCommandWithExecutionKind(target, command)
        : Object.freeze({ result: await own.executeAgentCommand(target, command), executionKind: null });
      const result = outcome.result;
      if (message.type === "SEND_MESSAGE" && result.accepted && outcome.executionKind !== null) {
        const historyCommit = this.service.recordRunActivity(run!, { summary: message.payload.content });
        try {
          await historyCommit;
        } catch (cause) {
          console.error(`Accepted AgentOrg input history summary commit failed for '${orgRunId}':`, cause);
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
    session.view.close();
    session.egress.dispose();
    this.sessions.delete(sessionId);
  }
}
