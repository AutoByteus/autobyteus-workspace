import { randomUUID } from 'node:crypto';
import { CompactionResult } from './compaction-result.js';
import { CompactionResponseParser } from './compaction-response-parser.js';
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
    const taskId = this.taskIdFactory();
    let result: CompactionAgentRunnerResult;
    try {
      result = await this.runner.runCompactionTask({
        taskId,
        parentAgentId: this.parentAgentId,
        parentTurnId: null,
        prompt: this.messagePromptBuilder.buildTaskPrompt(units, { maxItemChars: this.maxItemChars }),
        blockCount: units.length,
        traceCount: units.reduce((count, unit) => count + unit.rawTraceIds.length, 0),
      });
    } catch (error) {
      const errorMetadata = getCompactionAgentRunnerErrorMetadata(error);
      if (errorMetadata) {
        this.lastExecutionMetadata = {
          ...errorMetadata,
          taskId: errorMetadata.taskId ?? taskId,
        };
      }
      throw error;
    }

    this.lastExecutionMetadata = {
      ...(result.metadata ?? {}),
      taskId: result.metadata?.taskId ?? taskId,
    };
    return this.responseParser.parse(result.outputText ?? '');
  }

  getLastCompactionExecutionMetadata(): CompactionAgentExecutionMetadata | null {
    return this.lastExecutionMetadata;
  }
}

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};
