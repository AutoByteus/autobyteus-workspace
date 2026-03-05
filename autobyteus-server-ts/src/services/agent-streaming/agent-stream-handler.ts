import { randomUUID } from "node:crypto";
import {
  AgentInputUserMessage,
  ContextFile,
  ContextFileType,
  StreamEvent,
  AgentEventStream,
} from "autobyteus-ts";
import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import { getRunHistoryService } from "../../run-history/services/run-history-service.js";
import {
  getRuntimeCommandIngressService,
  type RuntimeCommandIngressService,
} from "../../runtime-execution/runtime-command-ingress-service.js";
import { getRuntimeCompositionService } from "../../runtime-execution/runtime-composition-service.js";
import {
  getExternalRuntimeEventSourceRegistry,
  type ExternalRuntimeEventSourceRegistry,
} from "../../runtime-execution/external-runtime-event-source-registry.js";
import type { ExternalRuntimeEventSource } from "../../runtime-execution/external-runtime-event-source-port.js";
import { AgentSessionManager } from "./agent-session-manager.js";
import {
  RuntimeEventMessageMapper,
  getRuntimeEventMessageMapper,
} from "./runtime-event-message-mapper.js";
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

type AgentLike = {
  currentStatus?: unknown;
};

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

const isCodexRuntimeRawEventDebugEnabled = process.env.CODEX_RUNTIME_RAW_EVENT_DEBUG === "1";
const codexRuntimeRawEventMaxChars = Number.isFinite(Number(process.env.CODEX_RUNTIME_RAW_EVENT_MAX_CHARS))
  ? Math.max(512, Number(process.env.CODEX_RUNTIME_RAW_EVENT_MAX_CHARS))
  : 20_000;

