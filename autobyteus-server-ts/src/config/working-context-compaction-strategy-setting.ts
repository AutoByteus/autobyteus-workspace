import { defaultWorkingContextCompactionStrategyRegistry } from "autobyteus-ts/memory/compaction/default-working-context-compaction-strategy-registry.js";
import {
  AUTOBYTEUS_COMPACTION_STRATEGY,
  normalizeWorkingContextCompactionStrategyId,
} from "autobyteus-ts/memory/compaction/working-context-compaction-strategy-setting.js";

export const WORKING_CONTEXT_COMPACTION_STRATEGY_SETTING_KEY = AUTOBYTEUS_COMPACTION_STRATEGY;

export const normalizeWorkingContextCompactionStrategyForPersistence = (
  value: string,
): [true, string] | [false, string] => {
  const normalized = normalizeWorkingContextCompactionStrategyId(value);
  const registeredIds = defaultWorkingContextCompactionStrategyRegistry
    .list()
    .map(({ id }) => id);
  if (registeredIds.includes(normalized)) return [true, normalized];
  return [
    false,
    `Server setting '${WORKING_CONTEXT_COMPACTION_STRATEGY_SETTING_KEY}' must be one of: ${registeredIds.join(", ")}.`,
  ];
};
