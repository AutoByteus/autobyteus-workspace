import { describe, expect, it } from 'vitest';
import { CompactionResult } from '../../../src/memory/compaction/compaction-result.js';
import { CompactionResultNormalizer } from '../../../src/memory/compaction/compaction-result-normalizer.js';

describe('CompactionResultNormalizer', () => {
  it('preserves natural episodes/categories and deduplicates by priority', () => {
    const normalized = new CompactionResultNormalizer().normalize(new CompactionResult({
      episodes: [
        { summary: '  First   complete replacement episode.  ' },
        { summary: 'Second episode.' },
        { summary: 'Third episode.' },
        { summary: 'Fourth distinct phase remains.' },
      ],
      criticalIssues: [{ fact: 'Pinia getter reads undefined products.value' }],
      unresolvedWork: [{ fact: 'Revise design spec for price storage' }],
      durableFacts: [
        { fact: 'Pinia getter reads undefined products.value' },
        { fact: 'Team uses pnpm exec vitest' },
      ],
      userPreferences: [{ fact: 'User prefers concise answers' }],
      importantArtifacts: [{ fact: 'Artifact path: /tmp/design-spec.md' }],
    }));

    expect(normalized.episodes).toEqual([
      { summary: 'First complete replacement episode.' },
      { summary: 'Second episode.' },
      { summary: 'Third episode.' },
      { summary: 'Fourth distinct phase remains.' },
    ]);
    expect(normalized.semanticEntries.map(({ category }) => category)).toEqual([
      'critical_issue',
      'unresolved_work',
      'user_preference',
      'durable_fact',
      'important_artifact',
    ]);
    expect(normalized.semanticEntries.filter(({ fact }) =>
      fact.includes('Pinia getter'))).toHaveLength(1);
    expect(normalized.semanticEntries[0]?.salience)
      .toBeGreaterThan(normalized.semanticEntries[3]?.salience ?? 0);
    expect(Object.keys(normalized.semanticEntries[0] ?? {})).toEqual([
      'category',
      'fact',
      'salience',
    ]);
  });

  it('retains more than twenty continuation-critical facts with positive salience', () => {
    const normalized = new CompactionResultNormalizer().normalize(new CompactionResult({
      episodes: [{ summary: 'A naturally sized replacement remains valid.' }],
      durableFacts: Array.from({ length: 25 }, (_, index) => ({
        fact: `Continuation-critical fact ${String(index + 1).padStart(2, '0')}`,
      })),
    }));

    expect(normalized.semanticEntries).toHaveLength(25);
    expect(normalized.semanticEntries[0]?.fact).toBe('Continuation-critical fact 01');
    expect(normalized.semanticEntries.at(-1)?.fact).toBe('Continuation-critical fact 25');
    expect(normalized.semanticEntries.every(({ salience }) => salience > 0)).toBe(true);
  });

  it('drops low-value operational noise outside critical and unresolved categories', () => {
    const normalized = new CompactionResultNormalizer().normalize(new CompactionResult({
      episodes: [{ summary: 'A valid episode remains required.' }],
      durableFacts: [
        { fact: 'Dev server running on localhost:3000 (multiple Nuxt processes detected)' },
        { fact: 'Docs status updated for README inventory' },
      ],
      unresolvedWork: [{ fact: 'Need to fix the compaction status banner typing' }],
    }));

    expect(normalized.semanticEntries).toEqual([
      expect.objectContaining({
        category: 'unresolved_work',
        fact: 'Need to fix the compaction status banner typing',
      }),
    ]);
  });
});
