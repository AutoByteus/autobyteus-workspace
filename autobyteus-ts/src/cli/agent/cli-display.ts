import { AgentStatus } from '../../agent/status/status-enum.js';
import { StreamEvent, StreamEventType } from '../../agent/streaming/events/stream-events.js';
import {
  AssistantChunkData,
  AssistantCompleteResponseData,
  ToolApprovalRequestedData,
  ToolApprovedData,
  ToolExecutionStartedData,
  ToolExecutionSucceededData,
  ToolExecutionFailedData,
  ToolDeniedData,
  ToolInteractionLogEntryData,
  AgentStatusUpdateData,
  ErrorEventData,
  SegmentEventData
} from '../../agent/streaming/events/stream-event-payloads.js';
import { SegmentEventType, SegmentType } from '../../agent/streaming/segments/segment-events.js';

export interface CliWriter {
  write(text: string): void;
  flush?: () => void;
}

const defaultWriter: CliWriter = {
  write: (text: string) => {
    process.stdout.write(text);
  }
};

export class InteractiveCliDisplay {
  private writer: CliWriter;
  private showToolLogs: boolean;
  private showTokenUsage: boolean;
  private onTurnComplete?: () => void;
  private currentLineEmpty = true;
  private agentHasSpokenThisTurn = false;
  private pendingApprovalData: ToolApprovalRequestedData | null = null;
  private approvalPromptShown = false;
  private currentStatus: AgentStatus | null = null;
  private awaitingApproval = false;
  private isThinking = false;
  private isInContentBlock = false;
  private segmentTypesById = new Map<string, SegmentType>();
  private sawSegmentEvent = false;

  constructor(options: {
    writer?: CliWriter;
    showToolLogs?: boolean;
    showTokenUsage?: boolean;
    onTurnComplete?: () => void;
  } = {}) {
    this.writer = options.writer ?? defaultWriter;
    this.showToolLogs = options.showToolLogs ?? true;
    this.showTokenUsage = options.showTokenUsage ?? false;
    this.onTurnComplete = options.onTurnComplete;
  }

  resetTurnState(): void {
    this.endThinkingBlock();
    this.agentHasSpokenThisTurn = false;
    this.isInContentBlock = false;
    this.segmentTypesById.clear();
    this.sawSegmentEvent = false;
  }

  getApprovalPrompt(): string | null {
    if (!this.pendingApprovalData) {
      return null;
    }

    let argsStr: string;
    try {
      argsStr = JSON.stringify(this.pendingApprovalData.arguments, null, 2);
    } catch {
      argsStr = String(this.pendingApprovalData.arguments);
    }

    this.ensureNewLine();
    return (
      `Tool Call: '${this.pendingApprovalData.tool_name}' requests permission to run with arguments:\n` +
      `${argsStr}\nApprove? (y/n): `
    );
  }

  clearPendingApproval(): void {
    this.pendingApprovalData = null;
    this.approvalPromptShown = false;
  }

  getPendingApprovalData(): ToolApprovalRequestedData | null {
    return this.pendingApprovalData;
  }

