import { normalizeCodexItemTypeToken } from "../items/codex-tool-item-family.js";

export const isCodexContextCompactionItemType = (itemType: unknown): boolean =>
  normalizeCodexItemTypeToken(itemType) === "contextcompaction";

export const isCodexCompletedCompactionItemType = (itemType: unknown): boolean => {
  const normalized = normalizeCodexItemTypeToken(itemType);
  return normalized === "contextcompaction" || normalized === "compaction";
};

export const isCodexCompactionTriggerItemType = (itemType: unknown): boolean =>
  normalizeCodexItemTypeToken(itemType) === "compactiontrigger";
