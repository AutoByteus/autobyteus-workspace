export const AUTOBYTEUS_COMPACTION_STRATEGY = 'AUTOBYTEUS_COMPACTION_STRATEGY';
export const DEFAULT_WORKING_CONTEXT_COMPACTION_STRATEGY_ID = 'structured-json';

export const normalizeWorkingContextCompactionStrategyId = (
  value: string | null | undefined,
): string => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized || DEFAULT_WORKING_CONTEXT_COMPACTION_STRATEGY_ID;
};