  async handleStreamEvent(event: StreamEvent): Promise<void> {
    if (event.event_type === StreamEventType.SEGMENT_EVENT && event.data instanceof SegmentEventData) {
      this.handleSegmentEvent(event.data);
      return;
    }

    if (event.event_type === StreamEventType.ASSISTANT_CHUNK && event.data instanceof AssistantChunkData) {
      this.handleAssistantChunk(event.data);
      return;
    }

    this.endThinkingBlock();
    this.ensureNewLine();

    if (
      event.event_type === StreamEventType.ASSISTANT_COMPLETE_RESPONSE &&
      event.data instanceof AssistantCompleteResponseData
    ) {
      this.handleAssistantCompleteResponse(event.data);
      return;
    }

    if (
      event.event_type === StreamEventType.TOOL_APPROVAL_REQUESTED &&
      event.data instanceof ToolApprovalRequestedData
    ) {
      this.pendingApprovalData = event.data;
      if (this.awaitingApproval || this.currentStatus === AgentStatus.AWAITING_TOOL_APPROVAL) {
        this.onTurnComplete?.();
      }
      return;
    }

    if (
      event.event_type === StreamEventType.TOOL_EXECUTION_STARTED &&
      event.data instanceof ToolExecutionStartedData
    ) {
      const toolName = event.data.tool_name;
      this.ensureNewLine();
      this.write(`Agent: Executing tool '${toolName}'...\n`);
      this.currentLineEmpty = true;
      this.agentHasSpokenThisTurn = true;
      return;
    }

    if (event.event_type === StreamEventType.TOOL_APPROVED && event.data instanceof ToolApprovedData) {
      const toolName = event.data.tool_name;
      this.ensureNewLine();
      this.write(`Agent: Tool '${toolName}' approved. Preparing execution.\n`);
      this.currentLineEmpty = true;
      this.agentHasSpokenThisTurn = true;
      return;
    }

    if (event.event_type === StreamEventType.TOOL_DENIED && event.data instanceof ToolDeniedData) {
      const toolName = event.data.tool_name;
      const reason = event.data.reason ?? event.data.error ?? 'Tool was denied.';
      this.ensureNewLine();
      this.write(`Agent: Tool '${toolName}' denied. Reason: ${reason}\n`);
      this.currentLineEmpty = true;
      this.agentHasSpokenThisTurn = true;
      return;
    }

    if (
      event.event_type === StreamEventType.TOOL_EXECUTION_SUCCEEDED &&
      event.data instanceof ToolExecutionSucceededData
    ) {
      this.ensureNewLine();
      this.write(`Agent: Tool '${event.data.tool_name}' completed.\n`);
      this.currentLineEmpty = true;
      this.agentHasSpokenThisTurn = true;
      return;
    }

    if (
      event.event_type === StreamEventType.TOOL_EXECUTION_FAILED &&
      event.data instanceof ToolExecutionFailedData
    ) {
      this.ensureNewLine();
      this.write(`Agent: Tool '${event.data.tool_name}' failed: ${event.data.error}\n`);
      this.currentLineEmpty = true;
      this.agentHasSpokenThisTurn = true;
      return;
    }

    if (
      event.event_type === StreamEventType.TOOL_INTERACTION_LOG_ENTRY &&
      event.data instanceof ToolInteractionLogEntryData
    ) {
      if (this.showToolLogs) {
        console.info(
          `[Tool Log (${event.data.tool_name} | ${event.data.tool_invocation_id})]: ${event.data.log_entry}`
        );
      }
      return;
    }

    if (event.event_type === StreamEventType.AGENT_STATUS_UPDATED && event.data instanceof AgentStatusUpdateData) {
      this.currentStatus = event.data.new_status;
      if (event.data.new_status === AgentStatus.AWAITING_TOOL_APPROVAL) {
        this.awaitingApproval = true;
        if (this.pendingApprovalData) {
          this.onTurnComplete?.();
        }
      } else {
        this.awaitingApproval = false;
      }

      if ([AgentStatus.IDLE, AgentStatus.ERROR].includes(event.data.new_status)) {
        this.onTurnComplete?.();
      }

      if (event.data.new_status === AgentStatus.EXECUTING_TOOL) {
        const toolName = event.data.tool_name ?? 'a tool';
        this.write(`Agent: Waiting for tool '${toolName}' to complete...\n`);
        this.currentLineEmpty = true;
        this.agentHasSpokenThisTurn = true;
      } else if (event.data.new_status === AgentStatus.IDLE) {
        console.info('[Agent is now idle.]');
      } else if (event.data.new_status === AgentStatus.BOOTSTRAPPING) {
        console.info('[Agent is initializing...]');
      } else if (event.data.new_status === AgentStatus.TOOL_DENIED) {
        const toolName = event.data.tool_name ?? 'a tool';
        console.info(`[Tool '${toolName}' was denied by user. Agent is reconsidering.]`);
      } else {
        let statusMsg = `[Agent Status: ${event.data.new_status}`;
        if (event.data.tool_name) {
          statusMsg += ` (${event.data.tool_name})`;
        }
        statusMsg += ']';
        console.info(statusMsg);
      }
      return;
    }

    if (event.event_type === StreamEventType.ERROR_EVENT && event.data instanceof ErrorEventData) {
      console.error(`[Error: ${event.data.message} (Source: ${event.data.source})]`);
      this.onTurnComplete?.();
      return;
    }

    console.debug(`CLI Display: Unhandled StreamEvent type: ${event.event_type}`);
  }

