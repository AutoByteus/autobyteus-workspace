import { describe, expect, it } from 'vitest';
import { CompactionResult } from '../../../src/memory/compaction/compaction-result.js';
import { CompactionResultNormalizer } from '../../../src/memory/compaction/compaction-result-normalizer.js';

describe('CompactionResultNormalizer', () => {
  it('preserves typed categories, deduplicates by highest priority, and assigns deterministic salience', () => {
    const normalizer = new CompactionResultNormalizer();
    const result = new CompactionResult('Summary', {
      criticalIssues: [{ fact: 'Pinia getter reads undefined products.value' }],
      unresolvedWork: [{ fact: 'Revise design spec v3 for price-storage pattern' }],
      durableFacts: [
        { fact: 'Pinia getter reads undefined products.value' },
        { fact: 'Team uses pnpm exec vitest' },
      ],
      userPreferences: [{ fact: 'User prefers concise answers' }],
      importantArtifacts: [{ fact: 'design-spec.md', reference: '/tmp/design-spec.md' }],
    });

    const normalized = normalizer.normalize(result);

    expect(normalized.semanticEntries.map((entry) => entry.category)).toEqual([
      'critical_issue',
      'unresolved_work',
      'user_preference',
      'durable_fact',
      'important_artifact',
    ]);
    expect(normalized.semanticEntries[0]?.salience).toBeGreaterThan(normalized.semanticEntries[3]?.salience ?? 0);
    expect(normalized.semanticEntries.filter((entry) => entry.fact.includes('Pinia getter'))).toHaveLength(1);
  });

  it('drops low-value operational noise outside critical/unresolved categories', () => {
    const normalizer = new CompactionResultNormalizer();
    const result = new CompactionResult('Summary', {
      durableFacts: [
        { fact: 'Dev server running on localhost:3000 (multiple Nuxt processes detected)' },
        { fact: 'Docs status updated for README inventory' },
      ],
      unresolvedWork: [{ fact: 'Need to fix the compaction status banner typing' }],
    });

    const normalized = normalizer.normalize(result);

    expect(normalized.semanticEntries).toEqual([
      expect.objectContaining({
        category: 'unresolved_work',
        fact: 'Need to fix the compaction status banner typing',
      })
    ]);
  });
});
