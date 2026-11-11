import { DelegatedRunCommands } from "../../agent-collaboration/execution/delegation/delegated-run-commands.js";
import { findDelegationTree } from "../../agent-collaboration/delegation/delegation-tree-binding.js";
import { getProcessStandaloneRunCommandPort } from "../../agent-execution/services/standalone-run-ports.js";
import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import { createTeamRootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { TeamMemberExecutionCommand } from "../../agent-team-execution/domain/team-member-execution-command.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import { randomUUID } from "node:crypto";
import {
  parseTeamStreamClientMessage,
  parseTeamStreamServerMessage,
  serializeTeamStreamServerMessage,
  type TeamStreamClientMessage,
  type TeamStreamServerMessage,
} from "@autobyteus/team-stream-contracts";
import { AgentInputUserMessage, ContextFile, ContextFileType } from "autobyteus-ts";
import type { RootTeamRun } from "../../agent-team-execution/domain/root-team-run.js";
import { getTeamRunService, type TeamRunService } from "../../agent-team-execution/services/team-run-service.js";
import { AgentSession } from "./agent-session.js";
import { AgentSessionManager } from "./agent-session-manager.js";
import { parseCommandAgentRunId, TEAM_COMMAND_INVALID_TARGET_CODE, TEAM_COMMAND_INVALID_TARGET_MESSAGE } from "./team-agent-run-command-parser.js";
import { handleTeamInterruptGenerationCommand } from "./team-interrupt-generation-command-handler.js";
import { handleTeamToolApprovalCommand } from "./team-tool-approval-command-handler.js";
import { AgentStreamWebSocketEgress, type AgentStreamServerMessageSink } from "./websocket-egress/agent-stream-websocket-egress.js";
import { createSequencedStreamEgressControlComposition } from "./websocket-egress/agent-stream-egress-control-composition.js";
import { teamStreamSequencedShape } from "./websocket-egress/team-stream-sequenced-shape.js";
import { composeCollaboratorMentionNote } from "@autobyteus/agent-presentation-contracts";
import { toCollaboratorMentions } from "../../agent-collaboration/collaborators/collaborator-admission.js";
import { TeamRunNotFoundError, TeamViewSession, type TeamViewSources } from "./team-view-session.js";

export type WebSocketConnection = { send(data: string): void; close(code?: number): void };
type TeamStreamSink = AgentStreamServerMessageSink<TeamStreamServerMessage>;
type TeamStreamEgress = AgentStreamWebSocketEgress<TeamStreamServerMessage>;
type MemberCommands = Pick<RootTeamRun, "executeAgentCommand">;

class AgentTeamSession extends AgentSession { get teamRunId(): string { return this.runId; } }

const errorMessage = (
  code: string,
  message: string,
  agentRunId: string | null = null,
  details?: string,
  collaboratorName?: string,
): TeamStreamServerMessage =>
  parseTeamStreamServerMessage({ type: "ERROR", payload: {
    code, message, ...(details ? { details } : {}), change_sequence: null, agent_run_id: agentRunId,
    error_scope: null, error_effect: null, turn_id: null,
    ...(collaboratorName ? { collaborator_name: collaboratorName } : {}),
  } });

const TEAM_SEND_MESSAGE_REJECTED = "TEAM_SEND_MESSAGE_REJECTED";
const TEAM_SEND_MESSAGE_FAILED = "TEAM_SEND_MESSAGE_FAILED";

/**
 * The team run stream `/ws/agent-team/:teamRunId` (autobyteus-461 DS-8, SR-046): one view session per connection
 * (`TeamViewSession`), active or stopped, which never restores the run to serve the view. A command to a child row goes
 * to the child's own run (`DelegatedRunCommands`); a message to one of the team's own members restores a stopped team
 * through its service, on that first input; an interrupt or tool approval for a member of a stopped team is refused.
 */
export class AgentTeamStreamHandler {
  private readonly sessions = new Map<string, Readonly<{ view: TeamViewSession; egress: TeamStreamEgress }>>();

  constructor(
    private readonly sessionManager: AgentSessionManager,
    private readonly teamRunService: Pick<TeamRunService, "getActiveTeamRun" | "resolveManagedTeamRun" | "recordRunActivity">,
    private readonly sources: Omit<TeamViewSources, "activeTeamRun">,
    private readonly children: DelegatedRunCommands = new DelegatedRunCommands({
      tree: findDelegationTree, standaloneRuns: getProcessStandaloneRunCommandPort,
      activeAgentRun: (agentRunId) => AgentRunManager.getInstance().getActiveRun(agentRunId),
      teamRun: (teamRunId, restore) => restore ? getTeamRunService().resolveManagedTeamRun(teamRunId) : Promise.resolve(getTeamRunService().getActiveTeamRun(teamRunId)),
    }),
  ) {}

  async connect(connection: WebSocketConnection, teamRunIdInput: string): Promise<string | null> {
    const teamRunId = teamRunIdInput.trim();
    const sessionId = randomUUID();
    try {
      this.sessionManager.createSession(sessionId, teamRunId).connect();
    } catch (error) {
      connection.send(serializeTeamStreamServerMessage(errorMessage("SESSION_ERROR", String(error))));
      connection.close(1011);
      return null;
    }
    const egress = new AgentStreamWebSocketEgress<TeamStreamServerMessage>({
      sendRaw: (payload) => connection.send(payload),
      serialize: (message) => serializeTeamStreamServerMessage(parseTeamStreamServerMessage(message)),
      createControls: (options) => createSequencedStreamEgressControlComposition(teamStreamSequencedShape, options),
      onSendError: (error) => console.error(`Team WebSocket egress failed: session=${sessionId}, run=${teamRunId}: ${String(error)}`),
    });
    const view = new TeamViewSession(teamRunId, egress, { ...this.sources, activeTeamRun: (id) => this.teamRunService.getActiveTeamRun(id) });
    this.sessions.set(sessionId, { view, egress });
    egress.send(parseTeamStreamServerMessage({ type: "CONNECTED", payload: { session_id: sessionId, root_team_run_id: teamRunId } }));
    try {
      await view.showCurrentMode();
    } catch (error) {
      egress.send(error instanceof TeamRunNotFoundError ? errorMessage("TEAM_NOT_FOUND", error.message) : errorMessage("TEAM_STREAM_UNAVAILABLE", String(error)));
      this.cleanupSession(sessionId);
      connection.close(error instanceof TeamRunNotFoundError ? 4004 : 1011);
      return null;
    }
    console.info(`Agent Team WebSocket connected: session=${sessionId}, run=${teamRunId}`);
    return sessionId;
  }

  async handleMessage(sessionId: string, raw: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    {
      try {
        const message = AgentTeamStreamHandler.parseMessage(raw);
        const teamRunId = session.view.teamRunId;
        if (message.type === "REFRESH_REMOTE_TASK_EXECUTIONS") {
          // Retry (autobyteus-278): the answers arrive as messages on this stream.
          await this.teamRunService.getActiveTeamRun(teamRunId)?.remoteChildren.refresh();
          return;
        }
        const routed: MemberCommands = { executeAgentCommand: async (agentRunId, command) =>
          await this.children.execute(createTeamRootExecutionIdentity(teamRunId), agentRunId, command) ?? this.memberCommand(session.view, agentRunId, command) };
        if (message.type === "SEND_MESSAGE") {
          await this.handleSendMessage(teamRunId, message.payload, session.egress, routed);
        } else if (message.type === "INTERRUPT_GENERATION") {
          await handleTeamInterruptGenerationCommand({ teamRunId, payload: message.payload, sink: session.egress, activeRun: routed });
        } else {
          await handleTeamToolApprovalCommand({
            teamRunId, payload: message.payload, approved: message.type === "APPROVE_TOOL", sink: session.egress, activeRun: routed,
          });
        }
      } catch (error) {
        console.error(`Error handling team message for ${sessionId}: ${String(error)}`);
      }
    }
  }

  async disconnect(sessionId: string): Promise<void> {
    this.cleanupSession(sessionId);
  }

  static parseMessage(raw: string): TeamStreamClientMessage { return parseTeamStreamClientMessage(raw); }

  /**
   * A command to one of the team's own members, on the live run. A message starts a stopped run (its first input): the
   * run is restored, then the view is brought live (its in-band snapshot sent and the live run followed), then the message
   * is posted, so its echo reaches the view as an ordinary live event (SR-048).
   */
  private async memberCommand(view: TeamViewSession, agentRunId: string, command: TeamMemberExecutionCommand): Promise<AgentOperationResult> {
    const teamRunId = view.teamRunId;
    const live = this.teamRunService.getActiveTeamRun(teamRunId);
    if (!live && command.kind !== "post_message") {
      return { accepted: false, code: "TEAM_RUN_STOPPED", message: `Team run '${teamRunId}' is stopped. A message to one of its members starts it.` };
    }
    const run = live ?? await this.teamRunService.resolveManagedTeamRun(teamRunId);
    if (!run) return { accepted: false, code: "RUN_NOT_FOUND", message: `Team run '${teamRunId}' was not found.` };
    if (command.kind === "post_message") await view.showCurrentMode();
    return run.executeAgentCommand(agentRunId, command);
  }

  /** The team's live root for a member message's mentions; a stopped team is restored by that message, never for a child. */
  private async rootForMentions(teamRunId: string, agentRunId: string): Promise<RootTeamRun | null> {
    const live = this.teamRunService.getActiveTeamRun(teamRunId);
    if (live) return live;
    if (await this.children.isChildAgent(createTeamRootExecutionIdentity(teamRunId), agentRunId)) return null;
    return this.teamRunService.resolveManagedTeamRun(teamRunId);
  }

  private async handleSendMessage(
    teamRunId: string,
    payload: Extract<TeamStreamClientMessage, { type: "SEND_MESSAGE" }>["payload"],
    sink: TeamStreamSink,
    routed: MemberCommands,
  ): Promise<void> {
    const agentRunId = parseCommandAgentRunId(payload);
    if (!agentRunId) return this.sendInvalidTarget(sink, TEAM_COMMAND_INVALID_TARGET_MESSAGE);
    let content = payload.content;
    if (payload.mentions?.length) {
      try {
        const root = await this.rootForMentions(teamRunId, agentRunId);
        if (!root) {
          sink.send(errorMessage(TEAM_SEND_MESSAGE_REJECTED, "Start the team to mention collaborators in a message to a run it delegated to.", agentRunId));
          return;
        }
        const admission = await root.resolveCollaboratorMentions({
          focusedAgentRunId: agentRunId,
          mentions: toCollaboratorMentions(payload.mentions),
        });
        if (!admission.admitted) {
          // Nothing was posted; the client keeps the draft and shows the notice.
          sink.send("collaboratorName" in admission
            ? errorMessage(admission.code, admission.message, agentRunId, undefined, admission.collaboratorName)
            : errorMessage(TEAM_SEND_MESSAGE_REJECTED, admission.message, agentRunId, admission.code));
          return;
        }
        content = composeCollaboratorMentionNote(payload.content, admission.collaborators);
      } catch (error) {
        sink.send(errorMessage(TEAM_SEND_MESSAGE_FAILED, error instanceof Error ? error.message : String(error), agentRunId));
        return;
      }
    }
    const contextFiles = [
      ...payload.context_file_paths.map((filePath) => new ContextFile(filePath)),
      ...payload.image_urls.map((url) => new ContextFile(url, ContextFileType.IMAGE)),
    ];
    const message = AgentInputUserMessage.fromDict({
      content,
      context_files: contextFiles.length ? contextFiles.map((file) => file.toDict()) : null,
      metadata: { input_origin: "user_message", message_id: payload.message_id, dedupe_key: payload.dedupe_key },
    });
    let result;
    try {
      result = await routed.executeAgentCommand(agentRunId, { kind: "post_message", message });
    } catch (error) {
      sink.send(errorMessage(TEAM_SEND_MESSAGE_FAILED, error instanceof Error ? error.message : String(error), agentRunId));
      return;
    }
    if (!result.accepted) {
      if (result.code?.includes("TARGET") || result.code === "RUN_NOT_FOUND") {
        this.sendInvalidTarget(sink, result.message ?? TEAM_COMMAND_INVALID_TARGET_MESSAGE, agentRunId);
      } else {
        sink.send(errorMessage(
          TEAM_SEND_MESSAGE_REJECTED,
          result.message?.trim() || "The Team AgentRun did not accept the message.",
          agentRunId,
          result.code?.trim() || undefined,
        ));
      }
      return;
    }
    const root = this.teamRunService.getActiveTeamRun(teamRunId);
    if (root) await this.teamRunService.recordRunActivity(root, { summary: payload.content });
  }

  private sendInvalidTarget(sink: TeamStreamSink, message: string, agentRunId: string | null = null): void {
    sink.send(errorMessage(TEAM_COMMAND_INVALID_TARGET_CODE, message, agentRunId));
  }

  private cleanupSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    this.sessions.delete(sessionId);
    session?.view.close();
    session?.egress.dispose();
    this.sessionManager.closeSession(sessionId);
  }
}

/** A team stream handler on the process's team runs (the websocket route's default; tests pass their own). */
export const createAgentTeamStreamHandler = (sources: Omit<TeamViewSources, "activeTeamRun">): AgentTeamStreamHandler =>
  new AgentTeamStreamHandler(new AgentSessionManager(AgentTeamSession), getTeamRunService(), sources);
