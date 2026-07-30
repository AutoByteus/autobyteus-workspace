import { WorkingContext } from '../working-context.js';
import type { AgentCompactionSummarizer } from './agent-compaction-summarizer.js';
import { CompactionResultNormalizer } from './compaction-result-normalizer.js';
import type { WorkingContextCompactionDiagnostics, WorkingContextCompactionStrategy } from './working-context-compaction-strategy.js';
import type { WorkingContextCompactionProposal } from './working-context-compaction-proposal.js';
import { WorkingContextMessageWindowPlanner } from './working-context-message-window-planner.js';

export type StructuredJsonCompactionStrategyOptions = {
  summarizer: AgentCompactionSummarizer;
  inputBudgetTokens: number | null;
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

  async propose(workingContext: WorkingContext): Promise<WorkingContextCompactionProposal> {
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
    if (!plan.compactableUnits.length || !plan.rawTraceIdsToArchive.length) {
      throw new Error('No eligible settled natural working-context message was available.');
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
    const execution = this.options.summarizer.getLastCompactionExecutionMetadata();
    if (!execution) throw new Error('Compaction execution metadata is required.');
    this.options.diagnostics?.reportResult({
      selectedUnitCount: plan.compactableUnits.length,
      compactedUnitCount: plan.compactableUnits.length,
      rawTraceCount: plan.rawTraceIdsToArchive.length,
      semanticFactCount: result.semanticEntries.length,
      episodeSummaryLength: result.episodes.reduce((sum, episode) => sum + episode.summary.length, 0),
      compactionMetadata: execution,
    });
    return {
      selectedNewRawTraceIds: plan.rawTraceIdsToArchive,
      retainedMessages: plan.retainedMessages,
      output: result,
      execution,
    };
  }
}
