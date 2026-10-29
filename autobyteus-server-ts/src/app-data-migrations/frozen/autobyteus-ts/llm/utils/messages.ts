/**
 * Core Message types for LLM interaction.
 */

import type { ProviderNativeToolCallContext } from './tool-call-delta.js';

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
  nativeToolCallContext?: ProviderNativeToolCallContext;
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

export type MessageMetadata = Record<string, unknown>;

export interface MessageOptions {
  content?: string | null;
  reasoning_content?: string | null;
  image_urls?: string[];
  audio_urls?: string[];
  video_urls?: string[];
  tool_payload?: ToolPayload | null;
  metadata?: MessageMetadata | null;
}

export class Message {
  public role: MessageRole;
  public content: string | null;
  public reasoning_content: string | null;
  public image_urls: string[];
  public audio_urls: string[];
  public video_urls: string[];
  public tool_payload: ToolPayload | null;
  public metadata: MessageMetadata | null;

  constructor(role: MessageRole, options: MessageOptions | string = {}) {
    this.role = role;

    if (typeof options === 'string') {
      this.content = options;
      this.reasoning_content = null;
      this.image_urls = [];
      this.audio_urls = [];
      this.video_urls = [];
      this.tool_payload = null;
      this.metadata = null;
    } else {
      this.content = options.content ?? null;
      this.reasoning_content = options.reasoning_content ?? null;
      this.image_urls = options.image_urls ?? [];
      this.audio_urls = options.audio_urls ?? [];
      this.video_urls = options.video_urls ?? [];
      this.tool_payload = options.tool_payload ?? null;
      this.metadata = options.metadata ?? null;
    }
  }
}
