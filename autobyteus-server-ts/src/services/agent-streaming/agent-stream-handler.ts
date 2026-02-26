import { randomUUID } from "node:crypto";
import {
  AgentInputUserMessage,
  ContextFile,
  ContextFileType,
  StreamEvent,
  StreamEventType,
  AgentEventStream,
} from "autobyteus-ts";
import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import { getRunHistoryService } from "../../run-history/services/run-history-service.js";
import { AgentSessionManager } from "./agent-session-manager.js";
import {
  ClientMessageType,
  createConnectedMessage,
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

type AgentLike = {
  agentId: string;
  currentStatus?: unknown;
  postUserMessage?: (message: AgentInputUserMessage) => Promise<void>;
  postToolExecutionApproval?: (
    toolInvocationId: string,
    isApproved: boolean,
    reason?: string | null,
  ) => Promise<void>;
};

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
  debug: (...args: unknown[]) => console.debug(...args),
};

export class AgentStreamHandler {
  private sessionManager: AgentSessionManager;
  private agentManager: AgentRunManager;
  private activeTasks = new Map<string, Promise<void>>();
  private activeStreams = new Map<string, AgentEventStream>();
  private runHistoryService = getRunHistoryService();
  private static readonly DEPRECATED_STREAM_EVENT_TYPES = new Set<StreamEventType>([
    StreamEventType.ASSISTANT_CHUNK,
  ]);

  constructor(
    sessionManager: AgentSessionManager = new AgentSessionManager(),
    agentManager: AgentRunManager = AgentRunManager.getInstance(),
  ) {
    this.sessionManager = sessionManager;
    this.agentManager = agentManager;
  }

