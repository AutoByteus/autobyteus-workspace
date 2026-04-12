import type { InteractionBlock } from './interaction-block.js';
import { CompactionResult } from './compaction-result.js';

export abstract class Summarizer {
  abstract summarize(blocks: InteractionBlock[]): Promise<CompactionResult>;
}
