import { randomUUID } from "node:crypto";
import {
  AgentInputUserMessage,
  ContextFile,
  ContextFileType,
} from "autobyteus-ts";
import { isAgentRunEvent, type AgentRunEvent } from "../../agent-execution/domain/agent-run-event.js";
import { AgentRun } from "../../agent-execution/domain/agent-run.js";
import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import {
  AgentRunService,
  getAgentRunService,
} from "../../agent-execution/services/agent-run-service.js";
import { AgentSessionManager } from "./agent-session-manager.js";
import {
  AgentStreamBroadcaster,
  getAgentStreamBroadcaster,
} from "./agent-stream-broadcaster.js";
import {
  AgentRunEventMessageMapper,
  getAgentRunEventMessageMapper,
} from "./agent-run-event-message-mapper.js";
import {
  ClientMessageType,
  createConnectedMessage,
  ServerMessage,
  ServerMessageType,
  createErrorMessage,
} from "./models.js";

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

const isRuntimeRawEventDebugEnabled = process.env.RUNTIME_RAW_EVENT_DEBUG === "1";
const runtimeRawEventMaxChars = Number.isFinite(Number(process.env.RUNTIME_RAW_EVENT_MAX_CHARS))
  ? Math.max(512, Number(process.env.RUNTIME_RAW_EVENT_MAX_CHARS))
  : 20_000;

const truncateForDebug = (value: string): string =>
  value.length <= runtimeRawEventMaxChars ? value : `${value.slice(0, runtimeRawEventMaxChars)}...<truncated>`;

const stringifyForDebug = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable-runtime-event]";
  }
};

export class AgentStreamHandler {
  private sessionManager: AgentSessionManager;
  private agentManager: AgentRunManager;
  private eventMessageMapper: AgentRunEventMessageMapper;
  private activeRunUnsubscribers = new Map<string, () => void>();
  private sessionConnections = new Map<string, WebSocketConnection>();
  private subscribedRunsBySessionId = new Map<
    string,
    AgentRun
  >();
  private agentRunService: AgentRunService;
  private runtimeEventSequence = 0;
  private broadcaster: AgentStreamBroadcaster;

  constructor(
    sessionManager: AgentSessionManager = new AgentSessionManager(),
    agentManager: AgentRunManager = AgentRunManager.getInstance(),
    eventMessageMapper: AgentRunEventMessageMapper = getAgentRunEventMessageMapper(),
    broadcaster: AgentStreamBroadcaster = getAgentStreamBroadcaster(),
    agentRunService: AgentRunService = getAgentRunService(),
  ) {
    this.sessionManager = sessionManager;
    this.agentManager = agentManager;
    this.eventMessageMapper = eventMessageMapper;
    this.broadcaster = broadcaster;
    this.agentRunService = agentRunService;
  }

  async connect(connection: WebSocketConnection, agentRunId: string): Promise<string | null> {
    const activeRun = this.agentManager.getActiveRun(agentRunId);
    if (!activeRun) {
      const errorMsg = createErrorMessage("AGENT_NOT_FOUND", `Agent run '${agentRunId}' not found`);
      connection.send(errorMsg.toJson());
      connection.close(4004);
      return null;
    }

    const sessionId = randomUUID();
    try {
      const session = this.sessionManager.createSession(sessionId, agentRunId);
      session.connect();
    } catch (error) {
      logger.error(`Failed to create session: ${String(error)}`);
      const errorMsg = createErrorMessage("SESSION_ERROR", String(error));
      connection.send(errorMsg.toJson());
      connection.close(1011);
      return null;
    }

    const connectedMsg = createConnectedMessage(agentRunId, sessionId);
    this.broadcaster.registerConnection(sessionId, agentRunId, connection);
    this.sessionConnections.set(sessionId, connection);
    connection.send(connectedMsg.toJson());
    const currentStatus = activeRun.getStatus();
    if (currentStatus) {
      connection.send(
        new ServerMessage(ServerMessageType.AGENT_STATUS, {
          new_status: currentStatus.trim().toUpperCase(),
          old_status: null,
        }).toJson(),
      );
    }

    if (!this.bindSessionToRun(sessionId, agentRunId, connection)) {
      this.sessionConnections.delete(sessionId);
      this.broadcaster.unregisterConnection(sessionId);
      this.sessionManager.closeSession(sessionId);
      const errorMsg = createErrorMessage(
        "AGENT_STREAM_UNAVAILABLE",
        `Agent run '${agentRunId}' stream not available`,
      );
      connection.send(errorMsg.toJson());
      connection.close(1011);
      return null;
    }

    logger.info(`Agent WebSocket connected: session=${sessionId}, run=${agentRunId}`);
    return sessionId;
  }

