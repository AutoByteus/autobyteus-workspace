export type CompactionAgentExecutionMetadata = {
  compactionAgentDefinitionId?: string | null;
  compactionAgentName?: string | null;
  runtimeKind?: string | null;
  modelIdentifier?: string | null;
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

export interface CompactionAgentRunner {
  runCompactionTask(task: CompactionAgentTask): Promise<CompactionAgentRunnerResult>;
  describeConfiguredCompactor?():
    | CompactionAgentExecutionMetadata
    | null
    | Promise<CompactionAgentExecutionMetadata | null>;
}

export class CompactionAgentRunnerError extends Error {
  readonly compactionMetadata: CompactionAgentExecutionMetadata | null;
  readonly cause: unknown;

  constructor(
    message: string,
    compactionMetadata: CompactionAgentExecutionMetadata | null = null,
    cause: unknown = null,
  ) {
    super(message);
    this.name = 'CompactionAgentRunnerError';
    this.compactionMetadata = compactionMetadata;
    this.cause = cause;
  }
}

export const getCompactionAgentRunnerErrorMetadata = (
  error: unknown,
): CompactionAgentExecutionMetadata | null => {
  if (error instanceof CompactionAgentRunnerError) {
    return error.compactionMetadata;
  }
  if (!error || typeof error !== 'object' || Array.isArray(error)) {
    return null;
  }
  const metadata = (error as { compactionMetadata?: unknown }).compactionMetadata;
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? metadata as CompactionAgentExecutionMetadata
    : null;
};
