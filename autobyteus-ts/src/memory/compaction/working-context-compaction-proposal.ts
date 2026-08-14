import type { Message } from '../../llm/utils/messages.js';
import type { CompactionLineageRecord } from '../lineage/compaction-lineage-record.js';
import type { EpisodicItem } from '../models/episodic-item.js';
import type { SemanticItem } from '../models/semantic-item.js';
import type { WorkingContext } from '../working-context.js';
import type { CompactionAgentExecutionMetadata } from './compaction-agent-runner.js';
import type { NormalizedCompactionResult } from './compaction-result-normalizer.js';
import type { CompactionPlanningBudget } from './compaction-planning-budget.js';

export type CompactionBudgetAssessment = Readonly<{
  planningBudget: CompactionPlanningBudget;
  estimatedCurrentWorkingContextTokens: number;
  estimatedUntrackedOverheadTokens: number;
  requiredSystemTokens: number;
  protectedSuffixTokens: number;
  replacementMemoryReserveTokens: number;
  retainedRecentTokens: number;
  estimatedPlannedPromptTokens: number;
  estimatedFinalizedContextTokens: number | null;
}>;

export type WorkingContextCompactionProposal = {
  selectedNewRawTraceIds: string[];
  retainedMessages: Message[];
  output: NormalizedCompactionResult;
  execution: CompactionAgentExecutionMetadata;
  budgetAssessment: CompactionBudgetAssessment;
};

export type AcceptedWorkingContextCompaction = {
  compactionId: string;
  baselineFingerprint: string;
  expectedPreviousCompactionId: string | null;
  selectedNewRawTraceIds: string[];
  episodicItems: EpisodicItem[];
  semanticItems: SemanticItem[];
  lineageRecord: CompactionLineageRecord;
  finalizedContext: WorkingContext;
  budgetAssessment: CompactionBudgetAssessment;
};
