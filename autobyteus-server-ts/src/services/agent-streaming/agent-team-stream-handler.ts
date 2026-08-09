import { randomUUID } from "node:crypto";
import {
  AgentInputUserMessage,
  ContextFile,
  ContextFileType,
} from "autobyteus-ts";
import type { TeamRun } from "../../agent-team-execution/domain/team-run.js";
import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import {
  TeamRunService,
  getTeamRunService,
} from "../../agent-team-execution/services/team-run-service.js";
import type { TeamRunEvent } from "../../agent-team-execution/domain/team-run-event.js";
import { TeamStreamBroadcaster, getTeamStreamBroadcaster } from "./team-stream-broadcaster.js";
import { AgentSession } from "./agent-session.js";
import { AgentSessionManager } from "./agent-session-manager.js";
import {
  AgentRunEventMessageMapper,
  getAgentRunEventMessageMapper,
} from "./agent-run-event-message-mapper.js";
import {
  ClientMessageType,
  createErrorMessage,
  ServerMessage,
  ServerMessageType,
} from "./models.js";
import {
  parseCommandExecutionAddress,
  TEAM_COMMAND_INVALID_TARGET_CODE,
  TEAM_COMMAND_INVALID_TARGET_MESSAGE,
} from "./team-execution-address-command-parser.js";
import {
  TeamRuntimeSnapshotService,
  getTeamRuntimeSnapshotService,
} from "./team-runtime-snapshot-service.js";
import { convertTeamRunEventToServerMessage } from "./team-run-event-websocket-message-mapper.js";
import { handleTeamToolApprovalCommand } from "./team-tool-approval-command-handler.js";
import { handleTeamInterruptGenerationCommand } from "./team-interrupt-generation-command-handler.js";
import {
  AgentStreamWebSocketEgress,
  type AgentStreamServerMessageSink,
} from "./websocket-egress/agent-stream-websocket-egress.js";

export type WebSocketConnection = {
  send: (data: string) => void;
  close: (code?: number) => void;
};

type ClientMessage = {
  type?: string;
  payload?: Record<string, unknown>;
};

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

const TEAM_METADATA_REFRESH_DEBOUNCE_MS = 2000;

class AgentTeamSession extends AgentSession {
  get teamRunId(): string {
    return this.runId;
  }
}

