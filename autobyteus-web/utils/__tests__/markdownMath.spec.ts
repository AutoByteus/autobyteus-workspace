import { describe, it, expect } from 'vitest';
import { normalizeMath, __testables } from '../markdownMath';

describe('normalizeMath', () => {
  it('converts bracket blocks to display math', () => {
    const input = '[\na^2 + b^2 = c^2\n]';
    const out = normalizeMath(input);
    expect(out).toContain('$$a^2 + b^2 = c^2$$');
  });

  it('wraps loose LaTeX line', () => {
    const input = 'A = \\frac{1}{2}bh';
    const out = normalizeMath(input);
    expect(out.trim()).toBe('$$A = \\frac{1}{2}bh$$');
  });

  it('ignores code fences', () => {
    const input = '```\nA = \\frac{1}{2}bh\n```';
    const out = normalizeMath(input);
    expect(out).toBe(input);
  });

  it('leaves plain text unchanged', () => {
    const input = 'This is plain text.';
    const out = normalizeMath(input);
    expect(out).toBe(input);
  });

  it('preserves LaTeX block delimited by \\[ and \\]', () => {
    const input = '\\[\na^2 + b^2 = c^2\n\\]';
    const out = normalizeMath(input);
    expect(out).toBe(input);
    expect(out).not.toContain('$$a^2');
  });

  it('does not leak wrapping inside \\[ \\] when surrounded by text', () => {
    const input = 'before\n\\[\na^2 + b^2 = c^2\n\\]\nafter';
    const out = normalizeMath(input);
    expect(out).toBe(input);
  });

  it('leaves implicit inline math equation embedded in prose unchanged', () => {
    const input = 'Therefore I_n=1/(2n)+O(1/n^2), and';
    const out = normalizeMath(input);
    expect(out).toBe(input);
  });

  it('leaves mixed inline exponent equation in prose unchanged', () => {
    const input = 'Set x=e^{-t/n} and continue.';
    const out = normalizeMath(input);
    expect(out).toBe(input);
  });

  it('does not convert plain config-like assignment text without math markers', () => {
    const input = 'config file_name=report_v1';
    const out = normalizeMath(input);
    expect(out).toBe(input);
  });

  it('preserves markdown links with underscore-heavy file paths', () => {
    const input =
      '[evidence_extract.md](/Users/normy/.autobyteus/server-data/temp_workspace/paul-paper/evidence_extract.md)';
    const out = normalizeMath(input);
    expect(out).toBe(input);
    expect(out).not.toContain('$Users');
  });

  it('preserves plain path-like prose with underscores and slashes', () => {
    const input = 'Files live in /tmp/temp_workspace/claim_evidence_ledger.md for later review.';
    const out = normalizeMath(input);
    expect(out).toBe(input);
  });
});

describe('helper detection', () => {
  it('detects latex-ish lines', () => {
    const { looksLikeLatex } = __testables;
    // Plain caret math without LaTeX commands should stay false to avoid false positives
    expect(looksLikeLatex('x^2 + y^2')).toBe(false);
    expect(looksLikeLatex('\\sqrt{x}')).toBe(true);
    expect(looksLikeLatex('file_name')).toBe(false);
  });
});
