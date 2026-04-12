import { AgentStatus } from '../../status/status-enum.js';
import {
  assertRequiredKeys,
  BaseStreamPayload,
  isRecord
} from './stream-event-payload-utils.js';

export class AgentStatusUpdateData extends BaseStreamPayload {
  new_status: AgentStatus;
  old_status?: AgentStatus;
  trigger?: string;
  tool_name?: string;
  error_message?: string;
  error_details?: string;

  constructor(data: Record<string, any>) {
    assertRequiredKeys(data, ['new_status'], 'AgentStatusUpdateData');
    super(data);
    this.new_status = data.new_status;
    this.old_status = data.old_status ?? undefined;
    this.trigger = data.trigger ?? undefined;
    this.tool_name = data.tool_name ?? undefined;
    this.error_message = data.error_message ?? undefined;
    this.error_details = data.error_details ?? undefined;
  }
}

export class TurnLifecycleData extends BaseStreamPayload {
  turn_id: string;

  constructor(data: Record<string, any>) {
    assertRequiredKeys(data, ['turn_id'], 'TurnLifecycleData');
    super(data);
    this.turn_id = String(data.turn_id ?? '');
  }
}

export class ErrorEventData extends BaseStreamPayload {
  source: string;
  message: string;
  details?: string;

  constructor(data: Record<string, any>) {
    assertRequiredKeys(data, ['source', 'message'], 'ErrorEventData');
    super(data);
    this.source = String(data.source ?? '');
    this.message = String(data.message ?? '');
    this.details = data.details ?? undefined;
  }
}

export class CompactionStatusData extends BaseStreamPayload {
  phase: string;
  turn_id?: string | null;
  selected_block_count?: number | null;
  compacted_block_count?: number | null;
  raw_trace_count?: number | null;
  semantic_fact_count?: number | null;
  compaction_model_identifier?: string | null;
  error_message?: string | null;

  constructor(data: Record<string, any>) {
    assertRequiredKeys(data, ['phase'], 'CompactionStatusData');
    super(data);
    this.phase = String(data.phase ?? '');
    this.turn_id = typeof data.turn_id === 'string' ? data.turn_id : data.turn_id ?? undefined;
    this.selected_block_count = typeof data.selected_block_count === 'number' ? data.selected_block_count : data.selected_block_count ?? undefined;
    this.compacted_block_count = typeof data.compacted_block_count === 'number' ? data.compacted_block_count : data.compacted_block_count ?? undefined;
    this.raw_trace_count = typeof data.raw_trace_count === 'number' ? data.raw_trace_count : data.raw_trace_count ?? undefined;
    this.semantic_fact_count = typeof data.semantic_fact_count === 'number' ? data.semantic_fact_count : data.semantic_fact_count ?? undefined;
    this.compaction_model_identifier = typeof data.compaction_model_identifier === 'string' ? data.compaction_model_identifier : data.compaction_model_identifier ?? undefined;
    this.error_message = typeof data.error_message === 'string' ? data.error_message : data.error_message ?? undefined;
  }
}

export class SegmentEventData extends BaseStreamPayload {
  event_type: string;
  segment_id: string;
  segment_type?: string;
  turn_id: string;
  payload: Record<string, any>;

  constructor(data: Record<string, any>) {
    const eventType = data.event_type ?? data.type;
    assertRequiredKeys(
      { ...data, event_type: eventType },
      ['event_type', 'segment_id', 'turn_id'],
      'SegmentEventData'
    );
    super(data);
    this.event_type = eventType;
    this.segment_id = String(data.segment_id ?? '');
    this.segment_type = data.segment_type ?? undefined;
    this.turn_id = String(data.turn_id ?? '');
    this.payload = data.payload ?? {};
  }
}

export class SystemTaskNotificationData extends BaseStreamPayload {
  sender_id: string;
  content: string;

  constructor(data: Record<string, any>) {
    assertRequiredKeys(data, ['sender_id', 'content'], 'SystemTaskNotificationData');
    super(data);
    this.sender_id = String(data.sender_id ?? '');
    this.content = String(data.content ?? '');
  }
}

export class InterAgentMessageData extends BaseStreamPayload {
  sender_agent_id: string;
  recipient_role_name: string;
  content: string;
  message_type: string;

  constructor(data: Record<string, any>) {
    assertRequiredKeys(
      data,
      ['sender_agent_id', 'recipient_role_name', 'content', 'message_type'],
      'InterAgentMessageData'
    );
    super(data);
    this.sender_agent_id = String(data.sender_agent_id ?? '');
    this.recipient_role_name = String(data.recipient_role_name ?? '');
    this.content = String(data.content ?? '');
    this.message_type = String(data.message_type ?? '');
  }
}

export class ToDoItemData extends BaseStreamPayload {
  description: string;
  todo_id: string;
  status: string;

  constructor(data: Record<string, any>) {
    assertRequiredKeys(data, ['description', 'todo_id', 'status'], 'ToDoItemData');
    super(data);
    this.description = String(data.description ?? '');
    this.todo_id = String(data.todo_id ?? '');
    this.status = String(data.status ?? '');
  }
}

