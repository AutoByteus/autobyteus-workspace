import { EventEmitter } from '../../../events/event-emitter.js';
import { EventType } from '../../../events/event-types.js';
import { StreamEvent, StreamEventType } from '../events/stream-events.js';
import {
  createAssistantChunkData,
  createAssistantCompleteResponseData,
  createToolInteractionLogEntryData,
  createAgentStatusUpdateData,
  createErrorEventData,
  createToolApprovalRequestedData,
  createToolApprovedData,
  createToolDeniedData,
  createToolExecutionStartedData,
  createToolExecutionSucceededData,
  createToolExecutionFailedData,
  createSegmentEventData,
  createSystemTaskNotificationData,
  createInterAgentMessageData,
  createTodoListUpdateData,
  createArtifactPersistedData,
  createArtifactUpdatedData,
  AssistantChunkData,
  AssistantCompleteResponseData,
  ToolInteractionLogEntryData,
  AgentStatusUpdateData,
  ToolApprovalRequestedData,
  ToolApprovedData,
  ToolDeniedData,
  ToolExecutionStartedData,
  ToolExecutionSucceededData,
  ToolExecutionFailedData,
  SegmentEventData,
  ErrorEventData,
  SystemTaskNotificationData,
  InterAgentMessageData,
  ToDoListUpdateData,
  ArtifactPersistedData,
  ArtifactUpdatedData,
  type StreamDataPayload
} from '../events/stream-event-payloads.js';
import { streamQueueItems, SimpleQueue } from '../utils/queue-streamer.js';

export type AgentLike = {
  agentId: string;
  context?: {
    statusManager?: {
      notifier?: EventEmitter;
    } | null;
  };
};

const AES_INTERNAL_SENTINEL = {};

export class AgentEventStream extends EventEmitter {
  agentId: string;
  private genericStreamQueue: SimpleQueue<StreamEvent | object>;
  private notifier: EventEmitter | null;

  constructor(agent: AgentLike) {
    super();

    if (!agent || typeof agent !== 'object' || typeof agent.agentId !== 'string') {
      throw new TypeError(`AgentEventStream requires an Agent-like instance, got ${typeof agent}.`);
    }

    this.agentId = agent.agentId;
    this.genericStreamQueue = new SimpleQueue<StreamEvent | object>();
    this.notifier = agent.context?.statusManager?.notifier ?? null;

    if (!this.notifier) {
      console.error(`AgentEventStream for '${this.agentId}': Notifier not available. No events will be streamed.`);
      return;
    }

    this.registerListeners();
    console.info(
      `AgentEventStream (ID: ${this.objectId}) initialized for agent_id '${this.agentId}'. Subscribed to notifier.`
    );
  }

  private registerListeners(): void {
    const allAgentEventTypes = Object.values(EventType).filter((eventType) =>
      String(eventType).startsWith('agent_')
    );

    for (const eventType of allAgentEventTypes) {
      this.subscribeFrom(this.notifier as EventEmitter, eventType as EventType, this.handleNotifierEventSync);
    }
  }

