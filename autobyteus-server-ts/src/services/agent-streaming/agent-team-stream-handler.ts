import { randomUUID } from "node:crypto";
import {
  parseTeamStreamClientMessage,
  parseTeamStreamServerMessage,
  serializeTeamStreamServerMessage,
  type TeamStreamClientMessage,
  type TeamStreamServerMessage,
} from "@autobyteus/team-stream-contracts";
import { AgentInputUserMessage, ContextFile, ContextFileType } from "autobyteus-ts";
import type { TeamRun } from "../../agent-team-execution/domain/team-run.js";
import type { TeamRunEvent } from "../../agent-team-execution/domain/team-run-event.js";
import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import {
  TeamRunService,
  getTeamRunService,
} from "../../agent-team-execution/services/team-run-service.js";
import { AgentSession } from "./agent-session.js";
import { AgentSessionManager } from "./agent-session-manager.js";
import {
  parseCommandExecutionAddress,
  TEAM_COMMAND_INVALID_TARGET_CODE,
  TEAM_COMMAND_INVALID_TARGET_MESSAGE,
} from "./team-execution-address-command-parser.js";
import { handleTeamInterruptGenerationCommand } from "./team-interrupt-generation-command-handler.js";
import {
  TeamRuntimeSnapshotService,
  getTeamRuntimeSnapshotService,
} from "./team-runtime-snapshot-service.js";
import { convertTeamRunEventToServerMessage } from "./team-run-event-websocket-message-mapper.js";
import { TeamStreamBroadcaster, getTeamStreamBroadcaster } from "./team-stream-broadcaster.js";
import { handleTeamToolApprovalCommand } from "./team-tool-approval-command-handler.js";
import {
  AgentStreamWebSocketEgress,
  type AgentStreamServerMessageSink,
} from "./websocket-egress/agent-stream-websocket-egress.js";

export type WebSocketConnection = {
  send: (data: string) => void;
  close: (code?: number) => void;
};

type TeamStreamSink = AgentStreamServerMessageSink<TeamStreamServerMessage>;
type TeamStreamEgress = AgentStreamWebSocketEgress<TeamStreamServerMessage>;

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};
const TEAM_METADATA_REFRESH_DEBOUNCE_MS = 2000;

class AgentTeamSession extends AgentSession {
  get teamRunId(): string { return this.runId; }
}

const errorMessage = (code: string, message: string): TeamStreamServerMessage =>
  parseTeamStreamServerMessage({
    type: "ERROR",
    payload: { code, message, agent_execution: null },
  });

