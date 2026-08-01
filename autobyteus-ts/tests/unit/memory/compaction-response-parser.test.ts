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

  it('retains natural episode/fact counts while enforcing configured per-entry text bounds', () => {
    const parser = new CompactionResponseParser({
      maxEpisodeChars: 16,
      maxFactChars: 18,
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

    expect(result.episodes).toHaveLength(5);
    expect(result.episodes.every(({ summary }) => summary.length <= 16)).toBe(true);
    expect(result.episodes.at(-1)?.summary).toContain('episode-5');
    expect(result.criticalIssues).toHaveLength(25);
    expect(result.criticalIssues.every(({ fact }) => fact.length <= 18)).toBe(true);
    expect(result.criticalIssues.at(-1)?.fact).toContain('fact-25');
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
    })))).toThrow('at least one non-empty episode');
    expect(() => new CompactionResponseParser().parse(JSON.stringify({
      episodes: [{ summary: 'only field present' }],
    }))).toThrow('missing a critical_issues array');
  });
});
