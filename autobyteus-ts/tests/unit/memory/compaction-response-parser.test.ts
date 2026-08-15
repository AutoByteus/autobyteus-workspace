import { describe, expect, it } from 'vitest';
import {
  CompactionResponseParseError,
  CompactionResponseParser,
  type CompactionResponseValidationStage,
} from '../../../src/memory/compaction/compaction-response-parser.js';
import { providerSafeCompactionText } from '../../../src/memory/presentation/unicode-safe-text.js';

const currentResponse = (overrides: Record<string, unknown> = {}) => ({
  episodes: [{ summary: 'Earlier work was compacted.' }],
  critical_issues: [{ fact: 'Build is blocked by a missing dependency.' }],
  unresolved_work: [{ fact: 'Run compactor E2E after code review.' }],
  durable_facts: [{ fact: 'Compactor runs are visible normal agent runs.' }],
  user_preferences: [{ fact: 'User wants independently testable prompts.' }],
  important_artifacts: [{ fact: 'The implementation handoff remains authoritative.' }],
  ...overrides,
});

const captureParseError = (
  response: string,
  stage: CompactionResponseValidationStage,
): CompactionResponseParseError => {
  try {
    new CompactionResponseParser().parse(response);
  } catch (error) {
    expect(error).toBeInstanceOf(CompactionResponseParseError);
    expect(error).toMatchObject({ stage });
    return error as CompactionResponseParseError;
  }
  throw new Error('Expected compaction parsing to fail.');
};

describe('CompactionResponseParser', () => {
  it.each([
    ['exact JSON', JSON.stringify(currentResponse())],
    ['JSON fence', `\`\`\`json\n${JSON.stringify(currentResponse())}\n\`\`\``],
    ['visible prose', `Result follows.\n${JSON.stringify(currentResponse())}\nDone.`],
  ])('parses the six-array response from %s', (_label, response) => {
    const result = new CompactionResponseParser().parse(response);

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

  it('selects the schema-valid candidate instead of the first parseable object', () => {
    const result = new CompactionResponseParser().parse([
      'Unrelated metadata: {"status":"done"}',
      `Compaction: ${JSON.stringify(currentResponse())}`,
    ].join('\n'));

    expect(result.episodes).toEqual([{ summary: 'Earlier work was compacted.' }]);
  });

  it('projects harmless extras and discards blank or non-string recognized entries', () => {
    const result = new CompactionResponseParser().parse(JSON.stringify(currentResponse({
      diagnostic: 'ignored',
      episodes: [
        null,
        {},
        { summary: 42 },
        { summary: '   ' },
        { summary: 'Projected episode', confidence: 0.9 },
      ],
      critical_issues: [
        null,
        {},
        { fact: false },
        { fact: 'Projected fact', reference: 'turn-1' },
      ],
    })));

    expect(result.episodes).toEqual([{ summary: 'Projected episode' }]);
    expect(result.criticalIssues).toEqual([{ fact: 'Projected fact' }]);
    expect(result).not.toHaveProperty('diagnostic');
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

  it('clamps accepted text without splitting surrogate pairs and repairs only malformed derived copies', () => {
    const source = currentResponse({
      episodes: [{ summary: '1234🛡️tail' }],
      critical_issues: [{ fact: '1234\uD83Dtail' }],
      unresolved_work: [],
      durable_facts: [],
      user_preferences: [],
      important_artifacts: [],
    });
    const before = JSON.stringify(source);
    const result = new CompactionResponseParser({
      maxEpisodeChars: 5,
      maxFactChars: 9,
    }).parse(JSON.stringify(source));

    expect(result.episodes).toEqual([{ summary: '1234' }]);
    expect(result.criticalIssues).toEqual([{ fact: '1234�tail' }]);
    expect(result.episodes[0]!.summary.length).toBeLessThanOrEqual(5);
    expect(result.criticalIssues[0]!.fact.length).toBeLessThanOrEqual(9);
    expect(providerSafeCompactionText.isProviderSafeText(result.episodes[0]!.summary)).toBe(true);
    expect(providerSafeCompactionText.isProviderSafeText(result.criticalIssues[0]!.fact)).toBe(true);
    expect(JSON.stringify(source)).toBe(before);
  });

  it.each([
    ['missing required array', { important_artifacts: undefined }, 'missing a important_artifacts array'],
    ['wrong required field type', { durable_facts: {} }, 'missing a durable_facts array'],
    ['no nonblank episode', { episodes: [null, {}, { summary: ' ' }] }, 'at least one non-empty episode'],
    ['wrong episode entry shape', { episodes: [{ text: 'wrong alias' }] }, 'must contain summary'],
    ['wrong fact entry shape', { critical_issues: [{ text: 'wrong alias' }] }, 'must contain fact'],
  ])('rejects %s at the six-array schema stage', (_label, overrides, message) => {
    const error = captureParseError(
      JSON.stringify(currentResponse(overrides as Record<string, unknown>)),
      'six_array_schema_validation',
    );
    expect(error.message).toContain(message);
  });

  it('reports the most complete invalid candidate instead of an unrelated nested object', () => {
    const incomplete = currentResponse();
    delete (incomplete as Record<string, unknown>).important_artifacts;
    const error = captureParseError(
      `{"note":"unrelated"}\n${JSON.stringify(incomplete)}`,
      'six_array_schema_validation',
    );

    expect(error.message).toContain('important_artifacts');
  });

  it('deduplicates extraction duplicates and output-equivalent valid objects', () => {
    const base = JSON.stringify(currentResponse());
    const withExtras = JSON.stringify({ ...currentResponse(), diagnostic: 'ignored' });
    const result = new CompactionResponseParser().parse(
      `\`\`\`json\n${base}\n\`\`\`\n${base}\n${withExtras}`,
    );

    expect(result.episodes).toEqual([{ summary: 'Earlier work was compacted.' }]);
  });

  it('rejects two distinct valid compaction objects as ambiguous', () => {
    const error = captureParseError([
      JSON.stringify(currentResponse()),
      JSON.stringify(currentResponse({ episodes: [{ summary: 'Different result.' }] })),
    ].join('\n'), 'multiple_valid_objects');

    expect(error.message).toContain('multiple distinct valid compaction objects');
  });

  it('classifies source-task commentary and tool markup without JSON as extraction failure', () => {
    const error = captureParseError(
      'Let me inspect the source first. <tool name="run_bash">pnpm test</tool>',
      'json_object_extraction',
    );

    expect(error.message).toContain('Could not parse a valid JSON object');
  });
});