export class AgentTeamStreamHandler {
  private readonly activeTasks = new Map<string, Promise<void>>();
  private readonly eventUnsubscribers = new Map<string, () => void>();
  private readonly lifecycleUnsubscribers = new Map<string, () => void>();
  private readonly sessionConnections = new Map<string, WebSocketConnection>();
  private readonly sessionEgresses = new Map<string, TeamStreamEgress>();
  private readonly subscribedRunsBySessionId = new Map<string, TeamRun>();
  private readonly pendingMetadataRefreshTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly sessionManager: AgentSessionManager = new AgentSessionManager(AgentTeamSession),
    private readonly teamRunService: TeamRunService = getTeamRunService(),
    private readonly broadcaster: TeamStreamBroadcaster = getTeamStreamBroadcaster(),
    private readonly statusSnapshotService: TeamRuntimeSnapshotService = getTeamRuntimeSnapshotService(),
    private readonly teamRunManager: Pick<
      AgentTeamRunManager,
      "getLifecycleSnapshot" | "subscribeToLifecycle"
    > = AgentTeamRunManager.getInstance(),
  ) {}

  async connect(connection: WebSocketConnection, teamRunId: string): Promise<string | null> {
    const teamRun = await this.resolveTeamRun(teamRunId);
    if (!teamRun) {
      this.closeWithTeamNotFound(connection, teamRunId);
      return null;
    }
    const sessionId = randomUUID();
    try {
      this.sessionManager.createSession(sessionId, teamRunId).connect();
    } catch (error) {
      logger.error(`Failed to create team session: ${String(error)}`);
      connection.send(serializeTeamStreamServerMessage(errorMessage("SESSION_ERROR", String(error))));
      connection.close(1011);
      return null;
    }

    const egress = new AgentStreamWebSocketEgress<TeamStreamServerMessage>({
      sendRaw: (payload) => connection.send(payload),
      serialize: serializeTeamStreamServerMessage,
      onSendError: (error) => logger.error(
        `Team WebSocket egress failed: session=${sessionId}, run=${teamRunId}: ${String(error)}`,
      ),
    });
    this.sessionConnections.set(sessionId, connection);
    this.sessionEgresses.set(sessionId, egress);
    if (!this.bindSessionToTeamRun(sessionId, teamRun, egress)) {
      egress.send(errorMessage("TEAM_STREAM_UNAVAILABLE", `Team run '${teamRunId}' stream not available`));
      egress.dispose();
      connection.close(1011);
      this.sessionConnections.delete(sessionId);
      this.sessionEgresses.delete(sessionId);
      this.sessionManager.closeSession(sessionId);
      return null;
    }

    this.activeTasks.set(sessionId, Promise.resolve());
    this.broadcaster.registerConnection(sessionId, teamRunId, egress);
    egress.send(parseTeamStreamServerMessage({ type: "CONNECTED", payload: { session_id: sessionId } }));
    this.sendInitialStatusSnapshot(egress, teamRun);
    logger.info(`Agent Team WebSocket connected: session=${sessionId}, run=${teamRunId}`);
    return sessionId;
  }

  async handleMessage(sessionId: string, message: string): Promise<void> {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      logger.warn(`Message for unknown team session: ${sessionId}`);
      return;
    }
    try {
      const data = AgentTeamStreamHandler.parseMessage(message);
      const teamRunId = session.runId;
      const sink = this.sessionEgresses.get(sessionId) ?? null;
      if (data.type === "SEND_MESSAGE") {
        const teamRun = await this.resolveSessionTeamRun(sessionId, teamRunId);
        if (teamRun) await this.handleSendMessage(teamRun, data.payload, sink);
        return;
      }
      if (data.type === "INTERRUPT_GENERATION") {
        await handleTeamInterruptGenerationCommand({
          teamRunId,
          payload: data.payload,
          sink,
          activeRun: this.getTeamRun(teamRunId),
        });
        return;
      }
      if (!this.ensureActiveSessionSubscription(sessionId, teamRunId)) {
        logger.warn(`Team websocket session '${sessionId}' lost its active subscription.`);
        return;
      }
      await handleTeamToolApprovalCommand({
        teamRunId,
        payload: data.payload,
        approved: data.type === "APPROVE_TOOL",
        sink,
        activeRun: this.getTeamRun(teamRunId),
      });
    } catch (error) {
      logger.error(`Error handling team message for ${sessionId}: ${String(error)}`);
    }
  }

  async disconnect(sessionId: string): Promise<void> {
    this.broadcaster.unregisterConnection(sessionId);
    const task = this.activeTasks.get(sessionId);
    this.activeTasks.delete(sessionId);
    this.sessionConnections.delete(sessionId);
    this.sessionEgresses.get(sessionId)?.dispose();
    this.sessionEgresses.delete(sessionId);
    this.subscribedRunsBySessionId.delete(sessionId);
    this.unsubscribeSession(sessionId);
    this.sessionManager.closeSession(sessionId);
    if (task) await task.catch(() => undefined);
    logger.info(`Agent Team WebSocket disconnected: ${sessionId}`);
  }

  private sendInitialStatusSnapshot(sink: TeamStreamSink, teamRun: TeamRun): void {
    const lifecycle = this.teamRunManager.getLifecycleSnapshot(teamRun.teamRunId);
    this.statusSnapshotService.getInitialMessages(teamRun, lifecycle).forEach((message) => sink.send(message));
  }

  private ensureActiveSessionSubscription(sessionId: string, teamRunId: string): boolean {
    const egress = this.sessionEgresses.get(sessionId);
    const teamRun = this.getTeamRun(teamRunId);
    return !!egress && !!teamRun && this.bindSessionToTeamRun(sessionId, teamRun, egress);
  }

  private async resolveSessionTeamRun(sessionId: string, teamRunId: string): Promise<TeamRun | null> {
    const connection = this.sessionConnections.get(sessionId);
    const egress = this.sessionEgresses.get(sessionId);
    if (!connection || !egress) return null;
    const teamRun = await this.resolveTeamRun(teamRunId);
    if (!teamRun) {
      this.closeWithTeamNotFound(connection, teamRunId, egress);
      return null;
    }
    if (!this.bindSessionToTeamRun(sessionId, teamRun, egress)) {
      egress.send(errorMessage("TEAM_STREAM_UNAVAILABLE", `Team run '${teamRunId}' stream not available`));
      connection.close(1011);
      return null;
    }
    return teamRun;
  }

  private bindSessionToTeamRun(sessionId: string, teamRun: TeamRun, egress: TeamStreamEgress): boolean {
    if (this.subscribedRunsBySessionId.get(sessionId) === teamRun) return true;
    if (this.subscribedRunsBySessionId.has(sessionId)) egress.flush();
    this.unsubscribeSession(sessionId);
    const unsubscribeEvents = teamRun.subscribeToEvents((event) => {
      try { egress.send(this.convertTeamEvent(event)); }
      catch (error) { logger.error(`Error sending team event: ${String(error)}`); }
      this.scheduleMetadataRefresh(teamRun.teamRunId, teamRun);
    });
    if (!unsubscribeEvents) return false;
    try {
      const unsubscribeLifecycle = this.teamRunManager.subscribeToLifecycle(
        teamRun.teamRunId,
        (snapshot) => egress.send(parseTeamStreamServerMessage({
          type: "TEAM_RUN_LIFECYCLE",
          payload: { is_active: snapshot.isActive },
        })),
      );
      this.eventUnsubscribers.set(sessionId, unsubscribeEvents);
      this.lifecycleUnsubscribers.set(sessionId, unsubscribeLifecycle);
      this.subscribedRunsBySessionId.set(sessionId, teamRun);
      return true;
    } catch (error) {
      unsubscribeEvents();
      logger.error(`Failed to subscribe to team lifecycle: ${String(error)}`);
      return false;
    }
  }

  private unsubscribeSession(sessionId: string): void {
    this.eventUnsubscribers.get(sessionId)?.();
    this.eventUnsubscribers.delete(sessionId);
    this.lifecycleUnsubscribers.get(sessionId)?.();
    this.lifecycleUnsubscribers.delete(sessionId);
  }

  private async handleSendMessage(
    teamRun: TeamRun,
    payload: Extract<TeamStreamClientMessage, { type: "SEND_MESSAGE" }>["payload"],
    sink: TeamStreamSink | null,
  ): Promise<void> {
    const address = parseCommandExecutionAddress(payload, teamRun.teamRunId);
    if (!address) {
      this.sendInvalidTarget(sink, TEAM_COMMAND_INVALID_TARGET_MESSAGE);
      return;
    }
    const contextFiles = [
      ...payload.context_file_paths.map((path) => new ContextFile(path)),
      ...payload.image_urls.map((url) => new ContextFile(url, ContextFileType.IMAGE)),
    ];
    const userMessage = AgentInputUserMessage.fromDict({
      content: payload.content,
      context_files: contextFiles.length > 0 ? contextFiles.map((file) => file.toDict()) : null,
      metadata: {
        input_origin: "user_message",
        message_id: payload.message_id,
        dedupe_key: payload.dedupe_key,
      },
    });
    const result = await teamRun.executeMemberCommand(address, { kind: "post_message", message: userMessage });
    if (!result.accepted) {
      logger.warn(`SEND_MESSAGE rejected: [${result.code ?? "UNKNOWN"}] ${result.message ?? ""}`);
      if (this.isInvalidTargetResult(result.code)) {
        this.sendInvalidTarget(sink, result.message ?? "SEND_MESSAGE target is invalid.");
      }
      return;
    }
    await this.teamRunService.recordRunActivity(teamRun, { summary: payload.content });
  }

  private closeWithTeamNotFound(
    connection: WebSocketConnection,
    teamRunId: string,
    sink?: TeamStreamSink,
  ): void {
    const message = errorMessage("TEAM_NOT_FOUND", `Team run '${teamRunId}' not found`);
    if (sink) sink.send(message);
    else connection.send(serializeTeamStreamServerMessage(message));
    connection.close(4004);
  }

  private sendInvalidTarget(sink: TeamStreamSink | null, message: string): void {
    sink?.send(errorMessage(TEAM_COMMAND_INVALID_TARGET_CODE, message));
  }

  private isInvalidTargetResult(code: string | null | undefined): boolean {
    return !!code && (code.includes("TARGET") || code.includes("TASK_AGENT") ||
      code.includes("TASK_TEAM") || code === "TEAM_EXECUTION_ADDRESS_INVALID" || code === "RUN_NOT_FOUND");
  }

  private scheduleMetadataRefresh(teamRunId: string, teamRun: TeamRun): void {
    if (this.pendingMetadataRefreshTimers.has(teamRunId)) return;
    const timer = setTimeout(() => {
      this.pendingMetadataRefreshTimers.delete(teamRunId);
      void this.teamRunService.refreshRunMetadata(teamRun).catch((error) =>
        logger.error(`Failed to refresh team run metadata for '${teamRunId}': ${String(error)}`));
    }, TEAM_METADATA_REFRESH_DEBOUNCE_MS);
    this.pendingMetadataRefreshTimers.set(teamRunId, timer);
  }

  convertTeamEvent(event: TeamRunEvent): TeamStreamServerMessage {
    return convertTeamRunEventToServerMessage(event);
  }

  static parseMessage(raw: string): TeamStreamClientMessage {
    return parseTeamStreamClientMessage(raw);
  }

  private getTeamRun(teamRunId: string): TeamRun | null {
    return this.teamRunService.getTeamRun(teamRunId);
  }

  private resolveTeamRun(teamRunId: string): Promise<TeamRun | null> {
    return this.teamRunService.resolveTeamRun(teamRunId);
  }
}

let cachedAgentTeamStreamHandler: AgentTeamStreamHandler | null = null;

export const getAgentTeamStreamHandler = (): AgentTeamStreamHandler => {
  if (!cachedAgentTeamStreamHandler) {
    cachedAgentTeamStreamHandler = new AgentTeamStreamHandler(
      new AgentSessionManager(AgentTeamSession),
      getTeamRunService(),
    );
  }
  return cachedAgentTeamStreamHandler;
};
