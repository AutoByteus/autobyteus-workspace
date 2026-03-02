import { randomUUID } from "node:crypto";
import {
  AgentInputUserMessage,
  ContextFile,
  ContextFileType,
  AgentTeamEventStream,
  AgentTeamStreamEvent,
  AgentEventRebroadcastPayload,
  AgentTeamStatusUpdateData,
  SubTeamEventRebroadcastPayload,
  type TaskPlanEventPayload,
} from "autobyteus-ts";
import { AgentTeamRunManager } from "../../agent-team-execution/services/agent-team-run-manager.js";
import {
  TeamRuntimeRoutingError,
  getTeamMemberRuntimeOrchestrator,
  type TeamMemberRuntimeOrchestrator,
} from "../../agent-team-execution/services/team-member-runtime-orchestrator.js";
import {
  getRuntimeCommandIngressService,
  type RuntimeCommandIngressService,
} from "../../runtime-execution/runtime-command-ingress-service.js";
import type { ApprovalTargetSource } from "../../runtime-execution/runtime-adapter-port.js";
import {
  getTeamExternalRuntimeEventBridge,
  type TeamExternalRuntimeEventBridge,
} from "./team-external-runtime-event-bridge.js";
import { AgentSession } from "./agent-session.js";
import { AgentSessionManager } from "./agent-session-manager.js";
import { getAgentStreamHandler } from "./agent-stream-handler.js";
import {
  ClientMessageType,
  createErrorMessage,
  ServerMessage,
  ServerMessageType,
} from "./models.js";
import { serializePayload } from "./payload-serialization.js";

export type WebSocketConnection = {
  send: (data: string) => void;
  close: (code?: number) => void;
};

type ClientMessage = {
  type?: string;
  payload?: Record<string, unknown>;
};

type TeamLike = Record<string, unknown>;

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

class AgentTeamSession extends AgentSession {
  get teamRunId(): string {
    return this.runId;
  }
}

export class AgentTeamStreamHandler {
  private sessionManager: AgentSessionManager;
  private teamManager: AgentTeamRunManager;
  private commandIngressService: RuntimeCommandIngressService;
  private teamMemberRuntimeOrchestrator: TeamMemberRuntimeOrchestrator;
  private teamExternalRuntimeEventBridge: TeamExternalRuntimeEventBridge;
  private activeTasks = new Map<string, Promise<void>>();
  private eventStreams = new Map<string, AgentTeamEventStream>();
  private externalRuntimeBridgeUnsubscribers = new Map<string, () => Promise<void>>();
  private connections = new Map<string, WebSocketConnection>();
  private sessionMode = new Map<string, "autobyteus_team" | "external_member_runtime">();

  constructor(
    sessionManager: AgentSessionManager = new AgentSessionManager(AgentTeamSession),
    teamManager: AgentTeamRunManager = AgentTeamRunManager.getInstance(),
    commandIngressService: RuntimeCommandIngressService = getRuntimeCommandIngressService(),
    teamMemberRuntimeOrchestrator: TeamMemberRuntimeOrchestrator = getTeamMemberRuntimeOrchestrator(),
    teamExternalRuntimeEventBridge: TeamExternalRuntimeEventBridge =
      getTeamExternalRuntimeEventBridge(),
  ) {
    this.sessionManager = sessionManager;
    this.teamManager = teamManager;
    this.commandIngressService = commandIngressService;
    this.teamMemberRuntimeOrchestrator = teamMemberRuntimeOrchestrator;
    this.teamExternalRuntimeEventBridge = teamExternalRuntimeEventBridge;
  }