  private handleNotifierEventSync = (payload?: any, metadata?: Record<string, any>): void => {
    const eventType = metadata?.event_type as EventType | undefined;
    if (!eventType) {
      return;
    }
    const eventAgentId = metadata?.agent_id ?? this.agentId;

    let typedPayload: StreamDataPayload | null = null;
    let streamEventType: StreamEventType | null = null;

    try {
      switch (eventType) {
        case EventType.AGENT_STATUS_UPDATED:
          typedPayload = createAgentStatusUpdateData(payload);
          streamEventType = StreamEventType.AGENT_STATUS_UPDATED;
          break;
        case EventType.AGENT_DATA_ASSISTANT_CHUNK:
          typedPayload = createAssistantChunkData(payload);
          streamEventType = StreamEventType.ASSISTANT_CHUNK;
          break;
        case EventType.AGENT_DATA_ASSISTANT_COMPLETE_RESPONSE:
          typedPayload = createAssistantCompleteResponseData(payload);
          streamEventType = StreamEventType.ASSISTANT_COMPLETE_RESPONSE;
          break;
        case EventType.AGENT_DATA_TOOL_LOG:
          typedPayload = createToolInteractionLogEntryData(payload);
          streamEventType = StreamEventType.TOOL_INTERACTION_LOG_ENTRY;
          break;
        case EventType.AGENT_TOOL_APPROVAL_REQUESTED:
          typedPayload = createToolApprovalRequestedData(payload);
          streamEventType = StreamEventType.TOOL_APPROVAL_REQUESTED;
          break;
        case EventType.AGENT_TOOL_APPROVED:
          typedPayload = createToolApprovedData(payload);
          streamEventType = StreamEventType.TOOL_APPROVED;
          break;
        case EventType.AGENT_TOOL_DENIED:
          typedPayload = createToolDeniedData(payload);
          streamEventType = StreamEventType.TOOL_DENIED;
          break;
        case EventType.AGENT_TOOL_EXECUTION_STARTED:
          typedPayload = createToolExecutionStartedData(payload);
          streamEventType = StreamEventType.TOOL_EXECUTION_STARTED;
          break;
        case EventType.AGENT_TOOL_EXECUTION_SUCCEEDED:
          typedPayload = createToolExecutionSucceededData(payload);
          streamEventType = StreamEventType.TOOL_EXECUTION_SUCCEEDED;
          break;
        case EventType.AGENT_TOOL_EXECUTION_FAILED:
          typedPayload = createToolExecutionFailedData(payload);
          streamEventType = StreamEventType.TOOL_EXECUTION_FAILED;
          break;
        case EventType.AGENT_DATA_SEGMENT_EVENT:
          typedPayload = createSegmentEventData(payload);
          streamEventType = StreamEventType.SEGMENT_EVENT;
          break;
        case EventType.AGENT_ERROR_OUTPUT_GENERATION:
          typedPayload = createErrorEventData(payload);
          streamEventType = StreamEventType.ERROR_EVENT;
          break;
        case EventType.AGENT_DATA_SYSTEM_TASK_NOTIFICATION_RECEIVED:
          typedPayload = createSystemTaskNotificationData(payload);
          streamEventType = StreamEventType.SYSTEM_TASK_NOTIFICATION;
          break;
        case EventType.AGENT_DATA_INTER_AGENT_MESSAGE_RECEIVED:
          typedPayload = createInterAgentMessageData(payload);
          streamEventType = StreamEventType.INTER_AGENT_MESSAGE;
          break;
        case EventType.AGENT_DATA_TODO_LIST_UPDATED:
          typedPayload = createTodoListUpdateData(payload);
          streamEventType = StreamEventType.AGENT_TODO_LIST_UPDATE;
          break;
        case EventType.AGENT_ARTIFACT_PERSISTED:
          typedPayload = createArtifactPersistedData(payload);
          streamEventType = StreamEventType.ARTIFACT_PERSISTED;
          break;
        case EventType.AGENT_ARTIFACT_UPDATED:
          typedPayload = createArtifactUpdatedData(payload);
          streamEventType = StreamEventType.ARTIFACT_UPDATED;
          break;
        case EventType.AGENT_DATA_TOOL_LOG_STREAM_END:
          break;
        default:
          console.debug(
            `AgentEventStream received internal event '${eventType}' with no direct stream mapping.`
          );
      }
    } catch (error) {
      console.error(`AgentEventStream error processing payload for event '${eventType}': ${error}`);
    }

    if (typedPayload && streamEventType) {
      const streamEvent = new StreamEvent({
        agent_id: eventAgentId,
        event_type: streamEventType,
        data: typedPayload
      });
      this.genericStreamQueue.put(streamEvent);
    }
  };

  async close(): Promise<void> {
    console.info(
      `AgentEventStream (ID: ${this.objectId}) for '${this.agentId}': close() called. Unsubscribing all listeners and signaling.`
    );
    this.unsubscribeAllListeners();
    this.genericStreamQueue.put(AES_INTERNAL_SENTINEL);
  }

  async *allEvents(): AsyncGenerator<StreamEvent, void, unknown> {
    for await (const event of streamQueueItems(
      this.genericStreamQueue,
      AES_INTERNAL_SENTINEL,
      `agent_${this.agentId}_allEvents`
    )) {
      yield event as StreamEvent;
    }
  }

