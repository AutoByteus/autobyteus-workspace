import { StreamEventType } from '../../../agent/streaming/events/stream-events.js';
import { SegmentEventType, SegmentType } from '../../../agent/streaming/segments/segment-events.js';
import type { StreamEvent } from '../../../agent/streaming/stream-events.js';
import type {
  SegmentEventData,
  AssistantCompleteResponseData,
  ToolInteractionLogEntryData,
  ToolApprovalRequestedData,
  ToolExecutionStartedData,
  ToolDeniedData,
  ToolExecutionSucceededData,
  ToolExecutionFailedData,
  SystemTaskNotificationData,
  ErrorEventData
} from '../../../agent/streaming/events/stream-event-payloads.js';
import type { HistoryEvent, UiHistoryEvent } from '../state-store.js';
import {
  renderAssistantCompleteResponse,
  renderToolInteractionLog,
  renderToolApprovalRequest,
  renderToolExecutionStarted,
  renderToolDenied,
  renderToolExecutionSucceeded,
  renderToolExecutionFailed,
  renderSystemTaskNotification,
  renderError
} from './renderables.js';
import { ASSISTANT_ICON, USER_ICON } from './shared.js';

const isUiEvent = (event: HistoryEvent): event is UiHistoryEvent =>
  event.event_type === 'ui_user_message' || event.event_type === 'ui_tool_decision';

export const buildHistoryLines = (history: HistoryEvent[]): string[] => {
  const lines: string[] = [];
  const segmentTypes = new Map<string, SegmentType>();
  let sawSegmentEvent = false;
  let sawChunkEvent = false;
  let reasoningBuffer = '';
  let contentBuffer = '';
  let thinkingOpen = false;
  let assistantOpen = false;

  const ensureAssistantPrefix = () => {
    if (!assistantOpen) {
      contentBuffer = `${ASSISTANT_ICON} assistant: ${contentBuffer}`;
      assistantOpen = true;
    }
  };

  const ensureThinkingStart = () => {
    if (!thinkingOpen) {
      lines.push('<Thinking>');
      thinkingOpen = true;
    }
  };

  const closeThinking = (force: boolean = false) => {
    if (!thinkingOpen && !force) {
      return;
    }
    if (reasoningBuffer) {
      lines.push(reasoningBuffer);
      reasoningBuffer = '';
    }
    if (thinkingOpen) {
      lines.push('</Thinking>');
      thinkingOpen = false;
    }
  };

  const flushAssistant = () => {
    if (contentBuffer) {
      lines.push(contentBuffer);
      contentBuffer = '';
    }
    assistantOpen = false;
  };

  for (const event of history) {
    if (isUiEvent(event)) {
      lines.push(`${USER_ICON} You: ${event.data.content}`);
      continue;
    }

    if (event.event_type === StreamEventType.SEGMENT_EVENT) {
      sawSegmentEvent = true;
      const data = event.data as SegmentEventData;
      const segmentType = data.segment_type as SegmentType | undefined;
      const payload = data.payload ?? {};
      const delta = payload?.delta ?? '';
      const segmentId = data.segment_id;
      const knownType = segmentType ?? segmentTypes.get(segmentId);
      const metadata = payload?.metadata ?? {};

      if (data.event_type === SegmentEventType.START) {
        if (knownType) {
          segmentTypes.set(segmentId, knownType);
        }
        if (segmentType !== SegmentType.REASONING) {
          closeThinking();
          ensureAssistantPrefix();
        }
        if (segmentType === SegmentType.REASONING) {
          ensureThinkingStart();
        } else if (segmentType === SegmentType.WRITE_FILE) {
          const path = metadata?.path ?? '';
          contentBuffer += path ? `<write_file path="${path}">\n` : '<write_file>\n';
        } else if (segmentType === SegmentType.RUN_BASH) {
          contentBuffer += '<run_bash>\n';
        } else if (segmentType === SegmentType.TOOL_CALL) {
          const toolName = metadata?.tool_name ?? '';
          contentBuffer += toolName ? `<tool name="${toolName}">\n` : '<tool>\n';
        }
      } else if (data.event_type === SegmentEventType.CONTENT) {
        const content = String(delta ?? '');
        if (content) {
          if (knownType === SegmentType.REASONING) {
            ensureThinkingStart();
            reasoningBuffer += content;
          } else {
            ensureAssistantPrefix();
            contentBuffer += content;
          }
        }
      } else if (data.event_type === SegmentEventType.END) {
        if (knownType === SegmentType.REASONING) {
          closeThinking(true);
        } else if (knownType === SegmentType.WRITE_FILE) {
          ensureAssistantPrefix();
          contentBuffer += '\n</write_file>\n';
        } else if (knownType === SegmentType.RUN_BASH) {
          ensureAssistantPrefix();
          contentBuffer += '\n</run_bash>\n';
        } else if (knownType === SegmentType.TOOL_CALL) {
          ensureAssistantPrefix();
          contentBuffer += '\n</tool>\n';
        }
        segmentTypes.delete(segmentId);
      }
      continue;
    }

    if (event.event_type === StreamEventType.ASSISTANT_CHUNK) {
      const data = event.data as { content?: string; reasoning?: string };
      const reasoningDelta = data?.reasoning ?? '';
      const contentDelta = data?.content ?? '';
      if (reasoningDelta || contentDelta) {
        sawChunkEvent = true;
      }
      if (reasoningDelta) {
        ensureThinkingStart();
        reasoningBuffer += String(reasoningDelta);
      }
      if (contentDelta) {
        closeThinking();
        ensureAssistantPrefix();
        contentBuffer += String(contentDelta);
      }
      continue;
    }

    if (event.event_type === StreamEventType.ASSISTANT_COMPLETE_RESPONSE) {
      if (!sawSegmentEvent && !sawChunkEvent) {
        lines.push(...renderAssistantCompleteResponse(event.data as AssistantCompleteResponseData));
      } else {
        closeThinking();
        flushAssistant();
      }
      sawSegmentEvent = false;
      sawChunkEvent = false;
      reasoningBuffer = '';
      contentBuffer = '';
      thinkingOpen = false;
      assistantOpen = false;
      continue;
    }
    if (event.event_type === StreamEventType.TOOL_INTERACTION_LOG_ENTRY) {
      closeThinking();
      flushAssistant();
      lines.push(renderToolInteractionLog(event.data as ToolInteractionLogEntryData));
      continue;
    }
    if (event.event_type === StreamEventType.TOOL_APPROVAL_REQUESTED) {
      closeThinking();
      flushAssistant();
      lines.push(renderToolApprovalRequest(event.data as ToolApprovalRequestedData));
      continue;
    }
    if (event.event_type === StreamEventType.TOOL_EXECUTION_STARTED) {
      closeThinking();
      flushAssistant();
      lines.push(renderToolExecutionStarted(event.data as ToolExecutionStartedData));
      continue;
    }
    if (event.event_type === StreamEventType.TOOL_DENIED) {
      closeThinking();
      flushAssistant();
      lines.push(renderToolDenied(event.data as ToolDeniedData));
      continue;
    }
    if (event.event_type === StreamEventType.TOOL_EXECUTION_SUCCEEDED) {
      closeThinking();
      flushAssistant();
      lines.push(renderToolExecutionSucceeded(event.data as ToolExecutionSucceededData));
      continue;
    }
    if (event.event_type === StreamEventType.TOOL_EXECUTION_FAILED) {
      closeThinking();
      flushAssistant();
      lines.push(renderToolExecutionFailed(event.data as ToolExecutionFailedData));
      continue;
    }
    if (event.event_type === StreamEventType.SYSTEM_TASK_NOTIFICATION) {
      closeThinking();
      flushAssistant();
      lines.push(renderSystemTaskNotification(event.data as SystemTaskNotificationData));
      continue;
    }
    if (event.event_type === StreamEventType.ERROR_EVENT) {
      closeThinking();
      flushAssistant();
      lines.push(renderError(event.data as ErrorEventData));
      continue;
    }
  }

  if (reasoningBuffer) {
    lines.push(reasoningBuffer);
  }
  if (thinkingOpen && reasoningBuffer) {
    // Keep thinking block open while streaming.
  } else if (thinkingOpen) {
    lines.push('</Thinking>');
  }
  if (contentBuffer) {
    lines.push(contentBuffer);
  }

  return lines;
};

