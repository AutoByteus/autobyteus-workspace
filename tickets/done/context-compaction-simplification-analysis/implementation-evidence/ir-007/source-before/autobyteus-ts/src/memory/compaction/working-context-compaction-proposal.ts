import type { Message } from '../../llm/utils/messages.js';
import type { WorkingContext } from '../working-context.js';
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
  summary: string;
  budgetAssessment: CompactionBudgetAssessment;
};

export type AcceptedWorkingContextCompaction = {
  compactionId: string;
  baselineFingerprint: string;
  selectedNewRawTraceIds: string[];
  finalizedContext: WorkingContext;
  budgetAssessment: CompactionBudgetAssessment;
};