const truncateForDebug = (value: string): string =>
  value.length <= codexRuntimeRawEventMaxChars ? value : `${value.slice(0, codexRuntimeRawEventMaxChars)}...<truncated>`;

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
  private commandIngressService: RuntimeCommandIngressService;
  private externalRuntimeEventSourceRegistry: ExternalRuntimeEventSourceRegistry;
  private eventMessageMapper: RuntimeEventMessageMapper;
  private activeTasks = new Map<string, Promise<void>>();
  private activeStreams = new Map<string, AgentEventStream>();
  private activeExternalRuntimeUnsubscribers = new Map<string, () => void>();
  private runHistoryService = getRunHistoryService();
  private runtimeCompositionService = getRuntimeCompositionService();
  private externalRuntimeEventSequence = 0;

  constructor(
    sessionManager: AgentSessionManager = new AgentSessionManager(),
    agentManager: AgentRunManager = AgentRunManager.getInstance(),
    commandIngressService: RuntimeCommandIngressService = getRuntimeCommandIngressService(),
    externalRuntimeEventSourceRegistry: ExternalRuntimeEventSourceRegistry =
      getExternalRuntimeEventSourceRegistry(),
    eventMessageMapper: RuntimeEventMessageMapper = getRuntimeEventMessageMapper(),
  ) {
    this.sessionManager = sessionManager;
    this.agentManager = agentManager;
    this.commandIngressService = commandIngressService;
    this.externalRuntimeEventSourceRegistry = externalRuntimeEventSourceRegistry;
    this.eventMessageMapper = eventMessageMapper;
  }

  async connect(connection: WebSocketConnection, agentRunId: string): Promise<string | null> {
    const agent = this.agentManager.getAgentRun(agentRunId) as AgentLike | null;
    const runtimeSession = this.runtimeCompositionService.getRunSession(agentRunId);
    const runtimeEventSource =
      runtimeSession && runtimeSession.runtimeKind !== "autobyteus"
        ? this.externalRuntimeEventSourceRegistry.tryResolveSource(runtimeSession.runtimeKind)
        : null;
    const hasExternalRuntimeSession = runtimeEventSource
      ? typeof runtimeEventSource.hasRunSession === "function"
        ? runtimeEventSource.hasRunSession(agentRunId)
        : true
      : false;

    if (!agent && !hasExternalRuntimeSession) {
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
    connection.send(connectedMsg.toJson());
    const currentStatus =
      typeof agent?.currentStatus === "string" ? agent.currentStatus : null;
    if (currentStatus) {
      connection.send(
        new ServerMessage(ServerMessageType.AGENT_STATUS, {
          new_status: currentStatus,
          old_status: null,
        }).toJson(),
      );
    }

    if (agent) {
      const task = this.streamLoop(connection, agentRunId, sessionId);
      this.activeTasks.set(sessionId, task);
    } else if (runtimeSession && runtimeEventSource && hasExternalRuntimeSession) {
      this.startExternalRuntimeStreamLoop(
        connection,
        agentRunId,
        sessionId,
        runtimeSession.runtimeKind,
        runtimeEventSource,
      );
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
    const externalRuntimeUnsubscribe = this.activeExternalRuntimeUnsubscribers.get(sessionId);
    if (externalRuntimeUnsubscribe) {
      this.activeExternalRuntimeUnsubscribers.delete(sessionId);
      externalRuntimeUnsubscribe();
    }

    const stream = this.activeStreams.get(sessionId);
    if (stream) {
      this.activeStreams.delete(sessionId);
      await stream.close();
    }

    this.sessionManager.closeSession(sessionId);

    const task = this.activeTasks.get(sessionId);
    this.activeTasks.delete(sessionId);
    if (task) {
      try {
        await task;
      } catch {
        // ignore
      }
    }

    logger.info(`Agent WebSocket disconnected: ${sessionId}`);
  }

  private async streamLoop(connection: WebSocketConnection, agentRunId: string, sessionId: string): Promise<void> {
    try {
      const stream = this.agentManager.getAgentEventStream(agentRunId);
      if (!stream) {
        logger.error(`No event stream for agent run ${agentRunId}`);
        return;
      }
      this.activeStreams.set(sessionId, stream);

      for await (const event of stream.allEvents()) {
        try {
          await this.runHistoryService.onAgentEvent(agentRunId, event);
          const message = this.convertStreamEvent(event);
          connection.send(message.toJson());
        } catch (error) {
          logger.error(`Error sending event to WebSocket: ${String(error)}`);
        }
      }
    } catch (error) {
      logger.error(`Error in stream loop for ${sessionId}: ${String(error)}`);
    } finally {
      const stream = this.activeStreams.get(sessionId);
      if (stream) {
        await stream.close();
        this.activeStreams.delete(sessionId);
      }
    }
  }

  private startExternalRuntimeStreamLoop(
    connection: WebSocketConnection,
    runId: string,
    sessionId: string,
    runtimeKind: string,
    source: ExternalRuntimeEventSource,
  ): void {
    const unsubscribe = source.subscribeToRunEvents(
      runId,
      (event: unknown) => {
        void this.forwardExternalRuntimeEvent(connection, runId, runtimeKind, event);
      },
    );
    this.activeExternalRuntimeUnsubscribers.set(sessionId, unsubscribe);
  }

  private async forwardExternalRuntimeEvent(
    connection: WebSocketConnection,
    runId: string,
    runtimeKind: string,
    event: unknown,
  ): Promise<void> {
    try {
      if (isCodexRuntimeRawEventDebugEnabled) {
        this.externalRuntimeEventSequence += 1;
        const eventPayload =
          event && typeof event === "object" && !Array.isArray(event)
            ? (event as Record<string, unknown>)
            : {};
        const eventParams =
          eventPayload.params && typeof eventPayload.params === "object"
            ? (eventPayload.params as Record<string, unknown>)
            : {};
        const eventId =
          (typeof eventParams.id === "string" && eventParams.id) ||
          (typeof eventParams.itemId === "string" && eventParams.itemId) ||
          (typeof eventParams.item_id === "string" && eventParams.item_id) ||
          null;
        const turnPayload =
          eventParams.turn && typeof eventParams.turn === "object"
            ? (eventParams.turn as Record<string, unknown>)
            : null;
        const turnId =
          (typeof eventParams.turnId === "string" && eventParams.turnId) ||
          (typeof eventParams.turn_id === "string" && eventParams.turn_id) ||
          (typeof turnPayload?.id === "string" && turnPayload.id) ||
          null;
        const method =
          typeof eventPayload.method === "string" ? eventPayload.method : "unknown_method";

        console.log("[ExternalRuntimeRawEvent]", {
          sequence: this.externalRuntimeEventSequence,
          runId,
          runtimeKind,
          method,
          requestId:
            typeof eventPayload.request_id === "string" || typeof eventPayload.request_id === "number"
              ? eventPayload.request_id
              : null,
          eventId,
          turnId,
          payloadKeys: Object.keys(eventParams),
          rawEventJson: truncateForDebug(stringifyForDebug(event)),
        });
      }

      await this.runHistoryService.onRuntimeEvent(runId, event);
      const message = this.eventMessageMapper.map(event);
      if (isCodexRuntimeRawEventDebugEnabled) {
        console.log("[ExternalRuntimeMappedMessage]", {
          sequence: this.externalRuntimeEventSequence,
          runId,
          runtimeKind,
          messageType: message.type,
          payloadId:
            typeof message.payload?.id === "string" ? message.payload.id : null,
          segmentType:
            typeof message.payload?.segment_type === "string"
              ? message.payload.segment_type
              : null,
          runtimeEventMethod:
            typeof message.payload?.runtime_event_method === "string"
              ? message.payload.runtime_event_method
              : null,
        });
      }
      connection.send(message.toJson());
    } catch (error) {
      logger.error(`Error forwarding external runtime event: ${String(error)}`);
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

    const result = await this.commandIngressService.sendTurn({
      runId: agentRunId,
      mode: "agent",
      message: userMessage,
    });
    if (!result.accepted) {
      logger.warn(
        `SEND_MESSAGE rejected for agent run ${agentRunId}: [${result.code ?? "UNKNOWN"}] ${result.message ?? "no message"}`,
      );
    }
  }

  private async handleStopGeneration(agentRunId: string): Promise<void> {
    const result = await this.commandIngressService.interruptRun({
      runId: agentRunId,
      mode: "agent",
      turnId: null,
    });
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
    const result = await this.commandIngressService.approveTool({
      runId: agentRunId,
      mode: "agent",
      invocationId,
      approved,
      reason,
    });
    if (!result.accepted) {
      logger.warn(
        `TOOL_APPROVAL rejected for agent run ${agentRunId}: [${result.code ?? "UNKNOWN"}] ${result.message ?? "no message"}`,
      );
    }
  }

  convertStreamEvent(event: StreamEvent): ServerMessage {
    return this.eventMessageMapper.map(event);
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
      getRuntimeCommandIngressService(),
      getExternalRuntimeEventSourceRegistry(),
      getRuntimeEventMessageMapper(),
    );
  }
  return cachedAgentStreamHandler;
};
