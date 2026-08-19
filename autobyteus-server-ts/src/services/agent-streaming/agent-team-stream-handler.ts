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
import type { SequencedRootEvent } from "../../agent-team-execution/services/team-run-event-publisher.js";
import type { TeamRunEvent } from "../../agent-team-execution/domain/team-run-event.js";
import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import { TeamRunService, getTeamRunService } from "../../agent-team-execution/services/team-run-service.js";
import { AgentSession } from "./agent-session.js";
import { AgentSessionManager } from "./agent-session-manager.js";
import { parseCommandAgentRunId, TEAM_COMMAND_INVALID_TARGET_CODE, TEAM_COMMAND_INVALID_TARGET_MESSAGE } from "./team-agent-run-command-parser.js";
import { projectSequencedTeamRunEvent, projectTeamExecutionViewSnapshot } from "./team-execution-view-projector.js";
import { handleTeamInterruptGenerationCommand } from "./team-interrupt-generation-command-handler.js";
import { TeamStreamBroadcaster, getTeamStreamBroadcaster } from "./team-stream-broadcaster.js";
import { handleTeamToolApprovalCommand } from "./team-tool-approval-command-handler.js";
import { AgentStreamWebSocketEgress, type AgentStreamServerMessageSink } from "./websocket-egress/agent-stream-websocket-egress.js";

export type WebSocketConnection = { send(data: string): void; close(code?: number): void };
type TeamStreamSink = AgentStreamServerMessageSink<TeamStreamServerMessage>;
type TeamStreamEgress = AgentStreamWebSocketEgress<TeamStreamServerMessage>;

class AgentTeamSession extends AgentSession { get teamRunId(): string { return this.runId; } }

const errorMessage = (code: string, message: string): TeamStreamServerMessage =>
  parseTeamStreamServerMessage({ type: "ERROR", payload: {
    code, message, change_sequence: null, agent_run_id: null,
    error_scope: null, error_effect: null, turn_id: null,
  } });

/** One strict root TeamRun stream session using the snapshot/change-sequence barrier. */
export class AgentTeamStreamHandler {
  private readonly activeTasks = new Map<string, Promise<void>>();
  private readonly eventUnsubscribers = new Map<string, () => void>();
  private readonly lifecycleUnsubscribers = new Map<string, () => void>();
  private readonly sessionConnections = new Map<string, WebSocketConnection>();
  private readonly sessionEgresses = new Map<string, TeamStreamEgress>();
  private readonly subscribedRunsBySessionId = new Map<string, RootTeamRun>();

  constructor(
    private readonly sessionManager: AgentSessionManager = new AgentSessionManager(AgentTeamSession),
    private readonly teamRunService: TeamRunService = getTeamRunService(),
    private readonly broadcaster: TeamStreamBroadcaster = getTeamStreamBroadcaster(),
    private readonly teamRunManager: Pick<AgentTeamRunManager, "getLifecycleSnapshot" | "subscribeToLifecycle"> = AgentTeamRunManager.getInstance(),
  ) {}

