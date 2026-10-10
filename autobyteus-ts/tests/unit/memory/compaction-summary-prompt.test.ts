import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { COMPACTION_SUMMARY_INSTRUCTION, COMPACTION_SUMMARY_PROMPT } from '../../../src/memory/compaction/compaction-summary-prompt.js';
import { COMPACTION_SUMMARY_HEADINGS, parseCompactionSummary, validateCompactionSummaryBody } from '../../../src/memory/compaction/compaction-summary-parser.js';

const body = COMPACTION_SUMMARY_HEADINGS.map(h => `## ${h}\n- Keep /repo/check.ts; approval pending.`).join('\n\n');
const tagged = `<compaction_summary>\n${body}\n</compaction_summary>`;

describe('compaction summary prompt and contract', () => {
  it('ships the exact approved v5 literal', () => {
    expect(createHash('sha256').update(COMPACTION_SUMMARY_PROMPT).digest('hex')).toBe('2018cd60cd6adedbc3c92fa641b8ff3fc632e0fd177db8305d0af036ff5830d7');
  });
  it('builds the cached-request instruction from the same prompt plus the conversation suffix', () => {
    expect(COMPACTION_SUMMARY_INSTRUCTION.startsWith(COMPACTION_SUMMARY_PROMPT)).toBe(true);
    const suffix = COMPACTION_SUMMARY_INSTRUCTION.slice(COMPACTION_SUMMARY_PROMPT.length);
    expect(suffix).toContain('entire conversation so far');
    expect(suffix).toContain('do not restate them');
    expect(suffix).toContain('Do not call any tools and do not continue the task');
    expect(createHash('sha256').update(COMPACTION_SUMMARY_INSTRUCTION).digest('hex')).toBe('a199ce3d9edb4ccb5e4b6bac987185242d7b2b2000907e41e8088d3a2166f45f');
  });
  it('extracts one inner body, ignores exterior, and preserves Markdown/CRLF', () => {
    expect(parseCompactionSummary(`outside\n${tagged}\noutside`)).toBe(body);
    const empty = COMPACTION_SUMMARY_HEADINGS.map(h => `## ${h}\r\n(none)`).join('\r\n\r\n');
    expect(parseCompactionSummary(`<compaction_summary>${empty}</compaction_summary>`)).toBe(empty);
    expect(validateCompactionSummaryBody(`\n${body}\n`)).toBe(body);
  });
  it.each(['', 'plain summary', '<compaction_summary></compaction_summary>', tagged + tagged,
    tagged.replace('</compaction_summary>', ''), '</compaction_summary>' + tagged,
    tagged.replace('## Current state', '## Other'), tagged.replace('- Keep /repo/check.ts; approval pending.', '')])('rejects invalid envelope %s', value => {
    expect(() => parseCompactionSummary(value)).toThrow();
  });
  it.each([tagged, undefined, {}, body.replace('## Current state', '## Other'), 'prefix\n' + body])('rejects non-body result %s', value => {
    expect(() => validateCompactionSummaryBody(value as string)).toThrow();
  });
});
