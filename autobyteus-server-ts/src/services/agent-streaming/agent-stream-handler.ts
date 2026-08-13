import { randomUUID } from "node:crypto";
import {
  AgentInputUserMessage,
  ContextFile,
  ContextFileType,
} from "autobyteus-ts";
import { isAgentRunEvent, type AgentRunEvent } from "../../agent-execution/domain/agent-run-event.js";
import { AgentRun } from "../../agent-execution/domain/agent-run.js";
import {
  AgentRunService,
  getAgentRunService,
} from "../../agent-execution/services/agent-run-service.js";
import {
  AgentRunCommandCoordinator,
  getAgentRunCommandCoordinator,
} from "../../agent-execution/services/agent-run-command-coordinator.js";
import {
  AgentRunStatusProjectionService,
  getAgentRunStatusProjectionService,
} from "../../agent-execution/services/agent-run-status-projection-service.js";
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
import {
  buildInterruptGenerationCommandAck,
  normalizeInterruptCommandId,
} from "./interrupt-generation-command-ack.js";
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
  private eventMessageMapper: AgentRunEventMessageMapper;
  private activeRunUnsubscribers = new Map<string, () => void>();
  private sessionEgresses = new Map<string, AgentStreamWebSocketEgress>();
  private subscribedRunsBySessionId = new Map<
    string,
    AgentRun
  >();
  private agentRunService: AgentRunService;
  private commandCoordinator: AgentRunCommandCoordinator;
  private statusProjectionService: AgentRunStatusProjectionService;
  private runtimeEventSequence = 0;
  private broadcaster: AgentStreamBroadcaster;

  constructor(
    sessionManager: AgentSessionManager = new AgentSessionManager(),
    agentRunService: AgentRunService = getAgentRunService(),
    eventMessageMapper: AgentRunEventMessageMapper = getAgentRunEventMessageMapper(),
    broadcaster: AgentStreamBroadcaster = getAgentStreamBroadcaster(),
    commandCoordinator: AgentRunCommandCoordinator = getAgentRunCommandCoordinator(),
    statusProjectionService: AgentRunStatusProjectionService = getAgentRunStatusProjectionService(),
  ) {
    this.sessionManager = sessionManager;
    this.agentRunService = agentRunService;
    this.eventMessageMapper = eventMessageMapper;
    this.broadcaster = broadcaster;
    this.commandCoordinator = commandCoordinator;
    this.statusProjectionService = statusProjectionService;
  }

  async connect(connection: WebSocketConnection, agentRunId: string): Promise<string | null> {
    const projection = await this.statusProjectionService.getRunStatusProjection(agentRunId);
    if (projection.statusSource === "MISSING") {
      this.closeWithAgentNotFound(connection, agentRunId);
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

    const egress = new AgentStreamWebSocketEgress({
      sendRaw: (payload) => connection.send(payload),
      onSendError: (error) => logger.error(
        `Agent WebSocket egress failed: session=${sessionId}, run=${agentRunId}: ${String(error)}`,
      ),
    });
    const connectedMsg = createConnectedMessage(agentRunId, sessionId);
    this.broadcaster.registerConnection(sessionId, agentRunId, egress);
    this.sessionEgresses.set(sessionId, egress);

    const activeRun = this.getActiveRun(agentRunId);
    if (activeRun && !this.bindSessionToRun(sessionId, activeRun, egress)) {
      this.sessionEgresses.delete(sessionId);
      this.broadcaster.unregisterConnection(sessionId);
      this.sessionManager.closeSession(sessionId);
      const errorMsg = createErrorMessage(
        "AGENT_STREAM_UNAVAILABLE",
        `Agent run '${agentRunId}' stream not available`,
      );
      egress.send(errorMsg);
      egress.dispose();
      connection.close(1011);
      return null;
    }

    egress.send(connectedMsg);
    egress.send(
      new ServerMessage(
        ServerMessageType.AGENT_STATUS,
        activeRun?.getStatusSnapshot() ?? projection.statusPayload,
      ),
    );

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

      if (msgType === ClientMessageType.SEND_MESSAGE) {
        await this.handleSendMessage(sessionId, agentRunId, payload);
        return;
      }

      const egress = this.sessionEgresses.get(sessionId) ?? null;
      if (msgType === ClientMessageType.INTERRUPT_GENERATION) {
        await this.handleInterruptGeneration(agentRunId, payload, egress);
        return;
      }

      if (!this.ensureActiveSessionSubscription(sessionId, agentRunId)) {
        logger.warn(
          `Agent websocket session '${sessionId}' lost its active run subscription for run '${agentRunId}'.`,
        );
        return;
      }

      if (msgType === ClientMessageType.APPROVE_TOOL) {
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
    this.sessionEgresses.get(sessionId)?.dispose();
    this.sessionEgresses.delete(sessionId);
    this.subscribedRunsBySessionId.delete(sessionId);

    this.sessionManager.closeSession(sessionId);

    logger.info(`Agent WebSocket disconnected: ${sessionId}`);
  }

  private ensureActiveSessionSubscription(sessionId: string, runId: string): boolean {
    const egress = this.sessionEgresses.get(sessionId);
    if (!egress) {
      return false;
    }
    const activeRun = this.getActiveRun(runId);
    return !!activeRun && this.bindSessionToRun(sessionId, activeRun, egress);
  }

  private bindSessionToRun(
    sessionId: string,
    activeRun: AgentRun,
    egress: AgentStreamWebSocketEgress,
  ): boolean {
    const subscribedRun = this.subscribedRunsBySessionId.get(sessionId);
    if (subscribedRun === activeRun) {
      return true;
    }

    const existingUnsubscribe = this.activeRunUnsubscribers.get(sessionId);
    if (existingUnsubscribe) {
      egress.flush();
    }
    existingUnsubscribe?.();
    this.activeRunUnsubscribers.delete(sessionId);

    this.startRunEventLoop(egress, activeRun, sessionId);
    this.subscribedRunsBySessionId.set(sessionId, activeRun);
    return true;
  }

  private startRunEventLoop(
    sink: AgentStreamServerMessageSink,
    activeRun: AgentRun,
    sessionId: string,
  ): void {
    const unsubscribe = activeRun.subscribeToEvents((event: unknown) => {
      if (!isAgentRunEvent(event)) {
        return;
      }
      void this.forwardRunEvent(sink, activeRun.runId, event);
    });
    this.activeRunUnsubscribers.set(sessionId, unsubscribe);
  }

  private async forwardRunEvent(
    sink: AgentStreamServerMessageSink,
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
      sink.send(message);
    } catch (error) {
      logger.error(`Error forwarding runtime event: ${String(error)}`);
    }
  }

  private async handleSendMessage(
    sessionId: string,
    agentRunId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const egress = this.sessionEgresses.get(sessionId);
    if (!egress) {
      return;
    }

    const content = typeof payload.content === "string" ? payload.content : "";
    const messageId = typeof payload.message_id === "string" ? payload.message_id : "";
    const dedupeKey = typeof payload.dedupe_key === "string" ? payload.dedupe_key : "";
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

    const result = await this.commandCoordinator.postUserMessage({
      runId: agentRunId,
      messageId,
      dedupeKey,
      message: userMessage,
      summary: content,
      onActiveRunReady: (activeRun) => {
        this.bindSessionToRun(sessionId, activeRun, egress);
      },
    });
    egress.send(
      new ServerMessage(
        ServerMessageType.AGENT_COMMAND_ACK,
        result.ack,
      ),
    );
    if (!result.ack.accepted) {
      logger.warn(
        `SEND_MESSAGE command not accepted for agent run ${agentRunId}: [${result.ack.code ?? "UNKNOWN"}] ${result.ack.message ?? "no message"}`,
      );
    }
  }

  private async handleInterruptGeneration(
    agentRunId: string,
    payload: Record<string, unknown>,
    sink: AgentStreamServerMessageSink | null,
  ): Promise<void> {
    const activeRun = this.getActiveRun(agentRunId);
    const target = { target_kind: "standalone_run" as const, run_id: agentRunId };
    const commandId = normalizeInterruptCommandId(payload.command_id);
    if (!commandId) {
      sink?.send(new ServerMessage(
        ServerMessageType.AGENT_COMMAND_ACK,
        buildInterruptGenerationCommandAck({ commandId, target }),
      ));
      return;
    }
    if (!activeRun) {
      logger.warn(`INTERRUPT_GENERATION rejected for missing agent run ${agentRunId}.`);
      sink?.send(new ServerMessage(
        ServerMessageType.AGENT_COMMAND_ACK,
        buildInterruptGenerationCommandAck({
          commandId,
          target,
          validationFailure: {
            code: "RUN_NOT_FOUND",
            message: `Agent run '${agentRunId}' is not active.`,
          },
        }),
      ));
      return;
    }
    try {
      const result = await activeRun.interrupt(null);
      sink?.send(new ServerMessage(
        ServerMessageType.AGENT_COMMAND_ACK,
        buildInterruptGenerationCommandAck({ commandId, target, result }),
      ));
      if (!result.accepted) {
        logger.warn(
          `INTERRUPT_GENERATION rejected for agent run ${agentRunId}: [${result.code ?? "UNKNOWN"}] ${result.message ?? "no message"}`,
        );
      }
    } catch (error) {
      sink?.send(new ServerMessage(
        ServerMessageType.AGENT_COMMAND_ACK,
        buildInterruptGenerationCommandAck({
          commandId,
          target,
          executionError: error,
        }),
      ));
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
    const activeRun = this.getActiveRun(agentRunId);
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

  private getActiveRun(runId: string): AgentRun | null {
    return this.agentRunService.getAgentRun(runId);
  }


  private closeWithAgentNotFound(connection: WebSocketConnection, runId: string): void {
    const errorMsg = createErrorMessage("AGENT_NOT_FOUND", `Agent run '${runId}' not found`);
    connection.send(errorMsg.toJson());
    connection.close(4004);
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
      getAgentRunService(),
      getAgentRunEventMessageMapper(),
      getAgentStreamBroadcaster(),
      getAgentRunCommandCoordinator(),
      getAgentRunStatusProjectionService(),
    );
  }
  return cachedAgentStreamHandler;
};
