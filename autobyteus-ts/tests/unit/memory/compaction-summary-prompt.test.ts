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
  it('asks the agent, in its own voice, for a summary of its own conversation', () => {
    expect(COMPACTION_SUMMARY_INSTRUCTION.startsWith('Your context window is nearly full')).toBe(true);
    expect(COMPACTION_SUMMARY_INSTRUCTION).not.toMatch(/target agent|supplied (conversation )?history/i);
    expect(COMPACTION_SUMMARY_INSTRUCTION).toContain('Do not call any tools and do not continue the task in this reply.');
    expect(COMPACTION_SUMMARY_INSTRUCTION).toContain('Your system instructions stay in place, so do not repeat them.');
    expect(createHash('sha256').update(COMPACTION_SUMMARY_INSTRUCTION).digest('hex')).toBe('536583bcef6ca2389e9ae984ffcc5ee09f0812f73c2b88132d26c809348de98f');
  });
  it('requests the same output contract as the transcript prompt, so one parser validates both', () => {
    const block = (text: string) => text.slice(text.indexOf('<compaction_summary>'), text.indexOf('</compaction_summary>') + '</compaction_summary>'.length);
    expect(block(COMPACTION_SUMMARY_INSTRUCTION)).toBe(block(COMPACTION_SUMMARY_PROMPT));
    expect([...block(COMPACTION_SUMMARY_INSTRUCTION).matchAll(/^## (.+)$/gm)].map(([, heading]) => heading)).toEqual([...COMPACTION_SUMMARY_HEADINGS]);
    expect(COMPACTION_SUMMARY_INSTRUCTION).toContain('concise bullets starting with "- ", or "(none)"');
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
