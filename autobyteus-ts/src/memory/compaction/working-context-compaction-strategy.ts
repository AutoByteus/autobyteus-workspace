import type { WorkingContext } from '../working-context.js';
import type {
  CompactionAgentExecutionMetadata,
  CompactionAgentRunner,
} from './compaction-agent-runner.js';
import type { CompactionPlanningBudget } from './compaction-planning-budget.js';

export type WorkingContextCompactionPlanDiagnostics = Readonly<{
  selectedUnitCount: number;
  protectedSuffixUnitCount: number;
  retainedUnitCount: number;
  workingContextMessageCount: number;
  rawTraceCount: number;
  postCompactionTargetTokens: number;
  estimatedPlannedPromptTokens: number;
}>;

export type WorkingContextCompactionResultDiagnostics = Readonly<{
  selectedUnitCount: number;
  compactedUnitCount: number;
  rawTraceCount: number;
  semanticFactCount: number;
  episodeSummaryLength: number;
  compactionMetadata: CompactionAgentExecutionMetadata | null;
  postCompactionTargetTokens: number;
}>;

export interface WorkingContextCompactionDiagnostics {
  reportPlan(details: WorkingContextCompactionPlanDiagnostics): void;
  reportResult(details: WorkingContextCompactionResultDiagnostics): void;
  reportFailure?(compactionMetadata: CompactionAgentExecutionMetadata | null): void;
}

export interface WorkingContextCompactionStrategy {
  readonly id: string;
  readonly name: string;

  propose(workingContext: WorkingContext): Promise<WorkingContextCompactionProposal>;
}

export type WorkingContextCompactionStrategyConstructionContext = Readonly<{
  agentId: string;
  compactionAgentRunner: CompactionAgentRunner | null;
  maxItemChars: number;
  diagnostics: WorkingContextCompactionDiagnostics | null;
}>;
export type WorkingContextCompactionStrategyExecutionContext = Readonly<{
  planningBudget: CompactionPlanningBudget;
}>;
import type { WorkingContextCompactionProposal } from './working-context-compaction-proposal.js';
