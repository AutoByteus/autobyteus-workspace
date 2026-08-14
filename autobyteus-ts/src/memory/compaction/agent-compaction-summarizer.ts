import { createHash, randomUUID } from 'node:crypto';
import { CompactionResult } from './compaction-result.js';
import {
  CompactionResponseParseError,
  CompactionResponseParser,
  type CompactionResponseValidationStage,
} from './compaction-response-parser.js';
import { WorkingContextCompactionPromptBuilder } from './working-context-compaction-prompt-builder.js';
import { getCompactionAgentRunnerErrorMetadata } from './compaction-agent-runner.js';
import type {
  CompactionAgentExecutionMetadata,
  CompactionAgentRunner,
  CompactionAgentRunnerResult,
} from './compaction-agent-runner.js';
import type { WorkingContextMessageUnit } from './working-context-message-unit.js';

export type AgentCompactionSummarizerOptions = {
  runner: CompactionAgentRunner;
  parentAgentId?: string | null;
  messagePromptBuilder?: WorkingContextCompactionPromptBuilder;
  responseParser?: CompactionResponseParser;
  maxItemChars?: number | null;
  taskIdFactory?: () => string;
};

type AttemptFailureStage = CompactionResponseValidationStage | 'runner_execution';

export class AgentCompactionSummarizer {
  private readonly runner: CompactionAgentRunner;
  private readonly parentAgentId: string | null;
  private readonly messagePromptBuilder: WorkingContextCompactionPromptBuilder;
  private readonly responseParser: CompactionResponseParser;
  private readonly maxItemChars: number | null;
  private readonly taskIdFactory: () => string;
  private lastExecutionMetadata: CompactionAgentExecutionMetadata | null = null;

  constructor(options: AgentCompactionSummarizerOptions) {
    this.runner = options.runner;
    this.parentAgentId = normalizeOptionalString(options.parentAgentId);
    this.messagePromptBuilder = options.messagePromptBuilder ?? new WorkingContextCompactionPromptBuilder();
    this.responseParser = options.responseParser ?? new CompactionResponseParser();
    this.maxItemChars = options.maxItemChars ?? null;
    this.taskIdFactory = options.taskIdFactory ?? (() => `compaction_task_${randomUUID().replace(/-/g, '')}`);
  }

  async summarizeMessageUnits(units: WorkingContextMessageUnit[]): Promise<CompactionResult> {
    this.lastExecutionMetadata = null;
    const initialPrompt = this.messagePromptBuilder.buildTaskPrompt(
      units,
      { maxItemChars: this.maxItemChars },
    );
    const initialResult = await this.runAttempt(initialPrompt, units);

    try {
      return this.responseParser.parse(initialResult.outputText ?? '');
    } catch (error) {
      if (!(error instanceof CompactionResponseParseError)) {
        throw error;
      }
      return this.runCorrectionAttempt(initialPrompt, units, error);
    }
  }

  getLastCompactionExecutionMetadata(): CompactionAgentExecutionMetadata | null {
    return this.lastExecutionMetadata;
  }

  private async runCorrectionAttempt(
    initialPrompt: string,
    units: WorkingContextMessageUnit[],
    initialError: CompactionResponseParseError,
  ): Promise<CompactionResult> {
    const initialMetadata = this.lastExecutionMetadata;
    const correctionPrompt = this.messagePromptBuilder.buildCorrectionTaskPrompt(
      initialPrompt,
      initialError.stage,
    );

    let correctionResult: CompactionAgentRunnerResult;
    try {
      correctionResult = await this.runAttempt(correctionPrompt, units);
    } catch (error) {
      throw exhaustedRepairError({
        initialStage: initialError.stage,
        initialMetadata,
        correctionStage: 'runner_execution',
        correctionMetadata: this.lastExecutionMetadata,
        correctionCause: error,
      });
    }

    try {
      return this.responseParser.parse(correctionResult.outputText ?? '');
    } catch (error) {
      if (!(error instanceof CompactionResponseParseError)) {
        throw error;
      }
      throw exhaustedRepairError({
        initialStage: initialError.stage,
        initialMetadata,
        correctionStage: error.stage,
        correctionMetadata: this.lastExecutionMetadata,
        correctionCause: error,
      });
    }
  }

  private async runAttempt(
    prompt: string,
    units: WorkingContextMessageUnit[],
  ): Promise<CompactionAgentRunnerResult> {
    const taskId = this.taskIdFactory();
    const renderedInputSha256 = createHash('sha256').update(prompt, 'utf8').digest('hex');
    try {
      const result = await this.runner.runCompactionTask({
        taskId,
        parentAgentId: this.parentAgentId,
        parentTurnId: null,
        prompt,
        blockCount: units.length,
        traceCount: units.reduce((count, unit) => count + unit.rawTraceIds.length, 0),
      });
      this.lastExecutionMetadata = {
        ...(result.metadata ?? {}),
        taskId: result.metadata?.taskId ?? taskId,
        renderedInputSha256,
      };
      return result;
    } catch (error) {
      const errorMetadata = getCompactionAgentRunnerErrorMetadata(error);
      this.lastExecutionMetadata = {
        ...(errorMetadata ?? {}),
        taskId: errorMetadata?.taskId ?? taskId,
        renderedInputSha256,
      };
      throw error;
    }
  }
}

const exhaustedRepairError = (input: {
  initialStage: CompactionResponseValidationStage;
  initialMetadata: CompactionAgentExecutionMetadata | null;
  correctionStage: AttemptFailureStage;
  correctionMetadata: CompactionAgentExecutionMetadata | null;
  correctionCause: unknown;
}): Error => {
  const correctionDetail = input.correctionCause instanceof Error
    ? ` Correction failure: ${input.correctionCause.message}`
    : '';
  return new Error(
    'Memory compaction response repair exhausted after two attempts: '
    + `attempt 1 stage=${input.initialStage}${formatRunId(input.initialMetadata)}; `
    + `attempt 2 stage=${input.correctionStage}${formatRunId(input.correctionMetadata)}.`
    + correctionDetail,
  );
};

const formatRunId = (metadata: CompactionAgentExecutionMetadata | null): string => {
  const runId = normalizeOptionalString(metadata?.compactionRunId);
  return runId ? `, compactionRunId=${runId}` : '';
};

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};
