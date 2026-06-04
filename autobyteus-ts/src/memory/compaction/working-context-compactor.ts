import { EpisodicItem } from '../models/episodic-item.js';
import { SemanticItem } from '../models/semantic-item.js';
import { MemoryStore } from '../store/base-store.js';
import { getMessageProvenance } from '../message-provenance.js';
import { CompactionResultNormalizer } from './compaction-result-normalizer.js';
import type { NormalizedCompactionResult } from './compaction-result-normalizer.js';
import type { CompactionAgentExecutionMetadata } from './compaction-agent-runner.js';
import type { CompactionResult } from './compaction-result.js';
import type { MessageCompactionPlan } from './working-context-message-unit.js';
import { getPlanSelectedUnitCount } from './working-context-message-unit.js';
import type { Summarizer } from './summarizer.js';

export type WorkingContextCompactionExecutionOutcome = {
  result: NormalizedCompactionResult;
  selectedUnitCount: number;
  compactedUnitCount: number;
  rawTraceCount: number;
  semanticFactCount: number;
  compactionMetadata: CompactionAgentExecutionMetadata | null;
};

type MessageUnitSummarizer = Summarizer & {
  summarizeMessageUnits?: (units: MessageCompactionPlan['compactableUnits']) => Promise<CompactionResult>;
};

export class WorkingContextCompactor {
  protected readonly normalizer: CompactionResultNormalizer;

  constructor(
    protected readonly store: MemoryStore,
    protected readonly summarizer: Summarizer,
    normalizer: CompactionResultNormalizer = new CompactionResultNormalizer(),
  ) {
    this.normalizer = normalizer;
  }

  async compactWorkingContext(
    plan: MessageCompactionPlan,
  ): Promise<WorkingContextCompactionExecutionOutcome | null> {
    if (!getPlanSelectedUnitCount(plan)) {
      return null;
    }
    const summarizer = this.summarizer as MessageUnitSummarizer;
    if (typeof summarizer.summarizeMessageUnits !== 'function') {
      throw new Error('Configured compaction summarizer does not support working-context message units.');
    }

    const rawResult = await summarizer.summarizeMessageUnits(plan.compactableUnits);
    const result = this.normalizer.normalize(rawResult);
    const timestampMs = Date.now();
    const timestampSeconds = timestampMs / 1000;
    const turnIds = [
      ...new Set(
        plan.compactableUnits
          .flatMap((unit) => unit.messages)
          .map((message) => getMessageProvenance(message)?.turnId ?? null)
          .filter((turnId): turnId is string => Boolean(turnId))
      )
    ];

    const episodicItem = new EpisodicItem({
      id: `ep_${timestampMs}`,
      ts: timestampSeconds,
      turnIds,
      summary: result.episodicSummary,
      salience: 0.0,
    });
    const semanticItems = result.semanticEntries.map((entry, index) => new SemanticItem({
      id: entry.id ?? `sem_${timestampMs}_${index + 1}`,
      ts: entry.ts ?? timestampSeconds,
      category: entry.category,
      fact: entry.fact,
      salience: entry.salience,
    }));

    this.store.add([episodicItem, ...semanticItems]);
    if (plan.rawTraceIdsToArchive.length) {
      this.store.pruneRawTracesById(plan.rawTraceIdsToArchive, true);
    }

    return {
      result,
      selectedUnitCount: plan.compactableUnits.length,
      compactedUnitCount: plan.compactableUnits.length,
      rawTraceCount: plan.rawTraceIdsToArchive.length,
      semanticFactCount: semanticItems.length,
      compactionMetadata: this.getLastCompactionExecutionMetadata(),
    };
  }

  getLastCompactionExecutionMetadata(): CompactionAgentExecutionMetadata | null {
    return this.summarizer.getLastCompactionExecutionMetadata();
  }
}
