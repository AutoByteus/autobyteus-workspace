import { executePeerCommand, PEER_MENTIONS_REFUSAL } from "../../agent-collaboration/execution/remote/peer-runs.js";
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
import type { TeamRunService } from "../../agent-team-execution/services/team-run-service.js";
import { AgentSession } from "./agent-session.js";
import { AgentSessionManager } from "./agent-session-manager.js";
import { parseCommandAgentRunId, TEAM_COMMAND_INVALID_TARGET_CODE, TEAM_COMMAND_INVALID_TARGET_MESSAGE } from "./team-agent-run-command-parser.js";
import { handleTeamInterruptGenerationCommand } from "./team-interrupt-generation-command-handler.js";
import { handleTeamToolApprovalCommand } from "./team-tool-approval-command-handler.js";
import { NOTHING_TO_INTERRUPT } from "./user-interrupt-outcome.js";
import { AgentStreamWebSocketEgress, type AgentStreamServerMessageSink } from "./websocket-egress/agent-stream-websocket-egress.js";
import { createSequencedStreamEgressControlComposition } from "./websocket-egress/agent-stream-egress-control-composition.js";
import { teamStreamSequencedShape } from "./websocket-egress/team-stream-sequenced-shape.js";
import { composeCollaboratorMentionNote } from "@autobyteus/agent-presentation-contracts";
import { toCollaboratorMentions } from "../../agent-collaboration/collaborators/collaborator-admission.js";
import { TeamRunNotFoundError, TeamRunNotRestorableError, TeamViewSession, type TeamViewSources } from "./team-view-session.js";

export type WebSocketConnection = { send(data: string): void; close(code?: number): void };
type TeamStreamSink = AgentStreamServerMessageSink<TeamStreamServerMessage>;
type TeamStreamEgress = AgentStreamWebSocketEgress<TeamStreamServerMessage>;
type MemberCommands = Pick<RootTeamRun, "executeAgentCommand">;

export class AgentTeamSession extends AgentSession { get teamRunId(): string { return this.runId; } }

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
    // A stream's own error is a conversation row: it carries the node's time (autobyteus-628 D-3).
    occurred_at: new Date().toISOString(),
  } });

const TEAM_SEND_MESSAGE_REJECTED = "TEAM_SEND_MESSAGE_REJECTED";

/** A member's post: its result, and, when a mention was refused, the collaborator the notice names. */
type MemberPostResult = AgentOperationResult & Readonly<{ collaboratorName?: string }>;

/** A user's message as a run's input: its content (with its mention note, when composed), files and identity. */
const userMessage = (payload: Extract<TeamStreamClientMessage, { type: "SEND_MESSAGE" }>["payload"], content: string): AgentInputUserMessage => {
  const contextFiles = [
    ...payload.context_file_paths.map((filePath) => new ContextFile(filePath)),
    ...payload.image_urls.map((url) => new ContextFile(url, ContextFileType.IMAGE)),
  ];
  return AgentInputUserMessage.fromDict({
    content,
    context_files: contextFiles.length ? contextFiles.map((file) => file.toDict()) : null,
    metadata: { input_origin: "user_message", message_id: payload.message_id, dedupe_key: payload.dedupe_key },
  });
};
const TEAM_SEND_MESSAGE_FAILED = "TEAM_SEND_MESSAGE_FAILED";

/**
 * The team run stream `/ws/agent-team/:teamRunId` (autobyteus-461 DS-8, SR-046, SR-061): one view session per connection
 * (`TeamViewSession`), active or stopped, which never restores the run to serve the view. Commands are for the team's
 * own agents (a peer run's through the root, autobyteus-278); a delegated run is reached by its own stream (rule 2). A
 * message to one of the team's own members restores a stopped team through its service, on that first input; an
 * interrupt or tool approval for a member of a stopped team is refused.
 */
export class AgentTeamStreamHandler {
  private readonly sessions = new Map<string, Readonly<{ view: TeamViewSession; egress: TeamStreamEgress }>>();

