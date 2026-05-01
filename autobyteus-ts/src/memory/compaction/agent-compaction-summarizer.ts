import { randomUUID } from 'node:crypto';
import { CompactionResult } from './compaction-result.js';
import { CompactionResponseParser } from './compaction-response-parser.js';
import { CompactionTaskPromptBuilder } from './compaction-task-prompt-builder.js';
import { getCompactionAgentRunnerErrorMetadata } from './compaction-agent-runner.js';
import type {
  CompactionAgentExecutionMetadata,
  CompactionAgentRunner,
  CompactionAgentRunnerResult,
} from './compaction-agent-runner.js';
import type { InteractionBlock } from './interaction-block.js';
import { Summarizer } from './summarizer.js';

export type AgentCompactionSummarizerOptions = {
  runner: CompactionAgentRunner;
  parentAgentId?: string | null;
  promptBuilder?: CompactionTaskPromptBuilder;
  responseParser?: CompactionResponseParser;
  maxItemChars?: number | null;
  taskIdFactory?: () => string;
};

export class AgentCompactionSummarizer extends Summarizer {
  private readonly runner: CompactionAgentRunner;
  private readonly parentAgentId: string | null;
  private readonly promptBuilder: CompactionTaskPromptBuilder;
  private readonly responseParser: CompactionResponseParser;
  private readonly maxItemChars: number | null;
  private readonly taskIdFactory: () => string;
  private lastExecutionMetadata: CompactionAgentExecutionMetadata | null = null;

  constructor(options: AgentCompactionSummarizerOptions) {
    super();
    this.runner = options.runner;
    this.parentAgentId = normalizeOptionalString(options.parentAgentId);
    this.promptBuilder = options.promptBuilder ?? new CompactionTaskPromptBuilder();
    this.responseParser = options.responseParser ?? new CompactionResponseParser();
    this.maxItemChars = options.maxItemChars ?? null;
    this.taskIdFactory = options.taskIdFactory ?? (() => `compaction_task_${randomUUID().replace(/-/g, '')}`);
  }

  async summarize(blocks: InteractionBlock[]): Promise<CompactionResult> {
    const taskId = this.taskIdFactory();
    let result: CompactionAgentRunnerResult;
    try {
      result = await this.runner.runCompactionTask({
        taskId,
        parentAgentId: this.parentAgentId,
        parentTurnId: resolveParentTurnId(blocks),
        prompt: this.promptBuilder.buildTaskPrompt(blocks, { maxItemChars: this.maxItemChars }),
        blockCount: blocks.length,
        traceCount: blocks.reduce((count, block) => count + block.traces.length, 0),
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

  override getLastCompactionExecutionMetadata(): CompactionAgentExecutionMetadata | null {
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

const resolveParentTurnId = (blocks: InteractionBlock[]): string | null => {
  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    const turnId = normalizeOptionalString(blocks[index]?.turnId ?? null);
    if (turnId) {
      return turnId;
    }
  }
  return null;
};
