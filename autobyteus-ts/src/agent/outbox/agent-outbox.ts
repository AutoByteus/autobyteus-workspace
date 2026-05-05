import { SegmentEvent } from '../streaming/segments/segment-events.js';
import type { CompleteResponse } from '../../llm/utils/response-types.js';

export type AgentOutboxToolPayload = Record<string, any>;

export class AgentOutbox {
  constructor(private readonly notifier: any | null | undefined, private readonly agentId: string) {}

  publishAssistantComplete(response: CompleteResponse): void {
    this.safe(() => this.notifier?.notifyAgentDataAssistantCompleteResponse?.(response));
  }

  publishSegment(event: SegmentEvent): void {
    this.safe(() => this.notifier?.notifyAgentSegmentEvent?.(event.toDict()));
  }

  publishToolLog(payload: AgentOutboxToolPayload): void {
    this.safe(() => this.notifier?.notifyAgentDataToolLog?.(payload));
  }

  publishToolApprovalRequested(payload: AgentOutboxToolPayload): void {
    this.safe(() => this.notifier?.notifyAgentToolApprovalRequested?.(payload));
  }

  publishToolApproved(payload: AgentOutboxToolPayload): void {
    this.safe(() => this.notifier?.notifyAgentToolApproved?.(payload));
  }

  publishToolDenied(payload: AgentOutboxToolPayload): void {
    this.safe(() => this.notifier?.notifyAgentToolDenied?.(payload));
  }

  publishToolExecutionStarted(payload: AgentOutboxToolPayload): void {
    this.safe(() => this.notifier?.notifyAgentToolExecutionStarted?.(payload));
  }

  publishToolExecutionSucceeded(payload: AgentOutboxToolPayload): void {
    this.safe(() => this.notifier?.notifyAgentToolExecutionSucceeded?.(payload));
  }

  publishToolExecutionFailed(payload: AgentOutboxToolPayload): void {
    this.safe(() => this.notifier?.notifyAgentToolExecutionFailed?.(payload));
  }

  publishToolExecutionInterrupted(payload: AgentOutboxToolPayload): void {
    this.safe(() => this.notifier?.notifyAgentToolExecutionInterrupted?.(payload));
  }

  publishTurnStarted(turnId: string): void {
    this.safe(() => this.notifier?.notifyAgentTurnStarted?.(turnId));
  }

  publishTurnCompleted(turnId: string): void {
    this.safe(() => this.notifier?.notifyAgentTurnCompleted?.(turnId));
  }

  publishTurnInterrupted(turnId: string, reason: string): void {
    this.safe(() => this.notifier?.notifyAgentTurnInterrupted?.(turnId, reason));
  }

  publishSystemTaskNotification(payload: Record<string, any>): void {
    this.safe(() => this.notifier?.notifyAgentDataSystemTaskNotificationReceived?.(payload));
  }

  publishInterAgentMessage(payload: Record<string, any>): void {
    this.safe(() => this.notifier?.notifyAgentDataInterAgentMessageReceived?.(payload));
  }

  publishError(source: string, message: string, details?: string): void {
    this.safe(() => this.notifier?.notifyAgentErrorOutputGeneration?.(source, message, details));
  }

  publishCompactionStatus(payload: Record<string, any>): void {
    this.safe(() => this.notifier?.notifyAgentCompactionStatus?.(payload));
  }

  private safe(run: () => void): void {
    try {
      run();
    } catch (error) {
      console.error(`AgentOutbox '${this.agentId}' failed to publish message: ${String(error)}`);
    }
  }
}