  async *streamAssistantChunks(): AsyncGenerator<AssistantChunkData, void, unknown> {
    for await (const event of this.allEvents()) {
      if (event.event_type === StreamEventType.ASSISTANT_CHUNK && event.data instanceof AssistantChunkData) {
        yield event.data;
      }
    }
  }

  async *streamAssistantFinalResponse(): AsyncGenerator<AssistantCompleteResponseData, void, unknown> {
    for await (const event of this.allEvents()) {
      if (
        event.event_type === StreamEventType.ASSISTANT_COMPLETE_RESPONSE &&
        event.data instanceof AssistantCompleteResponseData
      ) {
        yield event.data;
      }
    }
  }

  async *streamToolLogs(): AsyncGenerator<ToolInteractionLogEntryData, void, unknown> {
    for await (const event of this.allEvents()) {
      if (event.event_type === StreamEventType.TOOL_INTERACTION_LOG_ENTRY && event.data instanceof ToolInteractionLogEntryData) {
        yield event.data;
      }
    }
  }

  async *streamStatusUpdates(): AsyncGenerator<AgentStatusUpdateData, void, unknown> {
    for await (const event of this.allEvents()) {
      if (event.event_type === StreamEventType.AGENT_STATUS_UPDATED && event.data instanceof AgentStatusUpdateData) {
        yield event.data;
      }
    }
  }

  async *streamToolApprovalRequests(): AsyncGenerator<ToolApprovalRequestedData, void, unknown> {
    for await (const event of this.allEvents()) {
      if (
        event.event_type === StreamEventType.TOOL_APPROVAL_REQUESTED &&
        event.data instanceof ToolApprovalRequestedData
      ) {
        yield event.data;
      }
    }
  }

  async *streamToolExecutionStarted(): AsyncGenerator<ToolExecutionStartedData, void, unknown> {
    for await (const event of this.allEvents()) {
      if (
        event.event_type === StreamEventType.TOOL_EXECUTION_STARTED &&
        event.data instanceof ToolExecutionStartedData
      ) {
        yield event.data;
      }
    }
  }

  async *streamErrors(): AsyncGenerator<ErrorEventData, void, unknown> {
    for await (const event of this.allEvents()) {
      if (event.event_type === StreamEventType.ERROR_EVENT && event.data instanceof ErrorEventData) {
        yield event.data;
      }
    }
  }

  async *streamSystemTaskNotifications(): AsyncGenerator<SystemTaskNotificationData, void, unknown> {
    for await (const event of this.allEvents()) {
      if (event.event_type === StreamEventType.SYSTEM_TASK_NOTIFICATION && event.data instanceof SystemTaskNotificationData) {
        yield event.data;
      }
    }
  }

  async *streamInterAgentMessages(): AsyncGenerator<InterAgentMessageData, void, unknown> {
    for await (const event of this.allEvents()) {
      if (event.event_type === StreamEventType.INTER_AGENT_MESSAGE && event.data instanceof InterAgentMessageData) {
        yield event.data;
      }
    }
  }

  async *streamTodoUpdates(): AsyncGenerator<ToDoListUpdateData, void, unknown> {
    for await (const event of this.allEvents()) {
      if (event.event_type === StreamEventType.AGENT_TODO_LIST_UPDATE && event.data instanceof ToDoListUpdateData) {
        yield event.data;
      }
    }
  }

  async *streamArtifactPersisted(): AsyncGenerator<ArtifactPersistedData, void, unknown> {
    for await (const event of this.allEvents()) {
      if (event.event_type === StreamEventType.ARTIFACT_PERSISTED && event.data instanceof ArtifactPersistedData) {
        yield event.data;
      }
    }
  }

  async *streamArtifactUpdated(): AsyncGenerator<ArtifactUpdatedData, void, unknown> {
    for await (const event of this.allEvents()) {
      if (event.event_type === StreamEventType.ARTIFACT_UPDATED && event.data instanceof ArtifactUpdatedData) {
        yield event.data;
      }
    }
  }
}