const splitPreserve = (line: string): string[] => {
  if (!line) {
    return [''];
  }
  return line.split(/\r?\n/);
};

const wrapLine = (line: string, width: number): string[] => {
  if (width <= 1) {
    return [line.slice(0, Math.max(0, width))];
  }
  if (line.length <= width) {
    return [line];
  }

  const leadingMatch = line.match(/^\s+/);
  const leading = leadingMatch ? leadingMatch[0] : '';
  const available = Math.max(1, width - leading.length);
  const chunks: string[] = [];
  let remaining = line.trimStart();
  let prefix = leading;

  while (remaining.length > available) {
    const slice = remaining.slice(0, available);
    let breakIndex = slice.lastIndexOf(' ');
    if (breakIndex <= 0) {
      breakIndex = available;
    }
    const part = remaining.slice(0, breakIndex).trimEnd();
    chunks.push(prefix + part);
    remaining = remaining.slice(breakIndex).trimStart();
    prefix = leading;
  }

  if (remaining.length > 0 || chunks.length === 0) {
    chunks.push(prefix + remaining);
  }
  return chunks;
};

export const wrapHistoryLines = (lines: string[], width: number): string[] => {
  const wrapped: string[] = [];
  const safeWidth = Math.max(1, width);

  for (const line of lines) {
    for (const raw of splitPreserve(line)) {
      wrapped.push(...wrapLine(raw, safeWidth));
    }
  }

  return wrapped;
};