export class AgentTeamStreamHandler {
  private readonly sessionManager: AgentSessionManager;
  private readonly broadcaster: TeamStreamBroadcaster;
  private readonly agentRunEventMessageMapper: AgentRunEventMessageMapper;
  private readonly teamRunService: TeamRunService;
  private readonly activeTasks = new Map<string, Promise<void>>();
  private readonly eventUnsubscribers = new Map<string, () => void>();
  private readonly lifecycleUnsubscribers = new Map<string, () => void>();
  private readonly sessionConnections = new Map<string, WebSocketConnection>();
  private readonly sessionEgresses = new Map<string, AgentStreamWebSocketEgress>();
  private readonly subscribedRunsBySessionId = new Map<string, TeamRun>();
  private readonly pendingMetadataRefreshTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    sessionManager: AgentSessionManager = new AgentSessionManager(AgentTeamSession),
    teamRunService: TeamRunService = getTeamRunService(),
    broadcaster: TeamStreamBroadcaster = getTeamStreamBroadcaster(),
    agentRunEventMessageMapper: AgentRunEventMessageMapper = getAgentRunEventMessageMapper(),
    private readonly statusSnapshotService: TeamRuntimeSnapshotService =
      getTeamRuntimeSnapshotService(),
    private readonly teamRunManager: Pick<
      AgentTeamRunManager,
      "getLifecycleSnapshot" | "subscribeToLifecycle"
    > = AgentTeamRunManager.getInstance(),
  ) {
    this.sessionManager = sessionManager;
    this.teamRunService = teamRunService;
    this.broadcaster = broadcaster;
    this.agentRunEventMessageMapper = agentRunEventMessageMapper;
  }

  async connect(connection: WebSocketConnection, teamRunId: string): Promise<string | null> {
    const teamRun = await this.resolveTeamRun(teamRunId);
    if (!teamRun) {
      this.closeWithTeamNotFound(connection, teamRunId);
      return null;
    }

    const sessionId = randomUUID();
    try {
      const session = this.sessionManager.createSession(sessionId, teamRunId);
      session.connect();
    } catch (error) {
      logger.error(`Failed to create team session: ${String(error)}`);
      const errorMsg = createErrorMessage("SESSION_ERROR", String(error));
      connection.send(errorMsg.toJson());
      connection.close(1011);
      return null;
    }

    const egress = new AgentStreamWebSocketEgress({
      sendRaw: (payload) => connection.send(payload),
      onSendError: (error) => logger.error(
        `Team WebSocket egress failed: session=${sessionId}, run=${teamRunId}: ${String(error)}`,
      ),
    });
    this.sessionConnections.set(sessionId, connection);
    this.sessionEgresses.set(sessionId, egress);
    if (!this.bindSessionToTeamRun(sessionId, teamRun, egress)) {
      const errorMsg = createErrorMessage(
        "TEAM_STREAM_UNAVAILABLE",
        `Team run '${teamRunId}' stream not available`,
      );
      egress.send(errorMsg);
      egress.dispose();
      connection.close(1011);
      this.sessionConnections.delete(sessionId);
      this.sessionEgresses.delete(sessionId);
      this.sessionManager.closeSession(sessionId);
      return null;
    }
    const task = Promise.resolve();
    this.activeTasks.set(sessionId, task);

    const connectedMsg = new ServerMessage(ServerMessageType.CONNECTED, {
      team_id: teamRunId,
      session_id: sessionId,
    });
    this.broadcaster.registerConnection(sessionId, teamRunId, egress);
    egress.send(connectedMsg);
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
      const msgType = data.type;
      const payload = data.payload ?? {};
      const teamRunId = session.runId;

      const egress = this.sessionEgresses.get(sessionId);

      if (msgType === ClientMessageType.SEND_MESSAGE) {
        const teamRun = await this.resolveSessionTeamRun(sessionId, teamRunId);
        if (!teamRun) {
          return;
        }
        await this.handleSendMessage(teamRun, payload, egress ?? null);
        return;
      }

      if (msgType === ClientMessageType.INTERRUPT_GENERATION) {
        await this.handleInterruptGeneration(teamRunId, payload, egress ?? null);
        return;
      }

      if (!this.ensureActiveSessionSubscription(sessionId, teamRunId)) {
        logger.warn(`Team websocket session '${sessionId}' lost its active team subscription for run '${teamRunId}'.`);
        return;
      }

      if (msgType === ClientMessageType.APPROVE_TOOL) {
        await this.handleToolApproval(teamRunId, payload, true, egress ?? null);
      } else if (msgType === ClientMessageType.DENY_TOOL) {
        await this.handleToolApproval(teamRunId, payload, false, egress ?? null);
      } else {
        logger.warn(`Unknown message type: ${String(msgType)}`);
      }
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

    if (task) {
      try {
        await task;
      } catch {
        // ignore
      }
    }

    logger.info(`Agent Team WebSocket disconnected: ${sessionId}`);
  }

  private sendInitialStatusSnapshot(
    sink: AgentStreamServerMessageSink,
    teamRun: TeamRun,
  ): void {
    const lifecycleSnapshot = this.teamRunManager.getLifecycleSnapshot(teamRun.teamRunId);
    for (const message of this.statusSnapshotService.getInitialMessages(
      teamRun,
      lifecycleSnapshot,
    )) {
      sink.send(message);
    }
  }

  private ensureActiveSessionSubscription(sessionId: string, teamRunId: string): boolean {
    const egress = this.sessionEgresses.get(sessionId);
    if (!egress) {
      return false;
    }
    const teamRun = this.getTeamRun(teamRunId);
    return !!teamRun && this.bindSessionToTeamRun(sessionId, teamRun, egress);
  }

  private async resolveSessionTeamRun(
    sessionId: string,
    teamRunId: string,
  ): Promise<TeamRun | null> {
    const connection = this.sessionConnections.get(sessionId);
    const egress = this.sessionEgresses.get(sessionId);
    if (!connection || !egress) {
      return null;
    }

    const teamRun = await this.resolveTeamRun(teamRunId);
    if (!teamRun) {
      logger.warn(`Team websocket session '${sessionId}' could not resolve run '${teamRunId}'.`);
      this.closeWithTeamNotFound(connection, teamRunId, egress);
      return null;
    }

    if (!this.bindSessionToTeamRun(sessionId, teamRun, egress)) {
      const errorMsg = createErrorMessage(
        "TEAM_STREAM_UNAVAILABLE",
        `Team run '${teamRunId}' stream not available`,
      );
      egress.send(errorMsg);
      connection.close(1011);
      return null;
    }

    return teamRun;
  }

  private bindSessionToTeamRun(
    sessionId: string,
    teamRun: TeamRun,
    egress: AgentStreamWebSocketEgress,
  ): boolean {
    const subscribedRun = this.subscribedRunsBySessionId.get(sessionId);
    if (subscribedRun === teamRun) {
      return true;
    }

    if (subscribedRun) {
      egress.flush();
    }
    this.unsubscribeSession(sessionId);

    const unsubscribeEvents = teamRun.subscribeToEvents((event) => {
      try {
        egress.send(this.convertTeamEvent(event));
      } catch (error) {
        logger.error(`Error sending team event to WebSocket: ${String(error)}`);
      }
      this.scheduleMetadataRefresh(teamRun.teamRunId, teamRun);
    });
    if (!unsubscribeEvents) {
      return false;
    }

    let unsubscribeLifecycle: () => void;
    try {
      unsubscribeLifecycle = this.teamRunManager.subscribeToLifecycle(
        teamRun.teamRunId,
        (snapshot) => {
          try {
            egress.send(new ServerMessage(ServerMessageType.TEAM_RUN_LIFECYCLE, {
              team_run_id: snapshot.teamRunId,
              is_active: snapshot.isActive,
            }));
          } catch (error) {
            logger.error(`Error sending team lifecycle to WebSocket: ${String(error)}`);
          }
        },
      );
    } catch (error) {
      unsubscribeEvents();
      logger.error(`Failed to subscribe to team lifecycle: ${String(error)}`);
      return false;
    }

    this.eventUnsubscribers.set(sessionId, unsubscribeEvents);
    this.lifecycleUnsubscribers.set(sessionId, unsubscribeLifecycle);
    this.subscribedRunsBySessionId.set(sessionId, teamRun);
    return true;
  }

  private unsubscribeSession(sessionId: string): void {
    const unsubscribeEvents = this.eventUnsubscribers.get(sessionId);
    this.eventUnsubscribers.delete(sessionId);
    unsubscribeEvents?.();

    const unsubscribeLifecycle = this.lifecycleUnsubscribers.get(sessionId);
    this.lifecycleUnsubscribers.delete(sessionId);
    unsubscribeLifecycle?.();
  }

  private async handleSendMessage(
    teamRun: TeamRun,
    payload: Record<string, unknown>,
    sink: AgentStreamServerMessageSink | null,
  ): Promise<void> {
    const teamRunId = teamRun.teamRunId;
    const content = typeof payload.content === "string" ? payload.content : "";
    const executionAddress = parseCommandExecutionAddress(payload, teamRunId);
    if (!executionAddress) {
      logger.warn(`SEND_MESSAGE rejected for team run ${teamRunId}: ${TEAM_COMMAND_INVALID_TARGET_MESSAGE}`);
      this.sendInvalidTarget(sink, TEAM_COMMAND_INVALID_TARGET_MESSAGE);
      return;
    }

    const contextFilePaths =
      (payload.context_file_paths as unknown[]) ?? (payload.contextFilePaths as unknown[]) ?? [];
    const imageUrls = (payload.image_urls as unknown[]) ?? (payload.imageUrls as unknown[]) ?? [];

    const contextFiles: ContextFile[] = [];
    for (const path of contextFilePaths) {
      if (typeof path === "string" && path.length > 0) {
        contextFiles.push(new ContextFile(path));
      }
    }
    for (const url of imageUrls) {
      if (typeof url === "string" && url.length > 0) {
        contextFiles.push(new ContextFile(url, ContextFileType.IMAGE));
      }
    }

    const contextPayload = contextFiles.map((file) => file.toDict());
    const metadata: Record<string, unknown> = { input_origin: "user_message" };
    if (typeof payload.message_id === "string" && payload.message_id.trim().length > 0) {
      metadata.message_id = payload.message_id.trim();
    }
    if (typeof payload.dedupe_key === "string" && payload.dedupe_key.trim().length > 0) {
      metadata.dedupe_key = payload.dedupe_key.trim();
    }
    const userMessage = AgentInputUserMessage.fromDict({
      content,
      context_files: contextPayload.length > 0 ? contextPayload : null,
      metadata,
    });

    const taskTeamRunId = executionAddress.taskTeamRunIds.at(-1) ?? null;
    const result = executionAddress.taskAgentRunId
      ? await teamRun.postMessage(userMessage, executionAddress.memberAddress, executionAddress.taskAgentRunId)
      : taskTeamRunId
        ? await teamRun.postMessageToTaskTeamInstance(executionAddress.memberAddress, taskTeamRunId, userMessage)
        : await teamRun.postMessage(userMessage, executionAddress.memberAddress);
    if (!result.accepted) {
      logger.warn(
        `SEND_MESSAGE rejected for team run ${teamRunId}: [${result.code ?? "UNKNOWN"}] ${result.message ?? "no message"}`,
      );
      if (this.isInvalidTargetResult(result.code)) {
        this.sendInvalidTarget(sink, result.message ?? "SEND_MESSAGE target is invalid.");
      }
      return;
    }
    await this.teamRunService.recordRunActivity(teamRun, {
      summary: content,
    });
  }

  private async handleInterruptGeneration(
    teamRunId: string,
    payload: Record<string, unknown>,
    sink: AgentStreamServerMessageSink | null,
  ): Promise<void> {
    await handleTeamInterruptGenerationCommand({
      teamRunId,
      payload,
      sink,
      activeRun: this.resolveCommandRun(teamRunId),
    });
  }

  private async handleToolApproval(
    teamRunId: string,
    payload: Record<string, unknown>,
    approved: boolean,
    sink: AgentStreamServerMessageSink | null,
  ): Promise<void> {
    await handleTeamToolApprovalCommand({
      teamRunId,
      payload,
      approved,
      sink,
      activeRun: this.resolveCommandRun(teamRunId),
    });
  }

  private resolveCommandRun(
    teamRunId: string,
  ): import("../../agent-team-execution/domain/team-run.js").TeamRun | null {
    return this.getTeamRun(teamRunId);
  }

  private getTeamRun(teamRunId: string): TeamRun | null {
    return this.teamRunService.getTeamRun(teamRunId);
  }

  private resolveTeamRun(teamRunId: string): Promise<TeamRun | null> {
    return this.teamRunService.resolveTeamRun(teamRunId);
  }

  private closeWithTeamNotFound(
    connection: WebSocketConnection,
    teamRunId: string,
    sink?: AgentStreamServerMessageSink,
  ): void {
    const errorMsg = createErrorMessage("TEAM_NOT_FOUND", `Team run '${teamRunId}' not found`);
    if (sink) {
      sink.send(errorMsg);
    } else {
      connection.send(errorMsg.toJson());
    }
    connection.close(4004);
  }

  private sendInvalidTarget(
    sink: AgentStreamServerMessageSink | null,
    message: string,
  ): void {
    sink?.send(createErrorMessage(TEAM_COMMAND_INVALID_TARGET_CODE, message));
  }

  private isInvalidTargetResult(code: string | null | undefined): boolean {
    if (!code) {
      return false;
    }
    return code.includes("TARGET") ||
      code.includes("TASK_AGENT") ||
      code.includes("TASK_TEAM") ||
      code === "RUN_NOT_FOUND";
  }

  private scheduleMetadataRefresh(teamRunId: string, teamRun: TeamRun): void {
    if (this.pendingMetadataRefreshTimers.has(teamRunId)) {
      return;
    }

    const timer = setTimeout(() => {
      this.pendingMetadataRefreshTimers.delete(teamRunId);
      void this.teamRunService.refreshRunMetadata(teamRun).catch((error) => {
        logger.error(`Failed to refresh team run metadata for '${teamRunId}': ${String(error)}`);
      });
    }, TEAM_METADATA_REFRESH_DEBOUNCE_MS);

    this.pendingMetadataRefreshTimers.set(teamRunId, timer);
  }

  convertTeamEvent(event: TeamRunEvent): ServerMessage {
    return convertTeamRunEventToServerMessage(
      event,
      this.agentRunEventMessageMapper,
    );
  }

  static parseMessage(raw: string): ClientMessage {
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch (error) {
      throw new Error(`Invalid JSON: ${String(error)}`);
    }

    if (!data || typeof data !== "object" || !("type" in data)) {
      throw new Error("Message missing 'type' field");
    }

    return data as ClientMessage;
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
