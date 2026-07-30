import { describe, expect, it } from 'vitest';
import { CondensedToolCallRenderer } from '../../../src/memory/presentation/condensed-tool-call-renderer.js';
import { ReadableValueRenderer } from '../../../src/memory/presentation/readable-value-renderer.js';

describe('readable memory presentation', () => {
  const values = new ReadableValueRenderer();

  it('renders short structured values exactly and handles null/undefined/string fallbacks', () => {
    expect(values.render({ answer: 42 }, { maxChars: null })).toBe('{\n  "answer": 42\n}');
    expect(values.render(null, { maxChars: 100 })).toBe('null');
    expect(values.render(undefined, { maxChars: 100 })).toBe('null');
    expect(values.render('plain text', { maxChars: 100 })).toBe('plain text');

    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(values.render(cyclic, { maxChars: 100 })).toBe('[object Object]');
  });

  it('redacts visible credentials, email, and backend-only fields before omission', () => {
    const rendered = values.render(
      [
        'Authorization: Bearer token-material-123456',
        'OPENAI_API_KEY=sk-1234567890abcdefghijklmnop',
        'password=hunter2',
        'user@example.com',
        'turn_id=turn-internal',
      ].join('\n'),
      { maxChars: null },
    );

    expect(rendered).toContain('Authorization: Bearer <redacted-token>');
    expect(rendered).toContain('OPENAI_API_KEY=<redacted-secret>');
    expect(rendered).toContain('password=<redacted-secret>');
    expect(rendered).toContain('<redacted-email>');
    expect(rendered).toContain('<redacted-backend-field>');
    expect(rendered).not.toContain('token-material');
    expect(rendered).not.toContain('hunter2');
    expect(rendered).not.toContain('turn-internal');
  });

  it('uses a deterministic head/tail omission marker with the exact omitted count', () => {
    const input = `HEAD-${'x'.repeat(200)}-TAIL`;
    const rendered = values.render(input, { maxChars: 80 });
    const marker = rendered.match(/… \[(\d+) characters omitted\] …/);

    expect(rendered).toHaveLength(80);
    expect(rendered.startsWith('HEAD-')).toBe(true);
    expect(rendered.endsWith('-TAIL')).toBe(true);
    expect(marker).not.toBeNull();
    const omittedCount = Number(marker![1]);
    const retainedCount = rendered.length - marker![0].length;
    expect(omittedCount).toBe(input.length - retainedCount);
  });

  it('renders complete condensed success/error/no-outcome states without reasoning or IDs', () => {
    const renderer = new CondensedToolCallRenderer();
    const success = renderer.render({
      name: 'search',
      arguments: { query: 'current' },
      outcome: { kind: 'result', value: { matches: 2 } },
    }, { maxValueChars: 100 });
    const error = renderer.render({
      name: 'write',
      arguments: { path: 'x.txt' },
      outcome: { kind: 'error', value: 'permission denied' },
    }, { maxValueChars: 100 });
    const noOutcome = renderer.render({
      name: 'shell',
      arguments: { command: 'sleep 10' },
      outcome: { kind: 'no_outcome', status: 'interrupted' },
    }, { maxValueChars: 100 });

    expect(success).toBe([
      'name: search',
      'status: success',
      'arguments:',
      '  {',
      '    "query": "current"',
      '  }',
      'result:',
      '  {',
      '    "matches": 2',
      '  }',
    ].join('\n'));
    expect(error).toContain('status: error\narguments:');
    expect(error).toContain('\nerror:\n  permission denied');
    expect(noOutcome).toContain('status: interrupted');
    expect(noOutcome).toContain('result: not available');
    for (const rendered of [success, error, noOutcome]) {
      expect(rendered).not.toMatch(/reasoning|tool_call_id|turn_id|correlation_id/i);
    }
  });
});
