import type { MemoryStore } from '../store/base-store.js';
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
  episodicSummaryLength: number;
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

  compact(workingContext: WorkingContext): Promise<WorkingContext>;
}

export type WorkingContextCompactionStrategyConstructionContext = Readonly<{
  agentId: string;
  memoryStore: MemoryStore;
  compactionAgentRunner: CompactionAgentRunner | null;
  inputBudgetTokens: number | null;
  maxItemChars: number;
  diagnostics: WorkingContextCompactionDiagnostics | null;
}>;
