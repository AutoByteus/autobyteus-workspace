import { Message, MessageRole, ToolCallPayload, ToolCallSpec, ToolResultPayload } from '../llm/utils/messages.js';

export type AssistantToolCallEnvelope = {
  content?: string | null;
  reasoningContent?: string | null;
};

export class WorkingContextSnapshot {
  private messages: Message[] = [];
  epochId = 1;
  lastCompactionTs: number | null = null;

  constructor(initialMessages?: Iterable<Message>) {
    if (initialMessages) {
      this.messages = Array.from(initialMessages);
    }
  }

  appendMessage(message: Message): void {
    this.messages.push(message);
  }

  appendUser(content: string): void {
    this.messages.push(new Message(MessageRole.USER, { content }));
  }

  appendAssistant(content: string | null, reasoning: string | null = null): void {
    this.messages.push(new Message(MessageRole.ASSISTANT, {
      content,
      reasoning_content: reasoning
    }));
  }

  appendToolCalls(toolCalls: ToolCallSpec[], envelope: AssistantToolCallEnvelope = {}): void {
    this.messages.push(new Message(MessageRole.ASSISTANT, {
      content: envelope.content ?? null,
      reasoning_content: envelope.reasoningContent ?? null,
      tool_payload: new ToolCallPayload(toolCalls)
    }));
  }

  appendToolResult(
    toolCallId: string,
    toolName: string,
    toolResult: unknown,
    toolError: string | null = null
  ): void {
    this.messages.push(new Message(MessageRole.TOOL, {
      content: null,
      tool_payload: new ToolResultPayload(toolCallId, toolName, toolResult, toolError)
    }));
  }

  appendToolResults(
    toolResults: Array<{
      toolCallId: string;
      toolName: string;
      toolResult: unknown;
      toolError?: string | null;
    }>
  ): void {
    for (const result of toolResults) {
      this.appendToolResult(
        result.toolCallId,
        result.toolName,
        result.toolResult,
        result.toolError ?? null
      );
    }
  }

  buildMessages(): Message[] {
    return [...this.messages];
  }

  reset(snapshotMessages: Iterable<Message>, lastCompactionTs?: number | null): void {
    this.messages = Array.from(snapshotMessages);
    this.epochId += 1;
    this.lastCompactionTs = typeof lastCompactionTs === 'number' ? lastCompactionTs : Date.now() / 1000;
  }
}
