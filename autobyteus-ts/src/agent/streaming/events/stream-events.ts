import { randomUUID } from 'node:crypto';
import {
  AssistantChunkData,
  AssistantCompleteResponseData,
  ToolInteractionLogEntryData,
  AgentStatusUpdateData,
  ErrorEventData,
  ToolApprovalRequestedData,
  ToolApprovedData,
  ToolDeniedData,
  ToolExecutionStartedData,
  ToolExecutionSucceededData,
  ToolExecutionFailedData,
  SegmentEventData,
  SystemTaskNotificationData,
  InterAgentMessageData,
  ToDoListUpdateData,
  ArtifactPersistedData,
  ArtifactUpdatedData,
  type StreamDataPayload
} from './stream-event-payloads.js';

export enum StreamEventType {
  ASSISTANT_CHUNK = 'assistant_chunk',
  ASSISTANT_COMPLETE_RESPONSE = 'assistant_complete_response',
  TOOL_INTERACTION_LOG_ENTRY = 'tool_interaction_log_entry',
  AGENT_STATUS_UPDATED = 'agent_status_updated',
  ERROR_EVENT = 'error_event',
  TOOL_APPROVAL_REQUESTED = 'tool_approval_requested',
  TOOL_APPROVED = 'tool_approved',
  TOOL_DENIED = 'tool_denied',
  TOOL_EXECUTION_STARTED = 'tool_execution_started',
  TOOL_EXECUTION_SUCCEEDED = 'tool_execution_succeeded',
  TOOL_EXECUTION_FAILED = 'tool_execution_failed',
  SEGMENT_EVENT = 'segment_event',
  SYSTEM_TASK_NOTIFICATION = 'system_task_notification',
  INTER_AGENT_MESSAGE = 'inter_agent_message',
  AGENT_TODO_LIST_UPDATE = 'agent_todo_list_updated',
  ARTIFACT_PERSISTED = 'artifact_persisted',
  ARTIFACT_UPDATED = 'artifact_updated'
}

const STREAM_EVENT_TYPE_TO_PAYLOAD_CLASS: Record<
  StreamEventType,
  new (data: any) => StreamDataPayload
> = {
  [StreamEventType.ASSISTANT_CHUNK]: AssistantChunkData,
  [StreamEventType.ASSISTANT_COMPLETE_RESPONSE]: AssistantCompleteResponseData,
  [StreamEventType.TOOL_INTERACTION_LOG_ENTRY]: ToolInteractionLogEntryData,
  [StreamEventType.AGENT_STATUS_UPDATED]: AgentStatusUpdateData,
  [StreamEventType.ERROR_EVENT]: ErrorEventData,
  [StreamEventType.TOOL_APPROVAL_REQUESTED]: ToolApprovalRequestedData,
  [StreamEventType.TOOL_APPROVED]: ToolApprovedData,
  [StreamEventType.TOOL_DENIED]: ToolDeniedData,
  [StreamEventType.TOOL_EXECUTION_STARTED]: ToolExecutionStartedData,
  [StreamEventType.TOOL_EXECUTION_SUCCEEDED]: ToolExecutionSucceededData,
  [StreamEventType.TOOL_EXECUTION_FAILED]: ToolExecutionFailedData,
  [StreamEventType.SEGMENT_EVENT]: SegmentEventData,
  [StreamEventType.SYSTEM_TASK_NOTIFICATION]: SystemTaskNotificationData,
  [StreamEventType.INTER_AGENT_MESSAGE]: InterAgentMessageData,
  [StreamEventType.AGENT_TODO_LIST_UPDATE]: ToDoListUpdateData,
  [StreamEventType.ARTIFACT_PERSISTED]: ArtifactPersistedData,
  [StreamEventType.ARTIFACT_UPDATED]: ArtifactUpdatedData
};

const normalizeEventType = (eventType: StreamEventType | string): StreamEventType => {
  if (Object.values(StreamEventType).includes(eventType as StreamEventType)) {
    return eventType as StreamEventType;
  }
  throw new Error(`Invalid event_type string '${eventType}'`);
};

const coercePayload = (
  eventType: StreamEventType,
  data: StreamDataPayload | Record<string, any>
): StreamDataPayload => {
  const PayloadClass = STREAM_EVENT_TYPE_TO_PAYLOAD_CLASS[eventType];
  if (!PayloadClass) {
    return data as StreamDataPayload;
  }
  if (data instanceof PayloadClass) {
    return data;
  }
  if (typeof data === 'object' && data !== null) {
    return new PayloadClass(data);
  }
  throw new Error(
    `Data for event type ${eventType} is of unexpected type ${typeof data}. Expected object or ${PayloadClass.name}.`
  );
};

export class StreamEvent {
  event_id: string;
  timestamp: Date;
  event_type: StreamEventType;
  data: StreamDataPayload;
  agent_id?: string;

  constructor({
    event_id,
    timestamp,
    event_type,
    data,
    agent_id
  }: {
    event_id?: string;
    timestamp?: Date;
    event_type: StreamEventType | string;
    data: StreamDataPayload | Record<string, any>;
    agent_id?: string;
  }) {
    this.event_id = event_id ?? randomUUID();
    this.timestamp = timestamp ?? new Date();
    this.event_type = normalizeEventType(event_type);
    this.data = coercePayload(this.event_type, data);
    this.agent_id = agent_id ?? undefined;
  }

  toString(): string {
    return `StreamEvent[${this.event_type}] (ID: ${this.event_id}, Agent: ${this.agent_id ?? 'N/A'}): Data: ${String(
      this.data
    )}`;
  }
}
