import type { WorkingContext } from '../working-context.js';
import type {
  CompactionAgentExecutionMetadata,
  CompactionAgentRunner,
} from './compaction-agent-runner.js';

export type WorkingContextCompactionPlanDiagnostics = Readonly<{
  selectedUnitCount: number;
  protectedSuffixUnitCount: number;
  retainedUnitCount: number;
  workingContextMessageCount: number;
  rawTraceCount: number;
}>;

export type WorkingContextCompactionResultDiagnostics = Readonly<{
  selectedUnitCount: number;
  compactedUnitCount: number;
  rawTraceCount: number;
  semanticFactCount: number;
  episodeSummaryLength: number;
  compactionMetadata: CompactionAgentExecutionMetadata | null;
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
  inputBudgetTokens: number | null;
  maxItemChars: number;
  diagnostics: WorkingContextCompactionDiagnostics | null;
}>;
import type { WorkingContextCompactionProposal } from './working-context-compaction-proposal.js';
