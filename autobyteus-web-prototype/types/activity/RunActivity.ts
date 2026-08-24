import type { CompactionStatusPhase } from '~/types/agent/AgentRunState';
import type { ToolApprovalTarget, ToolInvocationStatus } from '~/types/segments';

export type RunActivityKind = 'tool' | 'compaction' | 'system_instruction';

export interface RunActivityBase<K extends RunActivityKind> {
  kind: K;
  activityId: string;
  timestamp: Date;
}

export type ToolActivityType = 'tool_call' | 'write_file' | 'terminal_command' | 'edit_file';

export interface ToolActivity extends RunActivityBase<'tool'> {
  invocationId: string;
  toolName: string;
  type: ToolActivityType;
  status: ToolInvocationStatus;
  contextText: string;
  arguments: Record<string, any>;
  approvalTarget?: ToolApprovalTarget | null;
  logs: string[];
  result: any | null;
  error: string | null;
}

export interface CompactionActivity extends RunActivityBase<'compaction'> {
  phase: CompactionStatusPhase;
  message: string;
  turnId?: string | null;
  compactionOperationId?: string | null;
  requestedTurnId?: string | null;
  executionTurnId?: string | null;
  selectedBlockCount?: number | null;
  compactedBlockCount?: number | null;
  rawTraceCount?: number | null;
  semanticFactCount?: number | null;
  compactionAgentDefinitionId?: string | null;
  compactionAgentName?: string | null;
  compactionRuntimeKind?: string | null;
  compactionModelIdentifier?: string | null;
  compactionRunId?: string | null;
  compactionTaskId?: string | null;
  provider?: string | null;
  sourceSurface?: string | null;
  boundaryKey?: string | null;
  providerEventId?: string | null;
  providerSessionId?: string | null;
  trigger?: string | null;
  preTokens?: number | null;
  rotationEligible?: boolean | null;
  errorMessage?: string | null;
  updatedAt: Date;
  centerTimelineTimestamp?: Date | null;
}

export interface SystemInstructionActivity extends RunActivityBase<'system_instruction'> {
  content: string;
}

export type RunActivity = ToolActivity | CompactionActivity | SystemInstructionActivity;
