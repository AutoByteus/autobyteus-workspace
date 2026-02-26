import type { AIResponseSegment } from '~/types/segments';
import type { ContextFileType } from '~/generated/graphql';

export interface ContextFilePath {
  path: string;
  type: keyof typeof ContextFileType;
}

export interface Message {
  type: 'user' | 'ai';
  timestamp: Date;
}

export interface UserMessage extends Message {
  type: 'user';
  text: string;
  contextFilePaths?: ContextFilePath[];
  promptTokens?: number;
  promptCost?: number;
}

export interface AIMessage extends Message {
  type: 'ai';
  text: string;
  segments: AIResponseSegment[];
  isComplete: boolean;
  completionTokens?: number;
  completionCost?: number;
  reasoning?: string | null;
  imageUrls?: string[] | null;
  audioUrls?: string[] | null;
  videoUrls?: string[] | null;
}

export interface Conversation {
  id: string; // This will be runId after the first message
  messages: (UserMessage | AIMessage)[];
  createdAt: string;
  updatedAt: string;
  // This is used for sending the first message to create a new agent run.
  agentDefinitionId?: string;
  // Optional name aggregated from definition
  agentName?: string;
  // This is set on the first turn and persists for the conversation.
  llmModelIdentifier?: string;
  // This is set on the first turn and persists for the conversation.

  // This will be populated from historical conversations
}