  async connect(connection: WebSocketConnection, teamRunId: string): Promise<string | null> {
    const runtimeMode = this.teamMemberRuntimeOrchestrator.getTeamRuntimeMode(teamRunId);
    const team = this.teamManager.getTeamRun(teamRunId) as TeamLike | null;
    if (!team && runtimeMode !== "external_member_runtime") {
      const errorMsg = createErrorMessage("TEAM_NOT_FOUND", `Team run '${teamRunId}' not found`);
      connection.send(errorMsg.toJson());
      connection.close(4004);
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

    this.connections.set(sessionId, connection);

    if (runtimeMode === "external_member_runtime") {
      this.registerExternalRuntimeBridgeSubscription(sessionId, teamRunId, connection);
      this.sessionMode.set(sessionId, "external_member_runtime");
    } else {
      const eventStream = this.teamManager.getTeamEventStream(teamRunId);
      if (!eventStream) {
        const errorMsg = createErrorMessage(
          "TEAM_STREAM_UNAVAILABLE",
          `Team run '${teamRunId}' stream not available`,
        );
        connection.send(errorMsg.toJson());
        connection.close(1011);
        return null;
      }
      this.eventStreams.set(sessionId, eventStream);
      this.sessionMode.set(sessionId, "autobyteus_team");

      const task = this.streamLoop(connection, teamRunId, sessionId);
      this.activeTasks.set(sessionId, task);
    }

    const connectedMsg = new ServerMessage(ServerMessageType.CONNECTED, {
      team_id: teamRunId,
      session_id: sessionId,
    });
    connection.send(connectedMsg.toJson());

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
      const teamRuntimeMode = this.sessionMode.get(sessionId) ?? "autobyteus_team";

      if (msgType === ClientMessageType.SEND_MESSAGE) {
        await this.handleSendMessage(teamRunId, payload, teamRuntimeMode);
      } else if (msgType === ClientMessageType.STOP_GENERATION) {
        await this.handleStopGeneration(teamRunId, teamRuntimeMode);
      } else if (msgType === ClientMessageType.APPROVE_TOOL) {
        await this.handleToolApproval(teamRunId, payload, true, teamRuntimeMode);
      } else if (msgType === ClientMessageType.DENY_TOOL) {
        await this.handleToolApproval(teamRunId, payload, false, teamRuntimeMode);
      } else {
        logger.warn(`Unknown message type: ${String(msgType)}`);
      }
    } catch (error) {
      logger.error(`Error handling team message for ${sessionId}: ${String(error)}`);
    }
  }

