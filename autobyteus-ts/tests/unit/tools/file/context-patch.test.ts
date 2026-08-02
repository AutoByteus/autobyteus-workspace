import { describe, expect, it } from 'vitest';
import {
  applyContextPatch,
  PatchApplicationError,
} from '../../../../src/tools/file/context-patch.js';

describe('applyContextPatch', () => {
  it('applies a uniquely located replacement with the canonical bare header', () => {
    const original = 'alpha\ntarget: old\nomega\n';
    const patch = '@@\n alpha\n-target: old\n+target: new\n omega\n';

    expect(applyContextPatch(original, patch)).toBe('alpha\ntarget: new\nomega\n');
  });

  it('uses surrounding context to locate a repeated changed line', () => {
    const original = 'name: alpha\nstatus: draft\nname: beta\nstatus: draft\n';
    const patch = '@@\n name: beta\n-status: draft\n+status: ready\n';

    expect(applyContextPatch(original, patch)).toBe(
      'name: alpha\nstatus: draft\nname: beta\nstatus: ready\n'
    );
  });

  it('applies an addition when unchanged context anchors it', () => {
    expect(applyContextPatch(
      'alpha\nomega\n',
      '@@\n alpha\n+inserted\n omega\n'
    )).toBe('alpha\ninserted\nomega\n');
  });

  it('supports one whitespace-tolerant matching strategy while preserving actual context', () => {
    const original = 'def foo():\n    return True\n';
    const patch = '@@\n def foo():\n-  return True\n+  return False\n';

    expect(() => applyContextPatch(original, patch)).toThrow(PatchApplicationError);
    expect(applyContextPatch(original, patch, { ignoreWhitespace: true }))
      .toBe('def foo():\n  return False\n');
  });

  it('discards wrong numeric decoration and locates solely by unique context', () => {
    expect(applyContextPatch(
      'prefix\nold\nsuffix\n',
      '@@ -999,50 +700,80 @@\n-old\n+new\n'
    )).toBe('prefix\nnew\nsuffix\n');
  });

  it('does not use plausible numeric decoration to resolve ambiguous context', () => {
    expect(() => applyContextPatch(
      'old\nseparator\nold\n',
      '@@ -1,1 +1,1 @@\n-old\n+new\n'
    )).toThrow(/ambiguous/i);
  });

  it('applies multiple ordered hunks only in the still-eligible region', () => {
    const original = 'item: old\nbetween\nitem: old\nend\n';
    const patch = [
      '@@',
      '-item: old',
      '+item: first',
      ' between',
      '@@',
      '-item: old',
      '+item: second',
      ' end',
      '',
    ].join('\n');

    expect(applyContextPatch(original, patch)).toBe(
      'item: first\nbetween\nitem: second\nend\n'
    );
  });

  it.each([
    ['', /empty/i],
    ['@@\n alpha\n', /no addition or removal/i],
    ['@@\n+inserted\n', /safe location anchor/i],
    ['@@\n-missing\n+new\n', /could not find/i],
  ])('rejects unsafe patch %j', (patch, expectedError) => {
    expect(() => applyContextPatch('alpha\n', patch)).toThrow(expectedError);
  });

  it('rejects an ambiguous bare hunk instead of selecting an occurrence', () => {
    expect(() => applyContextPatch(
      'status: draft\nseparator\nstatus: draft\n',
      '@@\n-status: draft\n+status: ready\n'
    )).toThrow(/ambiguous/i);
  });

  it.each([
    ['@@ label\n-old\n+new\n', /unsupported patch header/i],
    ['@@ -1,1 +1,1 @@ label\n-old\n+new\n', /unsupported patch header/i],
    ['@@ -1 +1\n-old\n+new\n', /unsupported patch header/i],
    ['diff --git a/file b/file\n@@\n-old\n+new\n', /unsupported patch header/i],
    ['--- a/file\n+++ b/file\n@@\n-old\n+new\n', /unsupported patch header/i],
    ['*** Begin Patch\n*** Update File: file\n@@\n-old\n+new\n*** End Patch\n', /unsupported patch header/i],
    ['<<<<<<< SEARCH\nold\n=======\nnew\n>>>>>>> REPLACE\n', /unexpected content/i],
    ['@@\n-old\n\n+new\n', /prefix every hunk line/i],
  ])('rejects unsupported or malformed grammar', (patch, expectedError) => {
    expect(() => applyContextPatch('old\n', patch)).toThrow(expectedError);
  });

  it('rejects arbitrary and misplaced no-newline markers', () => {
    expect(() => applyContextPatch(
      'old\n',
      '@@\n-old\n\\ unexpected marker\n+new\n'
    )).toThrow(/unsupported context-patch marker/i);

    expect(() => applyContextPatch(
      'old\n',
      '@@\n\\ No newline at end of file\n-old\n+new\n'
    )).toThrow(/must immediately follow/i);
  });

  it('preserves a final newline when the replacement line has one', () => {
    expect(applyContextPatch('line1\nline2\n', '@@\n line1\n-line2\n+LINE2\n'))
      .toBe('line1\nLINE2\n');
  });

  it('preserves a missing final newline from a patch without a final line ending', () => {
    expect(applyContextPatch('line1\nline2', '@@\n line1\n-line2\n+LINE2'))
      .toBe('line1\nLINE2');
  });

  it('accepts exact standard no-newline markers after removal and addition lines', () => {
    const patch = [
      '@@',
      '-old',
      '\\ No newline at end of file',
      '+new',
      '\\ No newline at end of file',
    ].join('\n');

    expect(applyContextPatch('old', patch)).toBe('new');
  });

  it('applies a late unique edit in a 250,000-line file without a spread overflow', () => {
    const originalLines = Array.from({ length: 250_000 }, (_, index) => `line-${index}\n`);
    originalLines[originalLines.length - 2] = 'unique-target: old\n';
    const original = originalLines.join('');

    const patched = applyContextPatch(
      original,
      '@@\n-unique-target: old\n+unique-target: new\n'
    );

    expect(patched.endsWith('unique-target: new\nline-249999\n')).toBe(true);
    expect(patched.length).toBe(original.length);
  });
});