  constructor(
    private readonly sessionManager: AgentSessionManager,
    private readonly teamRunService: Pick<TeamRunService, "getActiveTeamRun" | "restoreForInput" | "restoreRefusal" | "recordRunActivity">,
    private readonly sources: Omit<TeamViewSources, "activeTeamRun" | "restoreRefusal">,
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
    const view = new TeamViewSession(teamRunId, egress, { ...this.sources, activeTeamRun: (id) => this.teamRunService.getActiveTeamRun(id),
      restoreRefusal: (id) => this.teamRunService.restoreRefusal(id) });
    this.sessions.set(sessionId, { view, egress });
    try {
      // `CONNECTED` right before the first snapshot, after every read (CR-461-101): connect then resolves at once, so a
      // command the client sends on `CONNECTED` finds the session.
      await view.open(() => egress.send(parseTeamStreamServerMessage({ type: "CONNECTED", payload: { session_id: sessionId, root_team_run_id: teamRunId } })));
    } catch (error) {
      egress.send(error instanceof TeamRunNotFoundError ? errorMessage("TEAM_NOT_FOUND", error.message)
        : error instanceof TeamRunNotRestorableError ? errorMessage(error.refusal.code, error.refusal.message)
        : errorMessage("TEAM_STREAM_UNAVAILABLE", String(error)));
      this.cleanupSession(sessionId);
      connection.close(error instanceof TeamRunNotFoundError || error instanceof TeamRunNotRestorableError ? 4004 : 1011);
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
        // A command to one of the team's agents (a peer run's through the root); a delegated run is reached by its own
        // stream (SR-061 rule 2).
        const routed: MemberCommands = { executeAgentCommand: (agentRunId, command) => this.memberCommand(session.view, agentRunId, command) };
        if (message.type === "SEND_MESSAGE") {
          await this.handleSendMessage(session.view, message.payload, session.egress);
        } else if (message.type === "INTERRUPT_GENERATION") {
          await handleTeamInterruptGenerationCommand({ payload: message.payload, sink: session.egress, activeRun: routed });
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
    // A peer row's command goes to its handle (SR-066), never through the team.
    const peer = this.sources.rows.peerRunOf(agentRunId);
    if (peer) return executePeerCommand(peer, agentRunId, command);
    // DS-15 (SR-070): a delegated team run whose Task is closed takes no input; refused before it is restored or shown.
    const refusal = command.kind === "interrupt" ? null : await this.sources.closedTasks.refusal(createTeamRootExecutionIdentity(teamRunId));
    if (refusal) return refusal;
    const live = this.teamRunService.getActiveTeamRun(teamRunId);
    // A Stop to a member of a stopped team finds nothing to stop (autobyteus-533 REQ-001); an approval is refused.
    if (!live && command.kind === "interrupt") return NOTHING_TO_INTERRUPT;
    if (!live && command.kind !== "post_message") {
      return { accepted: false, code: "TEAM_RUN_STOPPED", message: `Team run '${teamRunId}' is stopped. A message to one of its members starts it.` };
    }
    // The first input restores it: base's admission answers first, with its own reason (SR-078, CR-461-069).
    const run = live ?? await this.teamRunService.restoreForInput(teamRunId);
    if ("accepted" in run) return run;
    if (command.kind === "post_message") await view.showCurrentMode();
    return run.executeAgentCommand(agentRunId, command);
  }

  /**
   * A user's message to one of the team's own agents: the team's root resolves its mentions, restoring a stopped team
   * (the message is its first input), then posts.
   */
  private async handleSendMessage(
    view: TeamViewSession,
    payload: Extract<TeamStreamClientMessage, { type: "SEND_MESSAGE" }>["payload"],
    sink: TeamStreamSink,
  ): Promise<void> {
    const teamRunId = view.teamRunId;
    const agentRunId = parseCommandAgentRunId(payload);
    if (!agentRunId) return this.sendInvalidTarget(sink, TEAM_COMMAND_INVALID_TARGET_MESSAGE);
    const mentions = toCollaboratorMentions(payload.mentions);
    let result: MemberPostResult;
    try {
      result = await this.postToMember(view, agentRunId, payload, mentions);
    } catch (error) {
      sink.send(errorMessage(TEAM_SEND_MESSAGE_FAILED, error instanceof Error ? error.message : String(error), agentRunId));
      return;
    }
    if (!result.accepted) {
      // Nothing was posted; the client keeps the draft and shows the notice.
      if (result.collaboratorName) {
        sink.send(errorMessage(result.code ?? TEAM_SEND_MESSAGE_REJECTED, result.message ?? "", agentRunId, undefined, result.collaboratorName));
      } else if (result.code?.includes("TARGET") || result.code === "RUN_NOT_FOUND") {
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

  /** A message to one of the team's own members: its mentions resolved by the team's root, then posted. */
  private async postToMember(
    view: TeamViewSession,
    agentRunId: string,
    payload: Extract<TeamStreamClientMessage, { type: "SEND_MESSAGE" }>["payload"],
    mentions: ReturnType<typeof toCollaboratorMentions>,
  ): Promise<MemberPostResult> {
    // A peer row's message goes to its handle (SR-066): the team stays as it is.
    const peer = this.sources.rows.peerRunOf(agentRunId);
    if (peer) return mentions.length ? PEER_MENTIONS_REFUSAL : executePeerCommand(peer, agentRunId, { kind: "post_message", message: userMessage(payload, payload.content) });
    // DS-15: refused before its mentions restore the run; a stopped delegated run that cannot be restored is refused with
    // base's text (CR-461-070), sent as TEAM_SEND_MESSAGE_REJECTED.
    // A stopped run is then asked base's restore admission (SR-078), with its own reason codes.
    const identity = createTeamRootExecutionIdentity(view.teamRunId);
    const stopped = !this.teamRunService.getActiveTeamRun(view.teamRunId);
    const refusal = await this.sources.closedTasks.refusal(identity)
      ?? (stopped ? await this.teamRunService.restoreRefusal(view.teamRunId) ?? await this.sources.restorability.refusal(identity) : null);
    if (refusal) return refusal;
    let content = payload.content;
    if (mentions.length) {
      const root = this.teamRunService.getActiveTeamRun(view.teamRunId) ?? await this.teamRunService.restoreForInput(view.teamRunId);
      if ("accepted" in root) return root;
      const admission = await root.resolveCollaboratorMentions({ focusedAgentRunId: agentRunId, mentions });
      if (!admission.admitted) {
        return { accepted: false, code: admission.code, message: admission.message,
          ...("collaboratorName" in admission && admission.collaboratorName ? { collaboratorName: admission.collaboratorName } : {}) };
      }
      content = composeCollaboratorMentionNote(payload.content, admission.collaborators);
    }
    return this.memberCommand(view, agentRunId, { kind: "post_message", message: userMessage(payload, content) });
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