  async connect(connection: WebSocketConnection, agentId: string): Promise<string | null> {
    const agent = this.agentManager.getAgentRun(agentId) as AgentLike | null;
    if (!agent) {
      const errorMsg = createErrorMessage("AGENT_NOT_FOUND", `Agent '${agentId}' not found`);
      connection.send(errorMsg.toJson());
      connection.close(4004);
      return null;
    }

    const sessionId = randomUUID();
    try {
      const session = this.sessionManager.createSession(sessionId, agentId);
      session.connect();
    } catch (error) {
      logger.error(`Failed to create session: ${String(error)}`);
      const errorMsg = createErrorMessage("SESSION_ERROR", String(error));
      connection.send(errorMsg.toJson());
      connection.close(1011);
      return null;
    }

    const connectedMsg = createConnectedMessage(agentId, sessionId);
    connection.send(connectedMsg.toJson());
    const currentStatus =
      typeof agent.currentStatus === "string" ? agent.currentStatus : null;
    if (currentStatus) {
      connection.send(
        new ServerMessage(ServerMessageType.AGENT_STATUS, {
          new_status: currentStatus,
          old_status: null,
        }).toJson(),
      );
    }

    const task = this.streamLoop(connection, agentId, sessionId);
    this.activeTasks.set(sessionId, task);

    logger.info(`Agent WebSocket connected: session=${sessionId}, agent=${agentId}`);
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

      if (msgType === ClientMessageType.SEND_MESSAGE) {
        await this.handleSendMessage(session.agentId, payload);
      } else if (msgType === ClientMessageType.STOP_GENERATION) {
        await this.handleStopGeneration(session.agentId);
      } else if (msgType === ClientMessageType.APPROVE_TOOL) {
        await this.handleToolApproval(session.agentId, payload, true);
      } else if (msgType === ClientMessageType.DENY_TOOL) {
        await this.handleToolApproval(session.agentId, payload, false);
      } else {
        logger.warn(`Unknown message type: ${String(msgType)}`);
      }
    } catch (error) {
      logger.error(`Error handling message for ${sessionId}: ${String(error)}`);
    }
  }

  async disconnect(sessionId: string): Promise<void> {
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

  private async streamLoop(connection: WebSocketConnection, agentId: string, sessionId: string): Promise<void> {
    try {
      const stream = this.agentManager.getAgentEventStream(agentId);
      if (!stream) {
        logger.error(`No event stream for agent ${agentId}`);
        return;
      }
      this.activeStreams.set(sessionId, stream);

      for await (const event of stream.allEvents()) {
        try {
          await this.runHistoryService.onAgentEvent(agentId, event);
          const message = this.convertStreamEvent(event);
          if (!message) {
            continue;
          }
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

  private async handleSendMessage(agentId: string, payload: Record<string, unknown>): Promise<void> {
    const agent = this.agentManager.getAgentRun(agentId) as AgentLike | null;
    if (!agent?.postUserMessage) {
      logger.warn(`Agent ${agentId} not found for send_message`);
      return;
    }

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

    await agent.postUserMessage(userMessage);
  }

  private async handleStopGeneration(agentId: string): Promise<void> {
    logger.info(`Stop generation requested for agent ${agentId}`);
  }

  private async handleToolApproval(
    agentId: string,
    payload: Record<string, unknown>,
    approved: boolean,
  ): Promise<void> {
    const agent = this.agentManager.getAgentRun(agentId) as AgentLike | null;
    if (!agent?.postToolExecutionApproval) {
      return;
    }

    const invocationId = payload.invocation_id;
    if (typeof invocationId !== "string" || invocationId.length === 0) {
      logger.warn("Tool approval missing invocation_id");
      return;
    }

    const reason = typeof payload.reason === "string" ? payload.reason : null;
    await agent.postToolExecutionApproval(invocationId, approved, reason);
  }

  convertStreamEvent(event: StreamEvent): ServerMessage | null {
    if (AgentStreamHandler.DEPRECATED_STREAM_EVENT_TYPES.has(event.event_type as StreamEventType)) {
      logger.debug(`Dropping deprecated stream event type: ${String(event.event_type)}`);
      return null;
    }

    switch (event.event_type) {
      case StreamEventType.SEGMENT_EVENT:
        return this.convertSegmentEvent(event);
      case StreamEventType.AGENT_STATUS_UPDATED:
        return new ServerMessage(ServerMessageType.AGENT_STATUS, serializePayload(event.data));
      case StreamEventType.TOOL_APPROVAL_REQUESTED:
        return new ServerMessage(ServerMessageType.TOOL_APPROVAL_REQUESTED, serializePayload(event.data));
      case StreamEventType.TOOL_APPROVED:
        return new ServerMessage(ServerMessageType.TOOL_APPROVED, serializePayload(event.data));
      case StreamEventType.TOOL_DENIED:
        return new ServerMessage(ServerMessageType.TOOL_DENIED, serializePayload(event.data));
      case StreamEventType.TOOL_EXECUTION_STARTED:
        return new ServerMessage(ServerMessageType.TOOL_EXECUTION_STARTED, serializePayload(event.data));
      case StreamEventType.TOOL_EXECUTION_SUCCEEDED:
        return new ServerMessage(ServerMessageType.TOOL_EXECUTION_SUCCEEDED, serializePayload(event.data));
      case StreamEventType.TOOL_EXECUTION_FAILED:
        return new ServerMessage(ServerMessageType.TOOL_EXECUTION_FAILED, serializePayload(event.data));
      case StreamEventType.TOOL_INTERACTION_LOG_ENTRY:
        return new ServerMessage(ServerMessageType.TOOL_LOG, serializePayload(event.data));
      case StreamEventType.ASSISTANT_COMPLETE_RESPONSE:
        return new ServerMessage(ServerMessageType.ASSISTANT_COMPLETE, serializePayload(event.data));
      case StreamEventType.SYSTEM_TASK_NOTIFICATION:
        return new ServerMessage(ServerMessageType.SYSTEM_TASK_NOTIFICATION, serializePayload(event.data));
      case StreamEventType.INTER_AGENT_MESSAGE:
        return new ServerMessage(ServerMessageType.INTER_AGENT_MESSAGE, serializePayload(event.data));
      case StreamEventType.ERROR_EVENT:
        return new ServerMessage(ServerMessageType.ERROR, serializePayload(event.data));
      case StreamEventType.AGENT_TODO_LIST_UPDATE:
        return new ServerMessage(ServerMessageType.TODO_LIST_UPDATE, serializePayload(event.data));
      case StreamEventType.ARTIFACT_PERSISTED:
        return new ServerMessage(ServerMessageType.ARTIFACT_PERSISTED, serializePayload(event.data));
      case StreamEventType.ARTIFACT_UPDATED:
        return new ServerMessage(ServerMessageType.ARTIFACT_UPDATED, serializePayload(event.data));
      default:
        logger.debug(`Unmapped event type: ${String(event.event_type)}`);
        return new ServerMessage(ServerMessageType.ERROR, {
          code: "UNKNOWN_EVENT",
          message: `Unmapped event: ${String(event.event_type)}`,
        });
    }
  }

  private convertSegmentEvent(event: StreamEvent): ServerMessage {
    const data = serializePayload(event.data);
    const eventType = typeof data.event_type === "string" ? data.event_type : "SEGMENT_CONTENT";

    let messageType = ServerMessageType.SEGMENT_CONTENT;
    if (eventType === "SEGMENT_START") {
      messageType = ServerMessageType.SEGMENT_START;
    } else if (eventType === "SEGMENT_END") {
      messageType = ServerMessageType.SEGMENT_END;
    }

    const payload: Record<string, unknown> = {
      id: data.segment_id ?? "",
    };

    if (data.segment_type !== undefined) {
      payload.segment_type = data.segment_type;
    }

    const segmentPayload =
      data.payload && typeof data.payload === "object" ? (data.payload as Record<string, unknown>) : {};

    return new ServerMessage(messageType, {
      ...payload,
      ...segmentPayload,
    });
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
    cachedAgentStreamHandler = new AgentStreamHandler();
  }
  return cachedAgentStreamHandler;
};
