import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { COMPACTION_SUMMARY_INSTRUCTION, COMPACTION_SUMMARY_PROMPT } from '../../../src/memory/compaction/compaction-summary-prompt.js';
import { COMPACTION_SUMMARY_HEADINGS, CompactionSummaryValidationError, parseCompactionSummary, validateCompactionSummaryBody } from '../../../src/memory/compaction/compaction-summary-parser.js';

const body = COMPACTION_SUMMARY_HEADINGS.map(h => `## ${h}\n- Keep /repo/check.ts; approval pending.`).join('\n\n');
const tagged = `<compaction_summary>\n${body}\n</compaction_summary>`;

describe('compaction summary prompt and contract', () => {
  it('ships the exact approved v6 transcript prompt', () => {
    expect(createHash('sha256').update(COMPACTION_SUMMARY_PROMPT).digest('hex')).toBe('c3105f73f70ae7ceb43941cb617f25b57f809842875a33920ff23c046ab224f6');
  });
  it('ships the exact approved v5 instruction, asking the agent in its own voice for a note to itself', () => {
    expect(createHash('sha256').update(COMPACTION_SUMMARY_INSTRUCTION).digest('hex')).toBe('43da1ce9d9df6b1a00f76d17cc146077d7d9be9699fbef83b023457f445af666');
    expect(COMPACTION_SUMMARY_INSTRUCTION.startsWith('Your context window is nearly full')).toBe(true);
    expect(COMPACTION_SUMMARY_INSTRUCTION).not.toMatch(/target agent|supplied (conversation )?history/i);
    expect(COMPACTION_SUMMARY_INSTRUCTION).toContain('Do not call any tools and do not continue the task in this reply.');
    expect(COMPACTION_SUMMARY_INSTRUCTION).toContain('Your system instructions stay in place after this, so do not restate your role, rules or process from them');
    // v5 additions (SR-008).
    for (const sentence of [
      'This request to write the note is not part of your work; do not record it in the note.',
      'Include earlier decisions and corrections that still apply, not only the most recent ones.',
      'keep every open doubt you raised, even if the conversation later moved on from it',
      'identifiers (such as commit hashes and IDs)',
      'do not write names or paths you did not actually see in this conversation.',
    ]) expect(COMPACTION_SUMMARY_INSTRUCTION).toContain(sentence);
  });
  it('requests the same nine-heading output contract on both paths, so one parser validates both', () => {
    const block = (text: string) => text.slice(text.indexOf('<compaction_summary>'), text.indexOf('</compaction_summary>') + '</compaction_summary>'.length);
    expect(COMPACTION_SUMMARY_HEADINGS).toHaveLength(9);
    expect(block(COMPACTION_SUMMARY_INSTRUCTION)).toBe(block(COMPACTION_SUMMARY_PROMPT));
    expect([...block(COMPACTION_SUMMARY_INSTRUCTION).matchAll(/^## (.+)$/gm)].map(([, heading]) => heading)).toEqual([...COMPACTION_SUMMARY_HEADINGS]);
    for (const text of [COMPACTION_SUMMARY_INSTRUCTION, COMPACTION_SUMMARY_PROMPT]) {
      const guidance = COMPACTION_SUMMARY_HEADINGS.map(heading => text.indexOf(`\n- ${heading}: `));
      expect(guidance.every((index, i) => index > 0 && (i === 0 || index > guidance[i - 1]!))).toBe(true);
    }
    expect(COMPACTION_SUMMARY_INSTRUCTION).toContain('with short bullets starting with "- ". Write "(none)" under a heading that has nothing to record.');
  });
  it('extracts one inner body, ignores exterior, and preserves Markdown/CRLF', () => {
    expect(parseCompactionSummary(`outside\n${tagged}\noutside`)).toBe(body);
    const empty = COMPACTION_SUMMARY_HEADINGS.map(h => `## ${h}\r\n(none)`).join('\r\n\r\n');
    expect(parseCompactionSummary(`<compaction_summary>${empty}</compaction_summary>`)).toBe(empty);
    expect(validateCompactionSummaryBody(`\n${body}\n`)).toBe(body);
  });
  describe('an empty section, optionally explained on its first line (SR-012)', () => {
    const withFiles = (section: string) => body.replace('## Files created or changed\n- Keep /repo/check.ts; approval pending.', `## Files created or changed\n${section}`);
    it.each([
      '(none)', '(None)', '(NONE)', '(none) — this has been a read-only investigation.', '(none — this has been a read-only investigation)',
      '(none) - nothing was written', '(none – nothing was written)', '(none)\n- a later bullet is harmless',
    ])('accepts %s', (section) => {
      const value = withFiles(section);
      expect(value).not.toBe(body);
      expect(validateCompactionSummaryBody(value)).toBe(value);
      expect(parseCompactionSummary(`<compaction_summary>\n${value}\n</compaction_summary>`)).toBe(value);
    });
    it.each([
      ['(nonexistent files were not checked)'], ['none'], ['none — read-only'], [''], ['Nothing was written in this conversation.'],
      ['The agent wrote nothing. (none)'],
    ])('rejects %j', (section) => {
      expect(() => validateCompactionSummaryBody(withFiles(section))).toThrow(CompactionSummaryValidationError);
    });
  });
  it('accepts an unwrapped reply with neither marker as the body (SR-011)', () => {
    expect(parseCompactionSummary(body)).toBe(body);
    expect(parseCompactionSummary(`\n\n${body}\n`)).toBe(body);
    const crlf = COMPACTION_SUMMARY_HEADINGS.map(h => `## ${h}\r\n(none)`).join('\r\n\r\n');
    expect(parseCompactionSummary(crlf)).toBe(crlf);
  });
  it.each([
    ['text before the first heading', `Here is my note:\n\n${body}`],
    ['a code fence', '```markdown\n' + body + '\n```'],
    ['a missing heading', body.replace(/## Current state\n- Keep \/repo\/check\.ts; approval pending\.\n\n/, '')],
    ['reordered headings', body.replace('## Completed work', '## TMP').replace('## Current state', '## Completed work').replace('## TMP', '## Current state')],
    ['a section without bullets', body.replace('## Current state\n- Keep /repo/check.ts; approval pending.', '## Current state\nSome prose.')],
    ['the opening marker only', `<compaction_summary>\n${body}`],
    ['the closing marker only', `${body}\n</compaction_summary>`],
    ['markers out of order', `</compaction_summary>\n${body}\n<compaction_summary>`],
    ['two blocks', tagged + '\n' + tagged],
  ])('rejects an unwrapped or malformed reply with %s', (_label, value) => {
    expect(value).not.toBe(body);
    expect(() => parseCompactionSummary(value)).toThrow(CompactionSummaryValidationError);
  });
  it.each(['', 'plain summary', '<compaction_summary></compaction_summary>', tagged + tagged,
    tagged.replace('</compaction_summary>', ''), '</compaction_summary>' + tagged,
    tagged.replace('## Current state', '## Other'), tagged.replace('- Keep /repo/check.ts; approval pending.', '')])('rejects invalid envelope %s', value => {
    expect(() => parseCompactionSummary(value)).toThrow();
  });
  it('rejects a body in the retired six-heading format', () => {
    const retired = ['Goal and constraints', 'Decisions and findings', 'Completed work', 'Current state', 'Open work and next steps', 'Essential references']
      .map(h => `## ${h}\n- Keep /repo/check.ts.`).join('\n\n');
    expect(() => validateCompactionSummaryBody(retired)).toThrow('Summary requires the 9 exact headings in the approved order.');
  });
  it.each([tagged, undefined, {}, body.replace('## Current state', '## Other'), 'prefix\n' + body])('rejects non-body result %s', value => {
    expect(() => validateCompactionSummaryBody(value as string)).toThrow();
  });
});
