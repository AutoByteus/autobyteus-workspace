import { MemoryType } from '../models/memory-types.js';
import { RawTraceItem } from '../models/raw-trace-item.js';
import { EpisodicItem } from '../models/episodic-item.js';
import { SemanticItem } from '../models/semantic-item.js';
import { CompactionResult } from './compaction-result.js';
import { Summarizer } from './summarizer.js';
import { CompactionPolicy } from '../policies/compaction-policy.js';
import { MemoryStore } from '../store/base-store.js';

export class Compactor {
  private store: MemoryStore;
  private policy: CompactionPolicy;
  private summarizer: Summarizer;

  constructor(store: MemoryStore, policy: CompactionPolicy, summarizer: Summarizer) {
    this.store = store;
    this.policy = policy;
    this.summarizer = summarizer;
  }

  selectCompactionWindow(): string[] {
    const rawItems = this.store.list(MemoryType.RAW_TRACE);
    const turnIds: string[] = [];
    const seen = new Set<string>();

    for (const item of rawItems) {
      if (!(item instanceof RawTraceItem)) {
        continue;
      }
      if (!seen.has(item.turnId)) {
        seen.add(item.turnId);
        turnIds.push(item.turnId);
      }
    }

    if (this.policy.rawTailTurns <= 0) {
      return turnIds;
    }
    if (turnIds.length <= this.policy.rawTailTurns) {
      return [];
    }
    return turnIds.slice(0, -this.policy.rawTailTurns);
  }

  getTracesForTurns(turnIds: string[]): RawTraceItem[] {
    const rawItems = this.store.list(MemoryType.RAW_TRACE);
    const turnSet = new Set(turnIds);
    return rawItems.filter((item): item is RawTraceItem =>
      item instanceof RawTraceItem && turnSet.has(item.turnId)
    );
  }

  compact(turnIds: string[]): CompactionResult | null {
    if (!turnIds.length) {
      return null;
    }

    const traces = this.getTracesForTurns(turnIds);
    const result = this.summarizer.summarize(traces);

    const episodicItem = new EpisodicItem({
      id: `ep_${Date.now()}`,
      ts: Date.now() / 1000,
      turnIds,
      summary: result.episodicSummary,
      tags: [],
      salience: 0.0
    });

    const semanticItems = result.semanticFacts.map((fact, index) => new SemanticItem({
      id: `sem_${Date.now()}_${index + 1}`,
      ts: Date.now() / 1000,
      fact: typeof fact.fact === 'string' ? fact.fact : '',
      tags: Array.isArray(fact.tags) ? (fact.tags as string[]) : [],
      confidence: typeof fact.confidence === 'number' ? fact.confidence : 0.0,
      salience: 0.0
    }));

    this.store.add([episodicItem, ...semanticItems]);
    this.pruneRawTraces(turnIds);
    return result;
  }

  private pruneRawTraces(compactedTurnIds: string[]): void {
    const rawItems = this.store.list(MemoryType.RAW_TRACE);
    const remainingTurns = new Set(
      rawItems
        .filter((item): item is RawTraceItem => item instanceof RawTraceItem)
        .filter((item) => !compactedTurnIds.includes(item.turnId))
        .map((item) => item.turnId)
    );

    const storeWithPrune = this.store as MemoryStore & { pruneRawTraces?: (keepTurnIds: Set<string>, archive?: boolean) => void };
    if (typeof storeWithPrune.pruneRawTraces === 'function') {
      storeWithPrune.pruneRawTraces(remainingTurns, true);
    }
  }
}
