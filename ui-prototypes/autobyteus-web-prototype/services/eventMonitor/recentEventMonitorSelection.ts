export interface RecentWindowCandidate {
  completed: boolean;
  stableIdentity: string | null;
}

export interface RecentWindowSelection<T extends RecentWindowCandidate> {
  selected: T[];
  completedEvictions: number;
  forcedMutableEvictions: number;
}

export const toRecentWindowTimestampMs = (
  value: Date | string | number | null | undefined,
): number => {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export const selectRecentWindowCandidates = <T extends RecentWindowCandidate>(
  candidates: readonly T[],
  limit: number,
): RecentWindowSelection<T> => {
  const normalizedLimit = Math.max(0, Math.floor(limit));
  const removed = new Set<T>();
  const newestByStableIdentity = new Map<string, T>();
  for (const candidate of candidates) {
    if (!candidate.stableIdentity) continue;
    const previous = newestByStableIdentity.get(candidate.stableIdentity);
    if (previous) removed.add(previous);
    newestByStableIdentity.set(candidate.stableIdentity, candidate);
  }

  let overflow = candidates.length - removed.size - normalizedLimit;
  let completedEvictions = 0;
  let forcedMutableEvictions = 0;
  if (overflow > 0) {
    for (const candidate of candidates) {
      if (overflow === 0) break;
      if (removed.has(candidate) || !candidate.completed) continue;
      removed.add(candidate);
      completedEvictions += 1;
      overflow -= 1;
    }
  }
  if (overflow > 0) {
    for (const candidate of candidates) {
      if (overflow === 0) break;
      if (removed.has(candidate)) continue;
      removed.add(candidate);
      forcedMutableEvictions += 1;
      overflow -= 1;
    }
  }
  return {
    selected: candidates.filter((candidate) => !removed.has(candidate)),
    completedEvictions,
    forcedMutableEvictions,
  };
};