export class ToDoListUpdateData extends BaseStreamPayload {
  todos: ToDoItemData[];

  constructor(data: { todos: ToDoItemData[] }) {
    super(data as Record<string, any>);
    this.todos = data.todos;
  }
}

export class ArtifactPersistedData extends BaseStreamPayload {
  artifact_id: string;
  path: string;
  agent_id: string;
  type: string;
  workspace_root?: string;
  url?: string;

  constructor(data: Record<string, any>) {
    assertRequiredKeys(data, ['artifact_id', 'path', 'agent_id', 'type'], 'ArtifactPersistedData');
    super(data);
    this.artifact_id = String(data.artifact_id ?? '');
    this.path = String(data.path ?? '');
    this.agent_id = String(data.agent_id ?? '');
    this.type = String(data.type ?? '');
    this.workspace_root = data.workspace_root ?? undefined;
    this.url = data.url ?? undefined;
  }
}

export class ArtifactUpdatedData extends BaseStreamPayload {
  artifact_id?: string;
  path: string;
  agent_id: string;
  type: string;
  workspace_root?: string;

  constructor(data: Record<string, any>) {
    assertRequiredKeys(data, ['path', 'agent_id', 'type'], 'ArtifactUpdatedData');
    super(data);
    this.artifact_id = data.artifact_id ?? undefined;
    this.path = String(data.path ?? '');
    this.agent_id = String(data.agent_id ?? '');
    this.type = String(data.type ?? '');
    this.workspace_root = data.workspace_root ?? undefined;
  }
}

export class EmptyData extends BaseStreamPayload {}

export const createAgentStatusUpdateData = (statusData: unknown): AgentStatusUpdateData => {
  if (!isRecord(statusData)) {
    throw new Error('Cannot create AgentStatusUpdateData from non-object');
  }
  return new AgentStatusUpdateData(statusData);
};

export const createTurnLifecycleData = (turnData: unknown): TurnLifecycleData => {
  if (!isRecord(turnData)) {
    throw new Error('Cannot create TurnLifecycleData from non-object');
  }
  return new TurnLifecycleData(turnData);
};

export const createErrorEventData = (errorData: unknown): ErrorEventData => {
  if (!isRecord(errorData)) {
    throw new Error('Cannot create ErrorEventData from non-object');
  }
  return new ErrorEventData(errorData);
};

export const createCompactionStatusData = (statusData: unknown): CompactionStatusData => {
  if (!isRecord(statusData)) {
    throw new Error('Cannot create CompactionStatusData from non-object');
  }
  return new CompactionStatusData(statusData);
};

export const createSegmentEventData = (eventData: unknown): SegmentEventData => {
  if (eventData instanceof SegmentEventData) {
    return eventData;
  }
  if (!isRecord(eventData)) {
    throw new Error('Cannot create SegmentEventData from non-object');
  }
  return new SegmentEventData(eventData);
};

export const createInterAgentMessageData = (msgData: unknown): InterAgentMessageData => {
  if (!isRecord(msgData)) {
    throw new Error('Cannot create InterAgentMessageData from non-object');
  }
  return new InterAgentMessageData(msgData);
};

export const createSystemTaskNotificationData = (
  notificationData: unknown
): SystemTaskNotificationData => {
  if (!isRecord(notificationData)) {
    throw new Error('Cannot create SystemTaskNotificationData from non-object');
  }
  return new SystemTaskNotificationData(notificationData);
};

export const createTodoListUpdateData = (todoData: unknown): ToDoListUpdateData => {
  if (!isRecord(todoData)) {
    throw new Error('Cannot create ToDoListUpdateData from non-object');
  }
  const todosPayload = todoData.todos;
  if (!Array.isArray(todosPayload)) {
    throw new Error("Expected 'todos' to be a list when creating ToDoListUpdateData.");
  }
  const todoItems: ToDoItemData[] = [];
  for (const todoEntry of todosPayload) {
    if (!isRecord(todoEntry)) {
      console.warn(`Skipping non-object todo entry when creating ToDoListUpdateData: ${String(todoEntry)}`);
      continue;
    }
    try {
      todoItems.push(new ToDoItemData(todoEntry));
    } catch (error) {
      console.warn(`Failed to parse todo entry into ToDoItemData: ${JSON.stringify(todoEntry)}; error: ${error}`);
    }
  }
  return new ToDoListUpdateData({ todos: todoItems });
};

export const createArtifactPersistedData = (data: unknown): ArtifactPersistedData => {
  if (!isRecord(data)) {
    throw new Error('Cannot create ArtifactPersistedData from non-object');
  }
  return new ArtifactPersistedData(data);
};

export const createArtifactUpdatedData = (data: unknown): ArtifactUpdatedData => {
  if (!isRecord(data)) {
    throw new Error('Cannot create ArtifactUpdatedData from non-object');
  }
  return new ArtifactUpdatedData(data);
};
