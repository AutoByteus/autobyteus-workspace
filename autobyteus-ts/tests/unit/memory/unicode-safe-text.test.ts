import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ReadableValueRenderer } from '../../../src/memory/presentation/readable-value-renderer.js';
import {
  ProviderSafeCompactionText,
  providerSafeCompactionText,
} from '../../../src/memory/presentation/unicode-safe-text.js';

const fixture = JSON.parse(fs.readFileSync(
  new URL('../../fixtures/memory/compaction-unicode-shield-tool-trace.json', import.meta.url),
  'utf8',
)) as { tool_result: Record<string, unknown> };

describe('ProviderSafeCompactionText', () => {
  it('normalizes only malformed or unsafe derived code units while preserving valid content', () => {
    const source = [
      'Deutsch 中文 C:\\tmp\\agent.ts ∑ 🛡️ 𝄞',
      '\r\nline-two\rline-three\t',
      '\0\x07\x0B\x0C\x1F\x7F',
      '\uD83Dhigh-only low-only\uDEE1',
    ].join('');
    const beforeCodeUnits = Array.from(
      { length: source.length },
      (_, index) => source.charCodeAt(index),
    );

    const result = providerSafeCompactionText.finalize(source);

    expect(result).toContain('Deutsch 中文 C:\\tmp\\agent.ts ∑ 🛡️ 𝄞');
    expect(result).toContain('\nline-two\nline-three\t');
    expect(result).not.toMatch(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u);
    expect(result.match(/\uFFFD/gu)).toHaveLength(2);
    expect(providerSafeCompactionText.isProviderSafeText(result)).toBe(true);
    expect(Array.from(
      { length: source.length },
      (_, index) => source.charCodeAt(index),
    )).toEqual(beforeCodeUnits);
  });

  it('moves head, tail, and end boundaries past complete surrogate pairs', () => {
    const value = 'A🛡️B';
    const shieldHighIndex = value.indexOf('🛡️');

    expect(providerSafeCompactionText.sliceEndWithoutSplittingSurrogate(
      value,
      shieldHighIndex + 1,
    )).toBe(shieldHighIndex);
    expect(providerSafeCompactionText.sliceStartWithoutSplittingSurrogate(
      value,
      shieldHighIndex + 1,
    )).toBe(shieldHighIndex + 2);
    expect(providerSafeCompactionText.truncateEnd(value, shieldHighIndex + 1)).toBe('A');
    expect(providerSafeCompactionText.truncateEnd('🛡️', 1)).toBe('');
    expect(providerSafeCompactionText.truncateEnd('🛡️', 2)).toBe('🛡');
    expect(providerSafeCompactionText.truncateEnd('🛡️', 3)).toBe('🛡️');
  });

  it('rejects invalid configured boundaries rather than silently changing their meaning', () => {
    const boundary = new ProviderSafeCompactionText();

    expect(() => boundary.truncateEnd('value', -1)).toThrow(RangeError);
    expect(() => boundary.sliceEndWithoutSplittingSurrogate('value', Number.NaN))
      .toThrow(RangeError);
  });
});

describe('ReadableValueRenderer provider-safe omission', () => {
  it('replays the exact shield tool-result boundary without a lone surrogate or fallback replacement', () => {
    const source = JSON.stringify(fixture.tool_result, null, 2);
    const before = JSON.stringify(fixture.tool_result);
    expect(source.length).toBe(2_649);
    expect(source.indexOf('🛡️')).toBe(985);

    const rendered = new ReadableValueRenderer().render(fixture.tool_result, {
      maxChars: 2_000,
    });

    expect(rendered.length).toBeLessThanOrEqual(2_000);
    expect(providerSafeCompactionText.isProviderSafeText(rendered)).toBe(true);
    expect(rendered).not.toContain('\uFFFD');
    expect(rendered).not.toContain('🛡');
    const marker = rendered.match(/… \[(\d+) characters omitted\] …/u);
    expect(marker).not.toBeNull();
    expect(Number(marker![1])).toBe(source.length - (rendered.length - marker![0].length));
    expect(JSON.stringify(fixture.tool_result)).toBe(before);
  });

  it('preserves ordinary no-truncation Unicode and existing credential redaction', () => {
    const source = 'Grüße 中文 /tmp/🛡️/agent.ts Authorization: Bearer secret-token-value';
    const rendered = new ReadableValueRenderer().render(source, { maxChars: null });

    expect(rendered).toBe(
      'Grüße 中文 /tmp/🛡️/agent.ts Authorization: Bearer <redacted-token>',
    );
    expect(source).toContain('secret-token-value');
  });

  it.each([0, 1, 2, 12])('keeps tiny configured limit %d safe and bounded', (maxChars) => {
    const rendered = new ReadableValueRenderer().render('head-🛡️-tail'.repeat(20), {
      maxChars,
    });

    expect(rendered.length).toBeLessThanOrEqual(maxChars);
    expect(providerSafeCompactionText.isProviderSafeText(rendered)).toBe(true);
  });
});
