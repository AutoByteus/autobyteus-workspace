import type { EmbeddingRelevanceCalibration } from "./catalog/embedding-model-definition.js";

export type ScoredItem = { id: string; score: number };

/**
 * The meaning-match rule: none when even the best score is below the model's clear-match floor; otherwise the items
 * nearly as relevant as the best one (within the model's margin), best-first, at most `limit`.
 */
export const selectRelevant = (scored: readonly ScoredItem[], calibration: EmbeddingRelevanceCalibration, limit: number): ScoredItem[] => {
  const ranked = [...scored].sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const best = ranked[0];
  if (!best || best.score < calibration.clearMatchFloor) return [];
  return ranked.filter((item) => item.score >= best.score - calibration.nearBestMargin).slice(0, limit);
};
