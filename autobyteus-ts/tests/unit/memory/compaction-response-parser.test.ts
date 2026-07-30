import { describe, expect, it } from 'vitest';
import {
  CompactionResponseParseError,
  CompactionResponseParser,
} from '../../../src/memory/compaction/compaction-response-parser.js';

const currentResponse = (overrides: Record<string, unknown> = {}) => ({
  episodes: [{ summary: 'Earlier work was compacted.' }],
  critical_issues: [{ fact: 'Build is blocked by a missing dependency.' }],
  unresolved_work: [{ fact: 'Run compactor E2E after code review.' }],
  durable_facts: [{ fact: 'Compactor runs are visible normal agent runs.' }],
  user_preferences: [{ fact: 'User wants independently testable prompts.' }],
  important_artifacts: [{ fact: 'The implementation handoff remains authoritative.' }],
  ...overrides,
});

describe('CompactionResponseParser', () => {
  it('parses the exact current replacement bundle from fenced JSON', () => {
    const result = new CompactionResponseParser().parse(
      `\`\`\`json\n${JSON.stringify(currentResponse())}\n\`\`\``,
    );

    expect(result.episodes).toEqual([{ summary: 'Earlier work was compacted.' }]);
    expect(result.criticalIssues).toEqual([
      { fact: 'Build is blocked by a missing dependency.' },
    ]);
    expect(result.unresolvedWork).toEqual([
      { fact: 'Run compactor E2E after code review.' },
    ]);
    expect(result.durableFacts).toEqual([
      { fact: 'Compactor runs are visible normal agent runs.' },
    ]);
    expect(result.userPreferences).toEqual([
      { fact: 'User wants independently testable prompts.' },
    ]);
    expect(result.importantArtifacts).toEqual([
      { fact: 'The implementation handoff remains authoritative.' },
    ]);
  });

  it('enforces one-to-three episodes, twenty facts, and configured text bounds', () => {
    const parser = new CompactionResponseParser({
      maxEpisodeChars: 8,
      maxFactChars: 6,
      maxFactCount: 20,
    });
    const result = parser.parse(JSON.stringify(currentResponse({
      episodes: Array.from({ length: 5 }, (_, index) => ({
        summary: `episode-${index + 1}-oversized`,
      })),
      critical_issues: Array.from({ length: 25 }, (_, index) => ({
        fact: `fact-${String(index + 1).padStart(2, '0')}-oversized`,
      })),
      unresolved_work: [],
      durable_facts: [],
      user_preferences: [],
      important_artifacts: [],
    })));

    expect(result.episodes).toHaveLength(3);
    expect(result.episodes.every(({ summary }) => summary.length <= 8)).toBe(true);
    expect(result.criticalIssues).toHaveLength(20);
    expect(result.criticalIssues.every(({ fact }) => fact.length <= 6)).toBe(true);
  });

  it('rejects removed aliases, stale entry metadata, and incomplete current responses', () => {
    expect(() => new CompactionResponseParser().parse(JSON.stringify({
      ...currentResponse(),
      episodic_summary: 'removed alias',
    }))).toThrow(CompactionResponseParseError);
    expect(() => new CompactionResponseParser().parse(JSON.stringify(currentResponse({
      critical_issues: [{ fact: 'Keep only fact.', reference: 'turn-1' }],
    })))).toThrow('may contain only fact');
    expect(() => new CompactionResponseParser().parse(JSON.stringify(currentResponse({
      episodes: [],
    })))).toThrow('one to three non-empty episodes');
    expect(() => new CompactionResponseParser().parse(JSON.stringify({
      episodes: [{ summary: 'only field present' }],
    }))).toThrow('missing a critical_issues array');
  });
});
