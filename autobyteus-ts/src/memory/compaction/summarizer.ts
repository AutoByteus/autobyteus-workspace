import type { InteractionBlock } from './interaction-block.js';
import { CompactionResult } from './compaction-result.js';
import type { CompactionAgentExecutionMetadata } from './compaction-agent-runner.js';

export abstract class Summarizer {
  abstract summarize(blocks: InteractionBlock[]): Promise<CompactionResult>;

  getLastCompactionExecutionMetadata(): CompactionAgentExecutionMetadata | null {
    return null;
  }
}
