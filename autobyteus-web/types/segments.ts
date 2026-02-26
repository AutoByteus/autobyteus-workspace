/**
 * Segment Types - Types for AI response segments.
 * 
 * These types define the different kinds of content segments that can appear
 * in an AI message (text, files, tool calls, etc.). They are used by both
 * the streaming service handlers and the UI components.
 */

export interface ParsedFile {
  path: string;
  originalContent: string;
  highlightedContent?: string;
  language: string;
}

export type ToolInvocationStatus =
  | 'parsing'
  | 'parsed'
  | 'awaiting-approval'
  | 'approved'
  | 'executing'
  | 'success'
  | 'error'
  | 'denied';

export interface ToolInvocationLifecycle {
  invocationId: string;
  toolName: string;
  arguments: Record<string, any>;
  status: ToolInvocationStatus;
  logs: string[];
  result: any | null;
  error: string | null;
}

export interface AIResponseTextSegment {
  type: 'text';
  content: string;
}

export interface WriteFileSegment extends ToolInvocationLifecycle {
  type: 'write_file';
  path: string;
  originalContent: string;
  highlightedContent?: string;
  language: string;
}

export interface ThinkSegment {
  type: 'think';
  content: string;
}

export interface ToolCallSegment extends ToolInvocationLifecycle {
  type: 'tool_call';
  rawContent?: string;
}

export interface TerminalCommandSegment extends ToolInvocationLifecycle {
  type: 'terminal_command';
  command: string;
  description: string;
}

export interface EditFileSegment extends ToolInvocationLifecycle {
  type: 'edit_file';
  path: string;
  originalContent: string; // The patch content
  language: string;
}

export interface SystemTaskNotificationSegment {
  type: 'system_task_notification';
  senderId: string;
  content: string;
}

export interface InterAgentMessageSegment {
  type: 'inter_agent_message';
  senderAgentId: string;
  recipientRoleName: string;
  messageType: string;
  content: string;
}

export interface MediaSegment {
  type: 'media';
  mediaType: 'image' | 'audio' | 'video';
  urls: string[];
}

export interface ErrorSegment {
  type: 'error';
  source: string;
  message: string;
  details?: string | null;
}

export type AIResponseSegment = 
  | AIResponseTextSegment 
  | WriteFileSegment 
  | ThinkSegment
  | ToolCallSegment
  | ToolCallSegment
  | TerminalCommandSegment
  | EditFileSegment
  | SystemTaskNotificationSegment
  | InterAgentMessageSegment
  | MediaSegment
  | ErrorSegment;

export interface ParsedAIResponse {
  segments: AIResponseSegment[];
}
