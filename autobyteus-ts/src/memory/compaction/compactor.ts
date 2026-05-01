import { EpisodicItem } from '../models/episodic-item.js';
import { SemanticItem } from '../models/semantic-item.js';
import { CompactionPlan } from './compaction-plan.js';
import { CompactionResultNormalizer } from './compaction-result-normalizer.js';
import type { NormalizedCompactionResult } from './compaction-result-normalizer.js';
import type { CompactionAgentExecutionMetadata } from './compaction-agent-runner.js';
import { Summarizer } from './summarizer.js';
import { MemoryStore } from '../store/base-store.js';

export type CompactionExecutionOutcome = {
  result: NormalizedCompactionResult;
  selectedBlockCount: number;
  compactedBlockCount: number;
  rawTraceCount: number;
  semanticFactCount: number;
  compactionMetadata: CompactionAgentExecutionMetadata | null;
};

export class Compactor {
  private readonly normalizer: CompactionResultNormalizer;

  constructor(
    private readonly store: MemoryStore,
    private readonly summarizer: Summarizer,
    normalizer: CompactionResultNormalizer = new CompactionResultNormalizer(),
  ) {
    this.normalizer = normalizer;
  }

  async compact(plan: CompactionPlan): Promise<CompactionExecutionOutcome | null> {
    if (!plan.selectedBlockCount) {
      return null;
    }

    const rawResult = await this.summarizer.summarize(plan.eligibleBlocks);
    const result = this.normalizer.normalize(rawResult);
    const timestampMs = Date.now();
    const timestampSeconds = timestampMs / 1000;
    const turnIds = [
      ...new Set(
        plan.eligibleBlocks
          .map((block) => block.turnId)
          .filter((turnId): turnId is string => typeof turnId === 'string' && turnId.length > 0)
      )
    ];

    const episodicItem = new EpisodicItem({
      id: `ep_${timestampMs}`,
      ts: timestampSeconds,
      turnIds,
      summary: result.episodicSummary,
      tags: [],
      salience: 0.0,
    });

    const semanticItems = result.semanticEntries.map((entry, index) => new SemanticItem({
      id: entry.id ?? `sem_${timestampMs}_${index + 1}`,
      ts: entry.ts ?? timestampSeconds,
      category: entry.category,
      fact: entry.fact,
      reference: entry.reference,
      tags: entry.tags,
      salience: entry.salience,
    }));

    this.store.add([episodicItem, ...semanticItems]);
    this.store.pruneRawTracesById(plan.eligibleTraceIds, true);

    return {
      result,
      selectedBlockCount: plan.selectedBlockCount,
      compactedBlockCount: plan.compactedBlockCount,
      rawTraceCount: plan.eligibleTraceIds.length,
      semanticFactCount: semanticItems.length,
      compactionMetadata: this.getLastCompactionExecutionMetadata(),
    };
  }

  getLastCompactionExecutionMetadata(): CompactionAgentExecutionMetadata | null {
    return this.summarizer.getLastCompactionExecutionMetadata();
  }
}