  private handleAssistantChunk(eventData: AssistantChunkData): void {
    if (!this.agentHasSpokenThisTurn) {
      this.ensureNewLine();
      this.write('Agent:\n');
      this.agentHasSpokenThisTurn = true;
      this.currentLineEmpty = true;
    }

    if (eventData.reasoning) {
      if (!this.isThinking) {
        this.write('<Thinking>\n');
        this.isThinking = true;
        this.currentLineEmpty = true;
      }
      this.write(eventData.reasoning);
      this.currentLineEmpty = eventData.reasoning.endsWith('\n');
    }

    if (eventData.content) {
      if (!this.isInContentBlock) {
        this.ensureNewLine();
        this.isInContentBlock = true;
      }
      this.write(eventData.content);
      this.currentLineEmpty = eventData.content.endsWith('\n');
    }

    if (this.showTokenUsage && eventData.is_complete && eventData.usage) {
      const usage = eventData.usage;
      console.info(
        `[Token Usage: Prompt=${usage.prompt_tokens}, Completion=${usage.completion_tokens}, Total=${usage.total_tokens}]`
      );
    }
  }

  private handleAssistantCompleteResponse(eventData: AssistantCompleteResponseData): void {
    if (!this.sawSegmentEvent && !this.agentHasSpokenThisTurn) {
      this.ensureNewLine();
      if (eventData.content) {
        this.write(`Agent: ${eventData.content}\n`);
      }
    }

    if (this.showTokenUsage && eventData.usage) {
      const usage = eventData.usage;
      console.info(
        `[Token Usage: Prompt=${usage.prompt_tokens}, Completion=${usage.completion_tokens}, Total=${usage.total_tokens}]`
      );
    }

    this.currentLineEmpty = true;
    this.resetTurnState();
  }

