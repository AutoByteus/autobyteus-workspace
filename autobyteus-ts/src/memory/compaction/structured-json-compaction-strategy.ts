import { EpisodicItem } from '../models/episodic-item.js';
import { SemanticItem } from '../models/semantic-item.js';
import { getMessageProvenance } from '../message-provenance.js';
import type { CompactedMemoryContextProjector } from '../projection/compacted-memory-context-projector.js';
import type { MemoryStore } from '../store/base-store.js';
import { WorkingContext } from '../working-context.js';
import type { AgentCompactionSummarizer } from './agent-compaction-summarizer.js';
import { CompactionResultNormalizer } from './compaction-result-normalizer.js';
import type { WorkingContextCompactionDiagnostics, WorkingContextCompactionStrategy } from './working-context-compaction-strategy.js';
import { WorkingContextMessageWindowPlanner } from './working-context-message-window-planner.js';

const STRUCTURED_JSON_MAX_EPISODIC = 3;
const STRUCTURED_JSON_MAX_SEMANTIC = 20;

export type StructuredJsonCompactionStrategyOptions = {
  store: MemoryStore;
  summarizer: AgentCompactionSummarizer;
  inputBudgetTokens: number | null;
  compactedMemoryProjector: CompactedMemoryContextProjector;
  diagnostics?: WorkingContextCompactionDiagnostics | null;
  planner?: WorkingContextMessageWindowPlanner;
  normalizer?: CompactionResultNormalizer;
};

export class StructuredJsonCompactionStrategy implements WorkingContextCompactionStrategy {
  readonly id = 'structured-json';
  readonly name = 'Structured JSON';

  private readonly planner: WorkingContextMessageWindowPlanner;
  private readonly normalizer: CompactionResultNormalizer;

  constructor(private readonly options: StructuredJsonCompactionStrategyOptions) {
    this.planner = options.planner ?? new WorkingContextMessageWindowPlanner();
    this.normalizer = options.normalizer ?? new CompactionResultNormalizer();
  }

  async compact(workingContext: WorkingContext): Promise<WorkingContext> {
    const messages = workingContext.buildMessages();
    const plan = this.planner.plan({
      messages,
      inputBudgetTokens: this.options.inputBudgetTokens,
    });
    this.options.diagnostics?.reportPlan({
      selectedUnitCount: plan.compactableUnits.length,
      protectedSuffixUnitCount: plan.protectedSuffixUnits.length,
      retainedUnitCount: plan.retainedUnits.length,
      workingContextMessageCount: messages.length,
      rawTraceCount: plan.rawTraceIdsToArchive.length,
    });
    if (!plan.compactableUnits.length) {
      throw new Error('No eligible settled working-context message was available.');
    }

    let rawResult;
    try {
      rawResult = await this.options.summarizer.summarizeMessageUnits(plan.compactableUnits);
    } catch (error) {
      this.options.diagnostics?.reportFailure?.(
        this.options.summarizer.getLastCompactionExecutionMetadata(),
      );
      throw error;
    }
    const result = this.normalizer.normalize(rawResult);
    const timestampMs = Date.now();
    const timestampSeconds = timestampMs / 1000;
    const turnIds = [...new Set(
      plan.compactableUnits
        .flatMap((unit) => unit.messages)
        .map((message) => getMessageProvenance(message)?.turnId ?? null)
        .filter((turnId): turnId is string => Boolean(turnId)),
    )];
    const episodicItem = new EpisodicItem({
      id: `ep_${timestampMs}`,
      ts: timestampSeconds,
      turnIds,
      summary: result.episodicSummary,
      salience: 0,
    });
    const semanticItems = result.semanticEntries.map((entry, index) => new SemanticItem({
      id: entry.id ?? `sem_${timestampMs}_${index + 1}`,
      ts: entry.ts ?? timestampSeconds,
      category: entry.category,
      fact: entry.fact,
      salience: entry.salience,
    }));

    this.options.store.add([episodicItem, ...semanticItems]);
    if (plan.rawTraceIdsToArchive.length) {
      this.options.store.pruneRawTracesById(plan.rawTraceIdsToArchive, true);
    }

    const next = this.options.compactedMemoryProjector.project({
      headMessages: plan.headMessages,
      continuationMessages: plan.retainedMessages,
      maxEpisodic: STRUCTURED_JSON_MAX_EPISODIC,
      maxSemantic: STRUCTURED_JSON_MAX_SEMANTIC,
    });
    this.options.diagnostics?.reportResult({
      selectedUnitCount: plan.compactableUnits.length,
      compactedUnitCount: plan.compactableUnits.length,
      rawTraceCount: plan.rawTraceIdsToArchive.length,
      semanticFactCount: semanticItems.length,
      episodicSummaryLength: result.episodicSummary.length,
      compactionMetadata: this.options.summarizer.getLastCompactionExecutionMetadata(),
    });
    return next;
  }
}