  async connect(connection: WebSocketConnection, teamRunId: string): Promise<string | null> {
    const root = await this.resolveTeamRun(teamRunId);
    if (!root) return this.closeWithTeamNotFound(connection, teamRunId);
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
      onSendError: (error) => console.error(`Team WebSocket egress failed: session=${sessionId}, run=${teamRunId}: ${String(error)}`),
    });
    this.sessionConnections.set(sessionId, connection);
    this.sessionEgresses.set(sessionId, egress);
    try {
      await this.bindSessionToTeamRun(sessionId, root, egress);
    } catch (error) {
      egress.send(errorMessage("TEAM_STREAM_UNAVAILABLE", String(error)));
      this.cleanupSession(sessionId);
      connection.close(1011);
      return null;
    }
    this.activeTasks.set(sessionId, Promise.resolve());
    this.broadcaster.registerConnection(sessionId, teamRunId, egress);
    console.info(`Agent Team WebSocket connected: session=${sessionId}, run=${teamRunId}`);
    return sessionId;
  }

  async handleMessage(sessionId: string, raw: string): Promise<void> {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) return;
    try {
      const message = AgentTeamStreamHandler.parseMessage(raw);
      const root = await this.resolveSessionTeamRun(sessionId, session.runId);
      if (!root) return;
      const sink = this.sessionEgresses.get(sessionId) ?? null;
      if (message.type === "SEND_MESSAGE") {
        await this.handleSendMessage(root, message.payload, sink);
      } else if (message.type === "INTERRUPT_GENERATION") {
        await handleTeamInterruptGenerationCommand({ teamRunId: root.teamRunId, payload: message.payload, sink, activeRun: root });
      } else {
        await handleTeamToolApprovalCommand({
          teamRunId: root.teamRunId, payload: message.payload,
          approved: message.type === "APPROVE_TOOL", sink, activeRun: root,
        });
      }
    } catch (error) {
      console.error(`Error handling team message for ${sessionId}: ${String(error)}`);
    }
  }

  async disconnect(sessionId: string): Promise<void> {
    this.broadcaster.unregisterConnection(sessionId);
    const task = this.activeTasks.get(sessionId);
    this.activeTasks.delete(sessionId);
    this.cleanupSession(sessionId);
    if (task) await task.catch(() => undefined);
  }

  private async bindSessionToTeamRun(
    sessionId: string,
    root: RootTeamRun,
    egress: TeamStreamEgress,
  ): Promise<void> {
    if (this.subscribedRunsBySessionId.get(sessionId) === root) return;
    if (this.subscribedRunsBySessionId.has(sessionId)) egress.flush();
    this.unsubscribeSession(sessionId);
    const connection = await root.openPackageSnapshotConnection();
    try {
      egress.send(parseTeamStreamServerMessage({
        type: "CONNECTED", payload: { session_id: sessionId, root_team_run_id: root.teamRunId },
      }));
      egress.send(projectTeamExecutionViewSnapshot(root.teamRunId, connection.snapshot, connection.baseChangeSequence));
      const unsubscribeEvents = connection.subscribe((event) => {
        try { egress.send(projectSequencedTeamRunEvent(root, event)); }
        catch (error) { console.error(`Error projecting TeamRun event: ${String(error)}`); }
      });
      const lifecycle = this.teamRunManager.getLifecycleSnapshot(root.teamRunId);
      egress.send(parseTeamStreamServerMessage({ type: "TEAM_RUN_LIFECYCLE", payload: { is_active: lifecycle.isActive } }));
      const unsubscribeLifecycle = this.teamRunManager.subscribeToLifecycle(root.teamRunId, (snapshot) =>
        egress.send(parseTeamStreamServerMessage({ type: "TEAM_RUN_LIFECYCLE", payload: { is_active: snapshot.isActive } })));
      this.eventUnsubscribers.set(sessionId, unsubscribeEvents);
      this.lifecycleUnsubscribers.set(sessionId, unsubscribeLifecycle);
      this.subscribedRunsBySessionId.set(sessionId, root);
    } catch (error) {
      connection.close();
      throw error;
    }
  }

  private async resolveSessionTeamRun(sessionId: string, rootTeamRunId: string): Promise<RootTeamRun | null> {
    const connection = this.sessionConnections.get(sessionId);
    const egress = this.sessionEgresses.get(sessionId);
    if (!connection || !egress) return null;
    const root = await this.resolveTeamRun(rootTeamRunId);
    if (!root) {
      this.closeWithTeamNotFound(connection, rootTeamRunId, egress);
      return null;
    }
    await this.bindSessionToTeamRun(sessionId, root, egress);
    return root;
  }

  private async handleSendMessage(
    root: RootTeamRun,
    payload: Extract<TeamStreamClientMessage, { type: "SEND_MESSAGE" }>["payload"],
    sink: TeamStreamSink | null,
  ): Promise<void> {
    const agentRunId = parseCommandAgentRunId(payload);
    if (!agentRunId) return this.sendInvalidTarget(sink, TEAM_COMMAND_INVALID_TARGET_MESSAGE);
    const contextFiles = [
      ...payload.context_file_paths.map((filePath) => new ContextFile(filePath)),
      ...payload.image_urls.map((url) => new ContextFile(url, ContextFileType.IMAGE)),
    ];
    const message = AgentInputUserMessage.fromDict({
      content: payload.content,
      context_files: contextFiles.length ? contextFiles.map((file) => file.toDict()) : null,
      metadata: { input_origin: "user_message", message_id: payload.message_id, dedupe_key: payload.dedupe_key },
    });
    const result = await root.executeAgentCommand(agentRunId, { kind: "post_message", message });
    if (!result.accepted) {
      if (result.code?.includes("TARGET") || result.code === "RUN_NOT_FOUND") {
        this.sendInvalidTarget(sink, result.message ?? TEAM_COMMAND_INVALID_TARGET_MESSAGE);
      }
      return;
    }
    await this.teamRunService.recordRunActivity(root, { summary: payload.content });
  }

  convertTeamEvent(root: RootTeamRun, event: SequencedRootEvent<TeamRunEvent>): TeamStreamServerMessage {
    return projectSequencedTeamRunEvent(root, event);
  }

  static parseMessage(raw: string): TeamStreamClientMessage { return parseTeamStreamClientMessage(raw); }

  private getTeamRun(teamRunId: string): RootTeamRun | null { return this.teamRunService.getActiveTeamRun(teamRunId); }
  private resolveTeamRun(teamRunId: string): Promise<RootTeamRun | null> { return this.teamRunService.resolveActiveTeamRun(teamRunId); }

  private closeWithTeamNotFound(
    connection: WebSocketConnection,
    teamRunId: string,
    sink?: TeamStreamSink,
  ): null {
    const message = errorMessage("TEAM_NOT_FOUND", `Team run '${teamRunId}' not found`);
    if (sink) sink.send(message); else connection.send(serializeTeamStreamServerMessage(message));
    connection.close(4004);
    return null;
  }

  private sendInvalidTarget(sink: TeamStreamSink | null, message: string): void {
    sink?.send(errorMessage(TEAM_COMMAND_INVALID_TARGET_CODE, message));
  }

  private unsubscribeSession(sessionId: string): void {
    this.eventUnsubscribers.get(sessionId)?.();
    this.eventUnsubscribers.delete(sessionId);
    this.lifecycleUnsubscribers.get(sessionId)?.();
    this.lifecycleUnsubscribers.delete(sessionId);
  }

  private cleanupSession(sessionId: string): void {
    this.unsubscribeSession(sessionId);
    this.sessionConnections.delete(sessionId);
    this.sessionEgresses.get(sessionId)?.dispose();
    this.sessionEgresses.delete(sessionId);
    this.subscribedRunsBySessionId.delete(sessionId);
    this.sessionManager.closeSession(sessionId);
  }
}

let cachedAgentTeamStreamHandler: AgentTeamStreamHandler | null = null;
export const getAgentTeamStreamHandler = (): AgentTeamStreamHandler => cachedAgentTeamStreamHandler ??=
  new AgentTeamStreamHandler(new AgentSessionManager(AgentTeamSession), getTeamRunService());