  private handleSegmentEvent(segmentEvent: SegmentEventData): void {
    const eventTypeValue = segmentEvent.event_type;
    const eventType = Object.values(SegmentEventType).includes(eventTypeValue as SegmentEventType)
      ? (eventTypeValue as SegmentEventType)
      : null;
    if (!eventType) {
      console.debug(`CLI Display: Unknown segment event type '${segmentEvent.event_type}'.`);
      return;
    }

    this.sawSegmentEvent = true;

    let segmentType: SegmentType | undefined;
    if (segmentEvent.segment_type) {
      if (Object.values(SegmentType).includes(segmentEvent.segment_type as SegmentType)) {
        segmentType = segmentEvent.segment_type as SegmentType;
      } else {
        console.debug(`CLI Display: Unknown segment type '${segmentEvent.segment_type}'.`);
      }
    }

    if (!segmentType && this.segmentTypesById.has(segmentEvent.segment_id)) {
      segmentType = this.segmentTypesById.get(segmentEvent.segment_id);
    }

    const payload =
      typeof segmentEvent.payload === 'object' && segmentEvent.payload !== null
        ? (segmentEvent.payload as Record<string, unknown>)
        : {};
    const metadata = (payload.metadata as Record<string, unknown> | undefined) ?? {};

    if (eventType === SegmentEventType.START) {
      if (segmentType !== undefined) {
        this.segmentTypesById.set(segmentEvent.segment_id, segmentType);
      }

      if (segmentType !== SegmentType.REASONING) {
        this.endThinkingBlock();
      }

      this.ensureAgentPrefix();

      if (segmentType === SegmentType.REASONING) {
        if (!this.isThinking) {
          this.write('<Thinking>\n');
          this.isThinking = true;
          this.currentLineEmpty = true;
        }
        return;
      }

      if (segmentType === SegmentType.WRITE_FILE) {
        const path = metadata.path ?? '';
        const header = path ? `<write_file path="${path}">` : '<write_file>';
        this.write(`${header}\n`);
        this.currentLineEmpty = true;
        this.isInContentBlock = true;
        return;
      }

      if (segmentType === SegmentType.RUN_BASH) {
        this.write('<run_bash>\n');
        this.currentLineEmpty = true;
        this.isInContentBlock = true;
        return;
      }

      if (segmentType === SegmentType.TOOL_CALL) {
        const toolName = metadata.tool_name ?? '';
        const header = toolName ? `<tool name="${toolName}">` : '<tool>';
        this.write(`${header}\n`);
        this.currentLineEmpty = true;
        this.isInContentBlock = true;
        return;
      }

      this.isInContentBlock = true;
      return;
    }

    if (eventType === SegmentEventType.CONTENT) {
      const delta = (payload as Record<string, unknown>).delta;
      if (segmentType === SegmentType.REASONING) {
        if (!this.isThinking) {
          this.ensureAgentPrefix();
          this.write('<Thinking>\n');
          this.isThinking = true;
        }
        this.write(String(delta ?? ''));
        this.currentLineEmpty = String(delta ?? '').endsWith('\n');
        return;
      }

      const deltaText = delta !== undefined && delta !== null ? String(delta) : '';
      if (deltaText) {
        this.ensureAgentPrefix();
        this.write(deltaText);
        this.currentLineEmpty = deltaText.endsWith('\n');
        this.isInContentBlock = true;
      }
      return;
    }

    if (eventType === SegmentEventType.END) {
      if (segmentType === SegmentType.REASONING) {
        this.endThinkingBlock();
        this.segmentTypesById.delete(segmentEvent.segment_id);
        return;
      }

      if (segmentType === SegmentType.WRITE_FILE) {
        this.write('\n</write_file>\n');
        this.currentLineEmpty = true;
        this.isInContentBlock = false;
        this.segmentTypesById.delete(segmentEvent.segment_id);
        return;
      }

      if (segmentType === SegmentType.RUN_BASH) {
        this.write('\n</run_bash>\n');
        this.currentLineEmpty = true;
        this.isInContentBlock = false;
        this.segmentTypesById.delete(segmentEvent.segment_id);
        return;
      }

      if (segmentType === SegmentType.TOOL_CALL) {
        this.write('\n</tool>\n');
        this.currentLineEmpty = true;
        this.isInContentBlock = false;
        this.segmentTypesById.delete(segmentEvent.segment_id);
        return;
      }

      if (segmentType === SegmentType.TEXT) {
        this.isInContentBlock = false;
        this.segmentTypesById.delete(segmentEvent.segment_id);
        return;
      }

      this.segmentTypesById.delete(segmentEvent.segment_id);
    }
  }

  private ensureNewLine(): void {
    if (!this.currentLineEmpty) {
      this.write('\n');
      this.currentLineEmpty = true;
    }
  }

  private endThinkingBlock(): void {
    if (this.isThinking) {
      this.write('\n</Thinking>');
      this.isThinking = false;
      this.currentLineEmpty = false;
    }
  }

  private ensureAgentPrefix(): void {
    if (!this.agentHasSpokenThisTurn) {
      this.ensureNewLine();
      this.write('Agent:\n');
      this.agentHasSpokenThisTurn = true;
      this.currentLineEmpty = true;
    }
  }

  private write(text: string): void {
    this.writer.write(text);
    this.writer.flush?.();
  }
}