  async handleMessage(sessionId: string, message: string): Promise<void> {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      logger.warn(`Message for unknown session: ${sessionId}`);
      return;
    }

    try {
      const data = AgentStreamHandler.parseMessage(message);
      const msgType = data.type;
      const payload = data.payload ?? {};
      const agentRunId = session.runId;
      if (!this.ensureSessionSubscription(sessionId, agentRunId)) {
        logger.warn(
          `Agent websocket session '${sessionId}' lost its run subscription for run '${agentRunId}'.`,
        );
        return;
      }

      if (msgType === ClientMessageType.SEND_MESSAGE) {
        await this.handleSendMessage(agentRunId, payload);
      } else if (msgType === ClientMessageType.STOP_GENERATION) {
        await this.handleStopGeneration(agentRunId);
      } else if (msgType === ClientMessageType.APPROVE_TOOL) {
        await this.handleToolApproval(agentRunId, payload, true);
      } else if (msgType === ClientMessageType.DENY_TOOL) {
        await this.handleToolApproval(agentRunId, payload, false);
      } else {
        logger.warn(`Unknown message type: ${String(msgType)}`);
      }
    } catch (error) {
      logger.error(`Error handling message for ${sessionId}: ${String(error)}`);
    }
  }

  async disconnect(sessionId: string): Promise<void> {
    this.broadcaster.unregisterConnection(sessionId);

    const runUnsubscribe = this.activeRunUnsubscribers.get(sessionId);
    if (runUnsubscribe) {
      this.activeRunUnsubscribers.delete(sessionId);
      runUnsubscribe();
    }
    this.sessionConnections.delete(sessionId);
    this.subscribedRunsBySessionId.delete(sessionId);

    this.sessionManager.closeSession(sessionId);

    logger.info(`Agent WebSocket disconnected: ${sessionId}`);
  }

  private ensureSessionSubscription(sessionId: string, runId: string): boolean {
    const connection = this.sessionConnections.get(sessionId);
    if (!connection) {
      return false;
    }
    return this.bindSessionToRun(sessionId, runId, connection);
  }

  private bindSessionToRun(
    sessionId: string,
    runId: string,
    connection: WebSocketConnection,
  ): boolean {
    const activeRun = this.agentManager.getActiveRun(runId);
    if (!activeRun) {
      return false;
    }

    const subscribedRun = this.subscribedRunsBySessionId.get(sessionId);
    if (subscribedRun === activeRun) {
      return true;
    }

    const existingUnsubscribe = this.activeRunUnsubscribers.get(sessionId);
    existingUnsubscribe?.();
    this.activeRunUnsubscribers.delete(sessionId);

    this.startRunEventLoop(connection, activeRun, sessionId);
    this.subscribedRunsBySessionId.set(sessionId, activeRun);
    return true;
  }

  private startRunEventLoop(
    connection: WebSocketConnection,
    activeRun: AgentRun,
    sessionId: string,
  ): void {
    const unsubscribe = activeRun.subscribeToEvents((event: unknown) => {
      if (!isAgentRunEvent(event)) {
        return;
      }
      void this.forwardRunEvent(connection, activeRun.runId, event);
    });
    this.activeRunUnsubscribers.set(sessionId, unsubscribe);
  }

  private async forwardRunEvent(
    connection: WebSocketConnection,
    runId: string,
    event: AgentRunEvent,
  ): Promise<void> {
    try {
      if (isRuntimeRawEventDebugEnabled) {
        this.runtimeEventSequence += 1;
        const payload = event.payload;
        console.log("[RuntimeEvent]", {
          sequence: this.runtimeEventSequence,
          runId,
          eventType: event.eventType,
          statusHint: event.statusHint,
          payloadKeys: Object.keys(payload),
          rawEventJson: truncateForDebug(stringifyForDebug(event)),
        });
      }

      const message = this.eventMessageMapper.map(event);
      if (isRuntimeRawEventDebugEnabled) {
        console.log("[RuntimeMappedMessage]", {
          sequence: this.runtimeEventSequence,
          runId,
          messageType: message.type,
          payloadId:
            typeof message.payload?.id === "string" ? message.payload.id : null,
          segmentType:
            typeof message.payload?.segment_type === "string"
              ? message.payload.segment_type
              : null,
          eventType: event.eventType,
        });
      }
      connection.send(message.toJson());
    } catch (error) {
      logger.error(`Error forwarding runtime event: ${String(error)}`);
    }
  }

  private async handleSendMessage(agentRunId: string, payload: Record<string, unknown>): Promise<void> {
    const content = typeof payload.content === "string" ? payload.content : "";
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

    const activeRun = this.agentManager.getActiveRun(agentRunId);
    if (!activeRun) {
      logger.warn(`SEND_MESSAGE rejected for missing agent run ${agentRunId}.`);
      return;
    }
    const result = await activeRun.postUserMessage(userMessage);
    if (!result.accepted) {
      logger.warn(
        `SEND_MESSAGE rejected for agent run ${agentRunId}: [${result.code ?? "UNKNOWN"}] ${result.message ?? "no message"}`,
      );
      return;
    }
    await this.agentRunService.recordRunActivity(activeRun, {
      summary: content,
      lastKnownStatus: "ACTIVE",
      lastActivityAt: new Date().toISOString(),
    });
  }

  private async handleStopGeneration(agentRunId: string): Promise<void> {
    const activeRun = this.agentManager.getActiveRun(agentRunId);
    if (!activeRun) {
      logger.warn(`STOP_GENERATION rejected for missing agent run ${agentRunId}.`);
      return;
    }
    const result = await activeRun.interrupt(null);
    if (!result.accepted) {
      logger.warn(
        `STOP_GENERATION rejected for agent run ${agentRunId}: [${result.code ?? "UNKNOWN"}] ${result.message ?? "no message"}`,
      );
    }
  }

  private async handleToolApproval(
    agentRunId: string,
    payload: Record<string, unknown>,
    approved: boolean,
  ): Promise<void> {
    const invocationId = payload.invocation_id;
    if (typeof invocationId !== "string" || invocationId.length === 0) {
      logger.warn("Tool approval missing invocation_id");
      return;
    }

    const reason = typeof payload.reason === "string" ? payload.reason : null;
    const activeRun = this.agentManager.getActiveRun(agentRunId);
    if (!activeRun) {
      logger.warn(`TOOL_APPROVAL rejected for missing agent run ${agentRunId}.`);
      return;
    }
    const result = await activeRun.approveToolInvocation(invocationId, approved, reason);
    if (!result.accepted) {
      logger.warn(
        `TOOL_APPROVAL rejected for agent run ${agentRunId}: [${result.code ?? "UNKNOWN"}] ${result.message ?? "no message"}`,
      );
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

let cachedAgentStreamHandler: AgentStreamHandler | null = null;

export const getAgentStreamHandler = (): AgentStreamHandler => {
  if (!cachedAgentStreamHandler) {
    cachedAgentStreamHandler = new AgentStreamHandler(
      new AgentSessionManager(),
      AgentRunManager.getInstance(),
      getAgentRunEventMessageMapper(),
      getAgentStreamBroadcaster(),
      getAgentRunService(),
    );
  }
  return cachedAgentStreamHandler;
};
