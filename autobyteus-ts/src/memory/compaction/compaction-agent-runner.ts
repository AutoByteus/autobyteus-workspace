export type CompactionAgentExecutionMetadata = {
  compactionAgentDefinitionId?: string | null;
  compactionAgentName?: string | null;
  runtimeKind?: string | null;
  modelIdentifier?: string | null;
  provider?: string | null;
  renderedInputSha256?: string | null;
  compactionRunId?: string | null;
  taskId?: string | null;
};

export type CompactionAgentTask = {
  taskId: string;
  parentAgentId?: string | null;
  parentTurnId?: string | null;
  prompt: string;
  blockCount: number;
  traceCount: number;
};

export type CompactionAgentRunnerResult = {
  outputText: string;
  metadata?: CompactionAgentExecutionMetadata | null;
};

export type CompactionAgentRunnerFailureKind =
  | 'error_completion'
  | 'interrupted'
  | 'terminal_error'
  | 'timeout'
  | 'tool_approval'
  | 'task_rejected'
  | 'launch_failed'
  | 'collection_failed';

export interface CompactionAgentRunner {
  runCompactionTask(task: CompactionAgentTask): Promise<CompactionAgentRunnerResult>;
}

export class CompactionAgentRunnerError extends Error {
  constructor(
    readonly kind: CompactionAgentRunnerFailureKind,
    message: string,
    readonly compactionMetadata: CompactionAgentExecutionMetadata | null = null,
    readonly cause: unknown = null,
  ) {
    super(message);
    this.name = 'CompactionAgentRunnerError';
  }
}

export const getCompactionAgentRunnerErrorMetadata = (
  error: unknown,
): CompactionAgentExecutionMetadata | null => {
  if (error instanceof CompactionAgentRunnerError) return error.compactionMetadata;
  if (!error || typeof error !== 'object' || Array.isArray(error)) return null;
  const metadata = (error as { compactionMetadata?: unknown }).compactionMetadata;
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? metadata as CompactionAgentExecutionMetadata
    : null;
};
