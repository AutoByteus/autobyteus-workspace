import { describe, expect, it } from 'vitest';
import {
  applyContextPatch,
  type ContextPatchFailure,
  PatchApplicationError,
} from '../../../../src/tools/file/context-patch.js';

function captureFailure(run: () => unknown): ContextPatchFailure {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(PatchApplicationError);
    return (error as PatchApplicationError).failure;
  }
  throw new Error('Expected applyContextPatch to fail.');
}

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

  it('completes an unterminated final addition before untouched LF content', () => {
    expect(applyContextPatch(
      'Visualization load behavior\nExisting validation guidance\n',
      '@@\n Visualization load behavior\n+New loading-state guidance'
    )).toBe(
      'Visualization load behavior\nNew loading-state guidance\nExisting validation guidance\n'
    );
  });

  it('completes an unterminated final addition with the patch CRLF style', () => {
    expect(applyContextPatch(
      'anchor\r\nfollowing\r\n',
      '@@\r\n anchor\r\n+inserted'
    )).toBe('anchor\r\ninserted\r\nfollowing\r\n');
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

  it('treats a prefixed bare delimiter token as unchanged context', () => {
    const original = 'before\n@@\ntarget: old\nafter\n';
    const patch = '@@\n before\n @@\n-target: old\n+target: new\n after\n';

    expect(applyContextPatch(original, patch)).toBe('before\n@@\ntarget: new\nafter\n');
  });

  it('distinguishes an unprefixed CRLF header from prefixed delimiter context', () => {
    const original = 'before\r\n@@\r\ntarget: old\r\n';
    const patch = '@@\r\n before\r\n @@\r\n-target: old\r\n+target: new\r\n';

    expect(applyContextPatch(original, patch)).toBe('before\r\n@@\r\ntarget: new\r\n');
  });

  it('treats a prefixed numeric-looking delimiter token as unchanged context', () => {
    const original = 'before\n@@ -1 +1 @@\ntarget: old\nafter\n';
    const patch = '@@\n before\n @@ -1 +1 @@\n-target: old\n+target: new\n after\n';

    expect(applyContextPatch(original, patch)).toBe(
      'before\n@@ -1 +1 @@\ntarget: new\nafter\n'
    );
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

  it('reports a unique one-line-difference candidate without retaining matching context', () => {
    const failure = captureFailure(() => applyContextPatch(
      'before\nactual value\nstable anchor\nafter\n',
      '@@\n-expected value\n stable anchor\n+replacement\n',
      { ignoreWhitespace: true }
    ));

    expect(failure).toEqual({
      kind: 'missing_context',
      hunkIndex: 1,
      hunkCount: 1,
      candidateResult: {
        kind: 'unique',
        startIndex: 1,
        lineCount: 2,
        mismatchIndex: 0,
        expectedLine: 'expected value\n',
        actualLine: 'actual value\n'
      }
    });
  });

  it('reports zero candidates without retaining submitted or target content', () => {
    const failure = captureFailure(() => applyContextPatch(
      'alpha\nbeta\ngamma\n',
      '@@\n-missing one\n missing two\n+replacement\n',
      { ignoreWhitespace: true }
    ));

    expect(failure).toEqual({
      kind: 'missing_context',
      hunkIndex: 1,
      hunkCount: 1,
      candidateResult: { kind: 'zero' }
    });
  });

  it('does not create a diagnostic candidate for a one-line anchor', () => {
    const failure = captureFailure(() => applyContextPatch(
      'actual value\n',
      '@@\n-expected value\n+replacement\n',
      { ignoreWhitespace: true }
    ));

    expect(failure).toEqual({
      kind: 'missing_context',
      hunkIndex: 1,
      hunkCount: 1,
      candidateResult: { kind: 'zero' }
    });
  });

  it('transitions irreversibly to a content-free multiple candidate result', () => {
    const failure = captureFailure(() => applyContextPatch(
      'actual one\nstable anchor\nseparator\nactual two\nstable anchor\n',
      '@@\n-expected value\n stable anchor\n+replacement\n',
      { ignoreWhitespace: true }
    ));

    expect(failure).toEqual({
      kind: 'missing_context',
      hunkIndex: 1,
      hunkCount: 1,
      candidateResult: { kind: 'multiple' }
    });
  });

  it('keeps scanning after multiple diagnostic candidates and applies a later full match', () => {
    expect(applyContextPatch(
      'actual one\nstable anchor\nseparator one\n' +
      'actual two\nstable anchor\nseparator two\nexpected value\nstable anchor\n',
      '@@\n-expected value\n stable anchor\n+replacement\n',
      { ignoreWhitespace: true }
    )).toBe(
      'actual one\nstable anchor\nseparator one\n' +
      'actual two\nstable anchor\nseparator two\nstable anchor\nreplacement\n'
    );
  });

  it('identifies a missing later hunk using the complete hunk count', () => {
    const failure = captureFailure(() => applyContextPatch(
      'first: old\nbetween\nlast: old\n',
      '@@\n-first: old\n+first: new\n@@\n-missing one\n missing two\n+replacement\n',
      { ignoreWhitespace: true }
    ));

    expect(failure).toEqual({
      kind: 'missing_context',
      hunkIndex: 2,
      hunkCount: 2,
      candidateResult: { kind: 'zero' }
    });
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
    const failure = captureFailure(() => applyContextPatch(
      'status: draft\nseparator\nstatus: draft\n',
      '@@\n-status: draft\n+status: ready\n',
      { ignoreWhitespace: true }
    ));

    expect(failure).toEqual({
      kind: 'ambiguous_context',
      hunkIndex: 1,
      hunkCount: 1,
      matchCount: 2
    });
  });

  it('identifies invalid hunk bodies after establishing the total hunk count', () => {
    const failure = captureFailure(() => applyContextPatch(
      'one\ntwo\nthree\n',
      '@@\n-one\n+ONE\n@@\n two\n@@\n-three\n+THREE\n'
    ));

    expect(failure).toEqual({
      kind: 'invalid_hunk',
      hunkIndex: 2,
      hunkCount: 3,
      reason: 'contains no addition or removal.'
    });
    expect(() => applyContextPatch(
      'one\ntwo\nthree\n',
      '@@\n-one\n+ONE\n@@\n two\n@@\n-three\n+THREE\n'
    )).toThrow('Invalid context hunk 2 of 3: contains no addition or removal.');
  });

  it('keeps unsupported document headers document-level', () => {
    const failure = captureFailure(() => applyContextPatch(
      'old\n',
      'diff --git a/file b/file\n@@\n-old\n+new\n'
    ));

    expect(failure).toEqual({
      kind: 'document',
      reason:
        'Unsupported patch header. Use a bare @@ header without file headers, line numbers, labels, or Begin/End metadata.'
    });
  });

  it('identifies a hunk that lacks a safe location anchor', () => {
    const failure = captureFailure(() => applyContextPatch(
      'old\n',
      '@@\n+new\n'
    ));

    expect(failure).toEqual({
      kind: 'invalid_hunk',
      hunkIndex: 1,
      hunkCount: 1,
      reason: 'requires at least one unchanged or removal line as a safe location anchor.'
    });
  });

  it.each([
    [' @@\n-old\n+new\n', /unsupported patch header/i],
    ['@@ \n-old\n+new\n', /unsupported patch header/i],
    ['\t@@\n-old\n+new\n', /unsupported patch header/i],
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

  it('terminates changed EOF content when the outer patch has no final line ending', () => {
    expect(applyContextPatch('line1\nline2', '@@\n line1\n-line2\n+LINE2'))
      .toBe('line1\nLINE2\n');
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

  it('preserves an untouched EOF line without a terminator when editing earlier content', () => {
    expect(applyContextPatch(
      'alpha\nbeta\nomega',
      '@@\n-alpha\n+ALPHA\n beta'
    )).toBe('ALPHA\nbeta\nomega');
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