  async disconnect(sessionId: string): Promise<void> {
    const task = this.activeTasks.get(sessionId);
    this.activeTasks.delete(sessionId);
    this.sessionMode.delete(sessionId);
    this.connections.delete(sessionId);

    const stream = this.eventStreams.get(sessionId);
    this.eventStreams.delete(sessionId);
    if (stream) {
      await stream.close();
    }

    const externalRuntimeUnsubscribe = this.externalRuntimeBridgeUnsubscribers.get(sessionId);
    this.externalRuntimeBridgeUnsubscribers.delete(sessionId);
    if (externalRuntimeUnsubscribe) {
      await externalRuntimeUnsubscribe();
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

  private async streamLoop(connection: WebSocketConnection, teamRunId: string, sessionId: string): Promise<void> {
    void teamRunId;
    try {
      const eventStream = this.eventStreams.get(sessionId);
      if (!eventStream) {
        logger.error(`No event stream for team session ${sessionId}`);
        return;
      }

      for await (const event of eventStream.allEvents()) {
        try {
          const wsMessage = this.convertTeamEvent(event);
          connection.send(wsMessage.toJson());
        } catch (error) {
          logger.error(`Error sending team event to WebSocket: ${String(error)}`);
        }
      }
    } catch (error) {
      logger.error(`Error in team stream loop for ${sessionId}: ${String(error)}`);
    } finally {
      const stream = this.eventStreams.get(sessionId);
      if (stream) {
        await stream.close();
        this.eventStreams.delete(sessionId);
      }
    }
  }

  private async handleSendMessage(
    teamRunId: string,
    payload: Record<string, unknown>,
    mode: "autobyteus_team" | "external_member_runtime",
  ): Promise<void> {
    const content = typeof payload.content === "string" ? payload.content : "";
    const targetMemberName =
      (typeof payload.target_member_name === "string" && payload.target_member_name) ||
      (typeof payload.target_agent_name === "string" && payload.target_agent_name) ||
      null;

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
    const userMessage = AgentInputUserMessage.fromDict({
      content,
      context_files: contextPayload.length > 0 ? contextPayload : null,
    });

    if (mode === "external_member_runtime") {
      try {
        await this.teamMemberRuntimeOrchestrator.sendToMember(teamRunId, targetMemberName, userMessage);
        await this.refreshExternalRuntimeBridgeSubscriptions(teamRunId);
      } catch (error) {
        if (error instanceof TeamRuntimeRoutingError) {
          logger.warn(
            `SEND_MESSAGE rejected for external runtime team run ${teamRunId}: [${error.code}] ${error.message}`,
          );
          return;
        }
        throw error;
      }
      return;
    }

    const result = await this.commandIngressService.sendTurn({
      runId: teamRunId,
      mode: "team",
      message: userMessage,
      targetMemberName,
    });
    if (!result.accepted) {
      logger.warn(
        `SEND_MESSAGE rejected for team run ${teamRunId}: [${result.code ?? "UNKNOWN"}] ${result.message ?? "no message"}`,
      );
    }
  }

  private async handleStopGeneration(
    teamRunId: string,
    mode: "autobyteus_team" | "external_member_runtime",
  ): Promise<void> {
    if (mode === "external_member_runtime") {
      const bindings = this.teamMemberRuntimeOrchestrator.getTeamBindings(teamRunId);
      for (const binding of bindings) {
        const result = await this.commandIngressService.interruptRun({
          runId: binding.memberRunId,
          mode: "agent",
          turnId: null,
        });
        if (!result.accepted) {
          logger.warn(
            `STOP_GENERATION rejected for external member run ${binding.memberRunId}: [${result.code ?? "UNKNOWN"}] ${result.message ?? "no message"}`,
          );
        }
      }
      return;
    }

    const result = await this.commandIngressService.interruptRun({
      runId: teamRunId,
      mode: "team",
      turnId: null,
    });
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
    mode: "autobyteus_team" | "external_member_runtime",
  ): Promise<void> {
    const invocationId = payload.invocation_id;
    if (typeof invocationId !== "string" || invocationId.length === 0) {
      logger.warn("Team tool approval missing invocation_id");
      return;
    }

    const approvalTargetCandidate =
      (typeof payload.agent_name === "string" && payload.agent_name) ||
      (typeof payload.target_member_name === "string" && payload.target_member_name) ||
      (typeof payload.agent_id === "string" && payload.agent_id) ||
      null;
    let approvalTargetSource: ApprovalTargetSource | null = null;
    if (typeof payload.agent_name === "string" && payload.agent_name) {
      approvalTargetSource = "agent_name";
    } else if (
      typeof payload.target_member_name === "string" &&
      payload.target_member_name
    ) {
      approvalTargetSource = "target_member_name";
    } else if (typeof payload.agent_id === "string" && payload.agent_id) {
      approvalTargetSource = "agent_id";
    }

    const reason = typeof payload.reason === "string" ? payload.reason : null;
    if (mode === "external_member_runtime") {
      try {
        await this.teamMemberRuntimeOrchestrator.approveForMember(
          teamRunId,
          approvalTargetCandidate,
          invocationId,
          approved,
          reason,
        );
      } catch (error) {
        if (error instanceof TeamRuntimeRoutingError) {
          logger.warn(
            `TOOL_APPROVAL rejected for external runtime team run ${teamRunId}: [${error.code}] ${error.message}`,
          );
          return;
        }
        throw error;
      }
      return;
    }

    const result = await this.commandIngressService.approveTool({
      runId: teamRunId,
      mode: "team",
      invocationId,
      approved,
      reason,
      approvalTarget: approvalTargetCandidate,
      approvalTargetSource,
    });
    if (!result.accepted) {
      logger.warn(
        `TOOL_APPROVAL rejected for team run ${teamRunId}: [${result.code ?? "UNKNOWN"}] ${result.message ?? "no message"}`,
      );
    }
  }

  convertTeamEvent(event: AgentTeamStreamEvent): ServerMessage {
    const sourceType = event.event_source_type;

    if (sourceType === "AGENT" && event.data instanceof AgentEventRebroadcastPayload) {
      const agentEvent = event.data.agent_event;
      const message = getAgentStreamHandler().convertStreamEvent(agentEvent);
      const basePayload =
        message.payload && typeof message.payload === "object" ? message.payload : {};
      return new ServerMessage(message.type, {
        ...basePayload,
        agent_name: event.data.agent_name,
        ...(agentEvent.agent_id ? { agent_id: agentEvent.agent_id } : {}),
      });
    }

    if (sourceType === "TEAM" && event.data instanceof AgentTeamStatusUpdateData) {
      return new ServerMessage(ServerMessageType.TEAM_STATUS, serializePayload(event.data));
    }

    if (sourceType === "TASK_PLAN") {
      const payload = serializePayload(event.data as TaskPlanEventPayload);
      let eventType = "TASK_PLAN_EVENT";
      if (Array.isArray(payload.tasks)) {
        eventType = "TASKS_CREATED";
      } else if (typeof payload.task_id === "string") {
        eventType = "TASK_STATUS_UPDATED";
      }
      return new ServerMessage(ServerMessageType.TASK_PLAN_EVENT, {
        event_type: eventType,
        ...payload,
      });
    }

    if (sourceType === "SUB_TEAM" && event.data instanceof SubTeamEventRebroadcastPayload) {
      const subTeamEvent = event.data.sub_team_event;
      if (subTeamEvent instanceof AgentTeamStreamEvent) {
        const message = this.convertTeamEvent(subTeamEvent);
        const basePayload =
          message.payload && typeof message.payload === "object" ? message.payload : {};
        return new ServerMessage(message.type, {
          ...basePayload,
          sub_team_node_name: event.data.sub_team_node_name,
        });
      }
    }

    return createErrorMessage("UNKNOWN_TEAM_EVENT", `Unmapped team event source: ${String(sourceType)}`);
  }

  private registerExternalRuntimeBridgeSubscription(
    sessionId: string,
    teamRunId: string,
    connection: WebSocketConnection,
  ): void {
    const unsubscribe = this.teamExternalRuntimeEventBridge.subscribeTeam(
      teamRunId,
      (message) => {
        try {
          connection.send(message.toJson());
        } catch (error) {
          logger.error(`Error sending external runtime team event to WebSocket: ${String(error)}`);
        }
      },
    );
    this.externalRuntimeBridgeUnsubscribers.set(sessionId, unsubscribe);
  }

  private async refreshExternalRuntimeBridgeSubscriptions(teamRunId: string): Promise<void> {
    const sessions = this.sessionManager.getSessionsForRun(teamRunId);
    for (const session of sessions) {
      if (this.sessionMode.get(session.sessionId) !== "external_member_runtime") {
        continue;
      }

      const connection = this.connections.get(session.sessionId);
      if (!connection) {
        continue;
      }

      const previousUnsubscribe = this.externalRuntimeBridgeUnsubscribers.get(session.sessionId);
      if (previousUnsubscribe) {
        this.externalRuntimeBridgeUnsubscribers.delete(session.sessionId);
        try {
          await previousUnsubscribe();
        } catch {
          // best effort cleanup
        }
      }

      this.registerExternalRuntimeBridgeSubscription(session.sessionId, teamRunId, connection);
    }
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
      AgentTeamRunManager.getInstance(),
      getRuntimeCommandIngressService(),
    );
  }
  return cachedAgentTeamStreamHandler;
};
