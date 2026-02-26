/**
 * Core Message types for LLM interaction.
 */

export enum MessageRole {
  SYSTEM = "system",
  USER = "user",
  ASSISTANT = "assistant",
  TOOL = "tool"
}

export type ToolCallSpec = {
  id: string;
  name: string;
  arguments: Record<string, any>;
};

export class ToolCallPayload {
  toolCalls: ToolCallSpec[];

  constructor(toolCalls: ToolCallSpec[]) {
    this.toolCalls = toolCalls;
  }
}

export class ToolResultPayload {
  toolCallId: string;
  toolName: string;
  toolResult: any;
  toolError: string | null;

  constructor(toolCallId: string, toolName: string, toolResult: any, toolError: string | null = null) {
    this.toolCallId = toolCallId;
    this.toolName = toolName;
    this.toolResult = toolResult;
    this.toolError = toolError;
  }
}

export type ToolPayload = ToolCallPayload | ToolResultPayload;

export interface MessageOptions {
  content?: string | null;
  reasoning_content?: string | null;
  image_urls?: string[];
  audio_urls?: string[];
  video_urls?: string[];
  tool_payload?: ToolPayload | null;
}

export class Message {
  public role: MessageRole;
  public content: string | null;
  public reasoning_content: string | null;
  public image_urls: string[];
  public audio_urls: string[];
  public video_urls: string[];
  public tool_payload: ToolPayload | null;

  constructor(role: MessageRole, options: MessageOptions | string = {}) {
    this.role = role;
    
    if (typeof options === 'string') {
      this.content = options;
      this.reasoning_content = null;
      this.image_urls = [];
      this.audio_urls = [];
      this.video_urls = [];
      this.tool_payload = null;
    } else {
      this.content = options.content ?? null;
      this.reasoning_content = options.reasoning_content ?? null;
      this.image_urls = options.image_urls ?? [];
      this.audio_urls = options.audio_urls ?? [];
      this.video_urls = options.video_urls ?? [];
      this.tool_payload = options.tool_payload ?? null;
    }
  }

  private serializeToolPayload(): Record<string, unknown> | null {
    if (!this.tool_payload) {
      return null;
    }

    if (this.tool_payload instanceof ToolCallPayload) {
      return {
        tool_calls: this.tool_payload.toolCalls.map((call) => ({
          id: call.id,
          name: call.name,
          arguments: call.arguments
        }))
      };
    }

    if (this.tool_payload instanceof ToolResultPayload) {
      return {
        tool_call_id: this.tool_payload.toolCallId,
        tool_name: this.tool_payload.toolName,
        tool_result: this.tool_payload.toolResult,
        tool_error: this.tool_payload.toolError
      };
    }

    return null;
  }

  /**
   * Returns a simple dictionary representation of the Message object.
   * This is for internal use and does not format for any specific API.
   */
  public toDict(): Record<string, unknown> {
    return {
      role: this.role,
      content: this.content,
      reasoning_content: this.reasoning_content,
      image_urls: this.image_urls,
      audio_urls: this.audio_urls,
      video_urls: this.video_urls,
      tool_payload: this.serializeToolPayload()
    };
  }
}
