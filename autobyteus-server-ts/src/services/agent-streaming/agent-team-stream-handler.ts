import { randomUUID } from "node:crypto";
import {
  AgentInputUserMessage,
  ContextFile,
  ContextFileType,
} from "autobyteus-ts";
import type { TeamRun } from "../../agent-team-execution/domain/team-run.js";
import { resolveRuntimeMemberContext } from "../../agent-team-execution/domain/team-run-context.js";
import {
  TeamRunService,
  getTeamRunService,
} from "../../agent-team-execution/services/team-run-service.js";
import {
  TeamRunEventSourceType,
  type TeamRunEvent,
  type TeamRunAgentEventPayload,
  type TeamRunCommunicationEventPayload,
  type TeamRunMemberInputEventPayload,
  type TeamRunStatusUpdateData,
  type TeamRunTaskPlanEventPayload,
  getTeamRunEventSourceRouteKey,
} from "../../agent-team-execution/domain/team-run-event.js";
import {
  selectorFromMemberName,
  selectorFromMemberPath,
  type TeamMemberSelector,
} from "../../agent-team-execution/domain/team-run-member-identity.js";
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
import { serializePayload } from "./payload-serialization.js";
import { resolveTeamMemberSelectorFromPayload } from "./team-member-selector-payload-adapter.js";
import { buildTeamCommunicationMessagePayload } from "./team-communication-message-payload.js";
import { buildTeamMemberInputMessagePayload } from "./team-member-input-message-payload.js";

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
  private readonly sessionConnections = new Map<string, WebSocketConnection>();
  private readonly subscribedRunsBySessionId = new Map<string, TeamRun>();
  private readonly pendingMetadataRefreshTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    sessionManager: AgentSessionManager = new AgentSessionManager(AgentTeamSession),
    teamRunService: TeamRunService = getTeamRunService(),
    broadcaster: TeamStreamBroadcaster = getTeamStreamBroadcaster(),
    agentRunEventMessageMapper: AgentRunEventMessageMapper = getAgentRunEventMessageMapper(),
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

    this.sessionConnections.set(sessionId, connection);
    if (!this.bindSessionToTeamRun(sessionId, teamRun, connection)) {
      const errorMsg = createErrorMessage(
        "TEAM_STREAM_UNAVAILABLE",
        `Team run '${teamRunId}' stream not available`,
      );
      connection.send(errorMsg.toJson());
      connection.close(1011);
      this.sessionConnections.delete(sessionId);
      this.sessionManager.closeSession(sessionId);
      return null;
    }
    const task = Promise.resolve();
    this.activeTasks.set(sessionId, task);

    const connectedMsg = new ServerMessage(ServerMessageType.CONNECTED, {
      team_id: teamRunId,
      session_id: sessionId,
    });
    this.broadcaster.registerConnection(sessionId, teamRunId, connection);
    connection.send(connectedMsg.toJson());
    this.sendInitialStatusSnapshot(connection, teamRun);

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

      if (msgType === ClientMessageType.SEND_MESSAGE) {
        const teamRun = await this.resolveSessionTeamRun(sessionId, teamRunId);
        if (!teamRun) {
          return;
        }
        await this.handleSendMessage(teamRun, payload);
        return;
      }

      if (!this.ensureActiveSessionSubscription(sessionId, teamRunId)) {
        logger.warn(`Team websocket session '${sessionId}' lost its active team subscription for run '${teamRunId}'.`);
        return;
      }

      if (msgType === ClientMessageType.STOP_GENERATION) {
        await this.handleStopGeneration(teamRunId);
      } else if (msgType === ClientMessageType.APPROVE_TOOL) {
        await this.handleToolApproval(teamRunId, payload, true);
      } else if (msgType === ClientMessageType.DENY_TOOL) {
        await this.handleToolApproval(teamRunId, payload, false);
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
    this.subscribedRunsBySessionId.delete(sessionId);

    const unsubscribe = this.eventUnsubscribers.get(sessionId);
    this.eventUnsubscribers.delete(sessionId);
    if (unsubscribe) {
      unsubscribe();
    }

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
    connection: WebSocketConnection,
    teamRun: TeamRun,
  ): void {
    const currentStatus = teamRun.getStatus();
    if (typeof currentStatus !== "string" || currentStatus.trim().length === 0) {
      return;
    }

    connection.send(
      new ServerMessage(ServerMessageType.TEAM_STATUS, {
        new_status: currentStatus.trim().toUpperCase(),
      }).toJson(),
    );
  }

  private ensureActiveSessionSubscription(sessionId: string, teamRunId: string): boolean {
    const connection = this.sessionConnections.get(sessionId);
    if (!connection) {
      return false;
    }
    const teamRun = this.getTeamRun(teamRunId);
    return !!teamRun && this.bindSessionToTeamRun(sessionId, teamRun, connection);
  }

  private async resolveSessionTeamRun(
    sessionId: string,
    teamRunId: string,
  ): Promise<TeamRun | null> {
    const connection = this.sessionConnections.get(sessionId);
    if (!connection) {
      return null;
    }

    const teamRun = await this.resolveTeamRun(teamRunId);
    if (!teamRun) {
      logger.warn(`Team websocket session '${sessionId}' could not resolve run '${teamRunId}'.`);
      this.closeWithTeamNotFound(connection, teamRunId);
      return null;
    }

    if (!this.bindSessionToTeamRun(sessionId, teamRun, connection)) {
      const errorMsg = createErrorMessage(
        "TEAM_STREAM_UNAVAILABLE",
        `Team run '${teamRunId}' stream not available`,
      );
      connection.send(errorMsg.toJson());
      connection.close(1011);
      return null;
    }

    return teamRun;
  }

  private bindSessionToTeamRun(
    sessionId: string,
    teamRun: TeamRun,
    connection: WebSocketConnection,
  ): boolean {
    const subscribedRun = this.subscribedRunsBySessionId.get(sessionId);
    if (subscribedRun === teamRun) {
      return true;
    }

    const existingUnsubscribe = this.eventUnsubscribers.get(sessionId);
    existingUnsubscribe?.();
    this.eventUnsubscribers.delete(sessionId);

    const unsubscribe = teamRun.subscribeToEvents((event) => {
      try {
        connection.send(this.convertTeamEvent(event).toJson());
      } catch (error) {
        logger.error(`Error sending team event to WebSocket: ${String(error)}`);
      }
      this.scheduleMetadataRefresh(teamRun.runId, teamRun);
    });
    if (!unsubscribe) {
      return false;
    }

    this.eventUnsubscribers.set(sessionId, unsubscribe);
    this.subscribedRunsBySessionId.set(sessionId, teamRun);
    return true;
  }

  private async handleSendMessage(
    teamRun: TeamRun,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const teamRunId = teamRun.runId;
    const content = typeof payload.content === "string" ? payload.content : "";
    const targetSelector = resolveTeamMemberSelectorFromPayload(payload, {
      pathKeys: ["target_member_path", "targetMemberPath"],
      routeKeyKeys: ["target_member_route_key", "targetMemberRouteKey"],
      nameKeys: ["target_member_name", "target_agent_name", "targetMemberName", "targetAgentName"],
    });

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

    const result = await teamRun.postMessage(userMessage, targetSelector);
    if (!result.accepted) {
      logger.warn(
        `SEND_MESSAGE rejected for team run ${teamRunId}: [${result.code ?? "UNKNOWN"}] ${result.message ?? "no message"}`,
      );
      return;
    }
    await this.teamRunService.recordRunActivity(teamRun, {
      summary: content,
      lastKnownStatus: "ACTIVE",
      lastActivityAt: new Date().toISOString(),
    });
  }

  private async handleStopGeneration(teamRunId: string): Promise<void> {
    const activeRun = this.resolveCommandRun(teamRunId);
    if (!activeRun) {
      logger.warn(`STOP_GENERATION rejected for team run ${teamRunId}: active run not found.`);
      return;
    }

    const result = await activeRun.interrupt();
    if (!result.accepted) {
      logger.warn(
        `STOP_GENERATION rejected for team run ${teamRunId}: [${result.code ?? "UNKNOWN"}] ${result.message ?? "no message"}`,
      );
    }
  }

  private async handleToolApproval(
    teamRunId: string,
    payload: Record<string, unknown>,
    approved: boolean,
  ): Promise<void> {
    const invocationId = payload.invocation_id;
    if (typeof invocationId !== "string" || invocationId.length === 0) {
      logger.warn("Team tool approval missing invocation_id");
      return;
    }

    const activeRun = this.resolveCommandRun(teamRunId);
    if (!activeRun) {
      logger.warn(`TOOL_APPROVAL rejected for team run ${teamRunId}: active run not found.`);
      return;
    }

    const approvalTargetRunId =
      typeof payload.agent_id === "string" && payload.agent_id ? payload.agent_id : null;
    const reason = typeof payload.reason === "string" ? payload.reason : null;
    const approvalTarget =
      resolveTeamMemberSelectorFromPayload(payload, {
        pathKeys: ["source_path", "member_path", "target_member_path", "sourcePath", "memberPath", "targetMemberPath"],
        routeKeyKeys: ["source_route_key", "member_route_key", "target_member_route_key", "sourceRouteKey", "memberRouteKey", "targetMemberRouteKey"],
        nameKeys: ["agent_name", "target_member_name", "target_agent_name", "member_name", "agentName", "targetMemberName"],
      }) ?? this.resolveApprovalTargetSelector(activeRun, approvalTargetRunId);

    if (!approvalTarget) {
      logger.warn(`TOOL_APPROVAL rejected for team run ${teamRunId}: approval target missing.`);
      return;
    }

    const result = await activeRun.approveToolInvocation(
      approvalTarget,
      invocationId,
      approved,
      reason,
    );
    if (!result.accepted) {
      logger.warn(
        `TOOL_APPROVAL rejected for team run ${teamRunId}: [${result.code ?? "UNKNOWN"}] ${result.message ?? "no message"}`,
      );
    }
  }

  private resolveApprovalTargetSelector(
    teamRun: TeamRun,
    memberRunId: string | null,
  ): TeamMemberSelector | null {
    if (typeof memberRunId !== "string" || memberRunId.trim().length === 0) {
      return null;
    }
    const runtimeMember = resolveRuntimeMemberContext(teamRun.context, memberRunId);
    if (runtimeMember?.memberPath?.length) {
      return selectorFromMemberPath(runtimeMember.memberPath);
    }
    if (runtimeMember?.memberName?.trim()) {
      return selectorFromMemberName(runtimeMember.memberName.trim());
    }

    const configuredMember = teamRun.config?.memberConfigs.find(
      (candidate) => candidate.memberRunId === memberRunId,
    );
    if (configuredMember?.memberPath?.length) {
      return selectorFromMemberPath(configuredMember.memberPath);
    }
    return configuredMember?.memberName?.trim()
      ? selectorFromMemberName(configuredMember.memberName.trim())
      : null;
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

  private closeWithTeamNotFound(connection: WebSocketConnection, teamRunId: string): void {
    const errorMsg = createErrorMessage("TEAM_NOT_FOUND", `Team run '${teamRunId}' not found`);
    connection.send(errorMsg.toJson());
    connection.close(4004);
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
    const sourceRouteKey = getTeamRunEventSourceRouteKey(event);
    const sourcePath = Array.isArray(event.sourcePath) ? event.sourcePath : [];
    const sourcePayload = {
      source_path: sourcePath,
      ...(sourceRouteKey ? { source_route_key: sourceRouteKey } : {}),
      ...(event.subTeamNodeName ? { sub_team_node_name: event.subTeamNodeName } : {}),
    };
    if (event.eventSourceType === TeamRunEventSourceType.AGENT) {
      const payload = event.data as TeamRunAgentEventPayload;
      const message = this.agentRunEventMessageMapper.map(payload.agentEvent);
      const basePayload =
        message.payload && typeof message.payload === "object" ? message.payload : {};
      return new ServerMessage(message.type, {
        ...basePayload,
        agent_name: payload.memberName,
        agent_id: payload.memberRunId,
        member_route_key: payload.memberRouteKey,
        member_path: payload.memberPath,
        ...sourcePayload,
      });
    }

    if (event.eventSourceType === TeamRunEventSourceType.TEAM) {
      return new ServerMessage(
        ServerMessageType.TEAM_STATUS,
        {
          ...serializePayload(event.data as TeamRunStatusUpdateData),
          ...sourcePayload,
        },
      );
    }

    if (event.eventSourceType === TeamRunEventSourceType.TASK_PLAN) {
      const payload = serializePayload(event.data as TeamRunTaskPlanEventPayload);
      let eventType = "TASK_PLAN_EVENT";
      if (Array.isArray(payload.tasks)) {
        eventType = "TASKS_CREATED";
      } else if (typeof payload.task_id === "string") {
        eventType = "TASK_STATUS_UPDATED";
      }
      return new ServerMessage(ServerMessageType.TASK_PLAN_EVENT, {
        event_type: eventType,
        ...payload,
        ...sourcePayload,
      });
    }

    if (event.eventSourceType === TeamRunEventSourceType.COMMUNICATION) {
      return new ServerMessage(ServerMessageType.TEAM_COMMUNICATION_MESSAGE, {
        ...buildTeamCommunicationMessagePayload(event.data as TeamRunCommunicationEventPayload),
        ...sourcePayload,
      });
    }

    if (event.eventSourceType === TeamRunEventSourceType.MEMBER_INPUT) {
      return new ServerMessage(ServerMessageType.EXTERNAL_USER_MESSAGE, {
        ...buildTeamMemberInputMessagePayload({
          eventPayload: event.data as TeamRunMemberInputEventPayload,
          sourceRouteKey,
          sourcePath,
        }),
        ...sourcePayload,
      });
    }

    return createErrorMessage("UNKNOWN_TEAM_EVENT", "Unmapped team event");
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
