import { EventEmitter } from '../../events/event-emitter.js';
import { EventType } from '../../events/event-types.js';
import { AgentStatus } from '../status/status-enum.js';
import type { ChunkResponse, CompleteResponse } from '../../llm/utils/response-types.js';

export class AgentExternalEventNotifier extends EventEmitter {
  agentId: string;

  constructor(agentId: string) {
    super();
    this.agentId = agentId;
    console.debug(
      `AgentExternalEventNotifier initialized for agent_id '${this.agentId}' (NotifierID: ${this.objectId}).`
    );
  }

  private emitEvent(eventType: EventType, payloadContent?: any): void {
    const emitKwargs: Record<string, any> = { agent_id: this.agentId };
    if (payloadContent !== undefined) {
      emitKwargs['payload'] = payloadContent;
    }
    this.emit(eventType, emitKwargs);

    const logMessage =
      `AgentExternalEventNotifier (NotifierID: ${this.objectId}, AgentID: ${this.agentId}) ` +
      `emitted ${eventType}. Kwarg keys for emit: ${Object.keys(emitKwargs)}`;

    if ([EventType.AGENT_DATA_ASSISTANT_CHUNK, EventType.AGENT_DATA_SEGMENT_EVENT].includes(eventType)) {
      const summary = this.summarizePayload(eventType, payloadContent);
      if (summary) {
        console.debug(`${logMessage} | ${summary}`);
      } else {
        console.debug(logMessage);
      }
    } else {
      console.info(logMessage);
    }
  }

  private summarizePayload(eventType: EventType, payloadContent?: any): string | null {
    if (payloadContent === undefined || payloadContent === null) {
      return null;
    }

    if (eventType === EventType.AGENT_DATA_SEGMENT_EVENT && typeof payloadContent === 'object') {
      const segType = payloadContent.segment_type;
      const segId = payloadContent.segment_id;
      const segEventType = payloadContent.type;
      const payload = payloadContent.payload ?? {};
      const summaryParts = [
        `segment_id=${segId}`,
        `segment_type=${segType}`,
        `event_type=${segEventType}`
      ];
      if (payload && typeof payload === 'object') {
        if ('delta' in payload) {
          const delta = payload.delta ?? '';
          summaryParts.push(`delta_len=${String(delta).length}`);
        }
        if ('metadata' in payload && payload.metadata && typeof payload.metadata === 'object') {
          const metaKeys = Object.keys(payload.metadata);
          if (metaKeys.length) {
            summaryParts.push(`metadata_keys=${metaKeys.join(',')}`);
          }
        }
      }
      return summaryParts.join(' ');
    }

    if (eventType === EventType.AGENT_DATA_ASSISTANT_CHUNK && typeof payloadContent === 'object') {
      const content = payloadContent.content ?? '';
      const reasoning = payloadContent.reasoning ?? '';
      return `content_len=${String(content).length} reasoning_len=${String(reasoning).length}`;
    }

    return null;
  }

  private emitStatusUpdate(
    newStatus: AgentStatus,
    oldStatus?: AgentStatus,
    additionalData?: Record<string, any> | null
  ): void {
    const statusPayload: Record<string, any> = {
      new_status: newStatus,
      old_status: oldStatus ?? null
    };
    if (additionalData) {
      Object.assign(statusPayload, additionalData);
    }
    this.emitEvent(EventType.AGENT_STATUS_UPDATED, statusPayload);
  }

  notifyStatusUpdated(
    newStatus: AgentStatus,
    oldStatus?: AgentStatus,
    additionalData?: Record<string, any> | null
  ): void {
    this.emitStatusUpdate(newStatus, oldStatus, additionalData);
  }

  notifyAgentDataAssistantChunk(chunk: ChunkResponse): void {
    this.emitEvent(EventType.AGENT_DATA_ASSISTANT_CHUNK, chunk);
  }

  notifyAgentDataAssistantCompleteResponse(completeResponse: CompleteResponse): void {
    this.emitEvent(EventType.AGENT_DATA_ASSISTANT_COMPLETE_RESPONSE, completeResponse);
  }

  notifyAgentSegmentEvent(eventDict: Record<string, any>): void {
    this.emitEvent(EventType.AGENT_DATA_SEGMENT_EVENT, eventDict);
  }

  notifyAgentDataToolLog(logData: Record<string, any>): void {
    this.emitEvent(EventType.AGENT_DATA_TOOL_LOG, logData);
  }

  notifyAgentDataToolLogStreamEnd(): void {
    this.emitEvent(EventType.AGENT_DATA_TOOL_LOG_STREAM_END);
  }

  notifyAgentToolApprovalRequested(approvalData: Record<string, any>): void {
    this.emitEvent(EventType.AGENT_TOOL_APPROVAL_REQUESTED, approvalData);
  }

  notifyAgentToolApproved(approvalData: Record<string, any>): void {
    this.emitEvent(EventType.AGENT_TOOL_APPROVED, approvalData);
  }

  notifyAgentToolDenied(denialData: Record<string, any>): void {
    this.emitEvent(EventType.AGENT_TOOL_DENIED, denialData);
  }

  notifyAgentToolExecutionStarted(startData: Record<string, any>): void {
    this.emitEvent(EventType.AGENT_TOOL_EXECUTION_STARTED, startData);
  }

  notifyAgentToolExecutionSucceeded(successData: Record<string, any>): void {
    this.emitEvent(EventType.AGENT_TOOL_EXECUTION_SUCCEEDED, successData);
  }

  notifyAgentToolExecutionFailed(errorData: Record<string, any>): void {
    this.emitEvent(EventType.AGENT_TOOL_EXECUTION_FAILED, errorData);
  }

  notifyAgentDataSystemTaskNotificationReceived(notificationData: Record<string, any>): void {
    this.emitEvent(EventType.AGENT_DATA_SYSTEM_TASK_NOTIFICATION_RECEIVED, notificationData);
  }

  notifyAgentDataInterAgentMessageReceived(messageData: Record<string, any>): void {
    this.emitEvent(EventType.AGENT_DATA_INTER_AGENT_MESSAGE_RECEIVED, messageData);
  }

  notifyAgentDataTodoListUpdated(todoList: Array<Record<string, any>>): void {
    this.emitEvent(EventType.AGENT_DATA_TODO_LIST_UPDATED, { todos: todoList });
  }

  notifyAgentErrorOutputGeneration(errorCode: string, errorMessage: string, errorDetails?: string): void {
    const payload = { code: errorCode, message: errorMessage, details: errorDetails };
    this.emitEvent(EventType.AGENT_ERROR_OUTPUT_GENERATION, payload);
  }

  notifyAgentArtifactPersisted(artifactData: Record<string, any>): void {
    this.emitEvent(EventType.AGENT_ARTIFACT_PERSISTED, artifactData);
  }

  notifyAgentArtifactUpdated(artifactData: Record<string, any>): void {
    this.emitEvent(EventType.AGENT_ARTIFACT_UPDATED, artifactData);
  }
}
