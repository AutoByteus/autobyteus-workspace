import type { Message } from '../../llm/utils/messages.js';

export type WorkingContextMessageUnitKind =
  | 'system'
  | 'compacted_memory'
  | 'message'
  | 'tool_protocol_group';

export type WorkingContextMessageUnitBase = {
  id: string;
  kind: WorkingContextMessageUnitKind;
  startIndex: number;
  endIndex: number;
  messages: Message[];
  rawTraceIds: string[];
};

export type SystemMessageUnit = WorkingContextMessageUnitBase & {
  kind: 'system';
};

export type CompactedMemoryMessageUnit = WorkingContextMessageUnitBase & {
  kind: 'compacted_memory';
};

export type NormalMessageUnit = WorkingContextMessageUnitBase & {
  kind: 'message';
};

export type ToolProtocolMessageUnit = WorkingContextMessageUnitBase & {
  kind: 'tool_protocol_group';
  toolCallIds: string[];
  matchedToolCallIds: string[];
  isComplete: boolean;
};

export type WorkingContextMessageUnit =
  | SystemMessageUnit
  | CompactedMemoryMessageUnit
  | NormalMessageUnit
  | ToolProtocolMessageUnit;

export type MessageCompactionPlan = {
  units: WorkingContextMessageUnit[];
  headMessages: Message[];
  compactableUnits: WorkingContextMessageUnit[];
  retainedUnits: WorkingContextMessageUnit[];
  protectedSuffixUnits: WorkingContextMessageUnit[];
  retainedMessages: Message[];
  rawTraceIdsToArchive: string[];
  estimatedRetainedTokens: number;
  estimatedCompactedTokens: number;
};
