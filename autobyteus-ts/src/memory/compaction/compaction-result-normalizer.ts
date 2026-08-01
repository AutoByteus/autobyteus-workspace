import {
  COMPACTED_MEMORY_CATEGORY_BASE_SALIENCE,
  COMPACTED_MEMORY_CATEGORY_ORDER,
  type CompactedMemoryCategory,
} from '../models/semantic-item.js';
import { CompactionResult, type CompactionSemanticEntry } from './compaction-result.js';

export type CompactedMemoryEntryCandidate = {
  category: CompactedMemoryCategory;
  fact: string;
};

export type NormalizedCompactedMemoryEntry = {
  category: CompactedMemoryCategory;
  fact: string;
  salience: number;
};

export type NormalizedCompactionResult = {
  episodes: Array<{ summary: string }>;
  semanticEntries: NormalizedCompactedMemoryEntry[];
};

const LOW_VALUE_NOISE_PATTERNS = [
  /dev server running/i,
  /localhost:\d+/i,
  /multiple .*process/i,
  /working tree clean/i,
  /branch (is )?clean/i,
  /doc(?:umentation|s)? (inventory|status|updated|update complete)/i,
  /runtime chatter/i,
  /process count/i,
  /nuxt process/i,
  /pnpm .* running/i,
];

const collapseWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

const isLowValueOperationalNoise = (fact: string): boolean => LOW_VALUE_NOISE_PATTERNS.some((pattern) => pattern.test(fact));

const categoryPriority = (category: CompactedMemoryCategory): number =>
  COMPACTED_MEMORY_CATEGORY_ORDER.length - COMPACTED_MEMORY_CATEGORY_ORDER.indexOf(category);

const compareCandidates = (left: CompactedMemoryEntryCandidate, right: CompactedMemoryEntryCandidate): number => {
  const priorityDelta = categoryPriority(right.category) - categoryPriority(left.category);
  if (priorityDelta !== 0) {
    return priorityDelta;
  }
  return 0;
};

export class CompactionResultNormalizer {
  normalize(result: CompactionResult): NormalizedCompactionResult {
    return {
      episodes: result.episodes
        .map(({ summary }) => ({ summary: collapseWhitespace(summary) }))
        .filter(({ summary }) => Boolean(summary)),
      semanticEntries: this.normalizeEntries([
        ...this.toCandidates('critical_issue', result.criticalIssues),
        ...this.toCandidates('unresolved_work', result.unresolvedWork),
        ...this.toCandidates('user_preference', result.userPreferences),
        ...this.toCandidates('durable_fact', result.durableFacts),
        ...this.toCandidates('important_artifact', result.importantArtifacts),
      ]),
    };
  }

  normalizeEntries(candidates: CompactedMemoryEntryCandidate[]): NormalizedCompactedMemoryEntry[] {
    const cleaned = candidates
      .map((candidate) => this.normalizeCandidate(candidate))
      .filter((candidate): candidate is CompactedMemoryEntryCandidate => candidate !== null)
      .sort(compareCandidates);

    const deduped = new Map<string, CompactedMemoryEntryCandidate>();
    for (const candidate of cleaned) {
      const dedupeKey = candidate.fact.toLowerCase();
      if (!deduped.has(dedupeKey)) {
        deduped.set(dedupeKey, candidate);
      }
    }

    const perCategoryCounts = new Map<CompactedMemoryCategory, number>();
    const normalized: NormalizedCompactedMemoryEntry[] = [];

    for (const candidate of deduped.values()) {
      if (isLowValueOperationalNoise(candidate.fact) && candidate.category !== 'critical_issue' && candidate.category !== 'unresolved_work') {
        continue;
      }

      const currentCount = perCategoryCounts.get(candidate.category) ?? 0;
      perCategoryCounts.set(candidate.category, currentCount + 1);
      normalized.push({
        category: candidate.category,
        fact: candidate.fact,
        salience: Math.max(
          1,
          COMPACTED_MEMORY_CATEGORY_BASE_SALIENCE[candidate.category] - currentCount,
        ),
      });
    }

    return normalized;
  }

  private toCandidates(category: CompactedMemoryCategory, entries: CompactionSemanticEntry[]): CompactedMemoryEntryCandidate[] {
    return entries.map((entry) => ({
      category,
      fact: entry.fact,
    }));
  }

  private normalizeCandidate(candidate: CompactedMemoryEntryCandidate): CompactedMemoryEntryCandidate | null {
    const fact = collapseWhitespace(candidate.fact);
    if (!fact) {
      return null;
    }

    return {
      category: candidate.category,
      fact,
    };
  }
}
