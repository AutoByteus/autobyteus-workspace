import { describe, expect, it } from 'vitest';
import type { ContextPatchFailure } from '../../../../src/tools/file/context-patch.js';
import { formatEditFilePatchFailure } from '../../../../src/tools/file/edit-file-patch-diagnostic.js';

describe('formatEditFilePatchFailure', () => {
  it('renders the canonical concise unique-candidate diagnostic', () => {
    const failure: ContextPatchFailure = {
      kind: 'missing_context',
      hunkIndex: 2,
      hunkCount: 4,
      candidateResult: {
        kind: 'unique',
        startIndex: 12,
        lineCount: 2,
        mismatchIndex: 0,
        expectedLine: '  private particles = new Particles()\n',
        actualLine: '  private readonly particles = new Particles()\n'
      }
    };

    const message = formatEditFilePatchFailure(failure);
    expect(message).toBe(
      'Could not apply context hunk 2 of 4 after exact and whitespace-tolerant matching.\n' +
      'Unique one-line-difference target at lines 13-14 (diagnostic only; not applied); ' +
      'mismatch at line 13:\n' +
      '-  private particles = new Particles()\n' +
      '+  private readonly particles = new Particles()\n' +
      'Read target lines 13-14 and retry with exact unchanged/removal context. ' +
      'No file changes were written.'
    );
    expect(message).not.toContain('private time = 0');
    expect(message).not.toMatch(/Expected|Candidate|Difference/);
  });

  it('renders zero and multiple states without source content or target locations', () => {
    const zero = formatEditFilePatchFailure({
      kind: 'missing_context',
      hunkIndex: 2,
      hunkCount: 3,
      candidateResult: { kind: 'zero' }
    });
    expect(zero).toBe(
      'Could not apply context hunk 2 of 3 after exact and whitespace-tolerant matching.\n' +
      'No one-line-difference target was found in the eligible region.\n' +
      'Read the current target region for hunk 2 and retry with exact unchanged/removal context. ' +
      'No file changes were written.'
    );

    const multiple = formatEditFilePatchFailure({
      kind: 'missing_context',
      hunkIndex: 2,
      hunkCount: 3,
      candidateResult: { kind: 'multiple' }
    });
    expect(multiple).toBe(
      'Could not apply context hunk 2 of 3 after exact and whitespace-tolerant matching.\n' +
      'Multiple one-line-difference targets were found in the eligible region; none was selected or applied.\n' +
      'Read the current target region for hunk 2 and retry with more unique exact unchanged/removal context. ' +
      'No file changes were written.'
    );

    for (const message of [zero, multiple]) {
      expect(message).not.toMatch(/expected value|actual value|lines \d|mismatch at line/i);
    }
  });

  it('renders ambiguity without source content or target locations', () => {
    const message = formatEditFilePatchFailure({
      kind: 'ambiguous_context',
      hunkIndex: 1,
      hunkCount: 1,
      matchCount: 2
    });

    expect(message).toBe(
      'Could not apply context hunk 1 of 1 after exact and whitespace-tolerant matching: ' +
      'unchanged/removal context matched 2 eligible target locations. No location was selected or applied.\n' +
      'Read the current target region for hunk 1 and retry with more unique exact unchanged/removal context. ' +
      'No file changes were written.'
    );
    expect(message).not.toMatch(/expected|actual|candidate|mismatch/i);
  });

  it('preserves invalid-hunk and document reasons with a no-write result', () => {
    expect(formatEditFilePatchFailure({
      kind: 'invalid_hunk',
      hunkIndex: 2,
      hunkCount: 3,
      reason: 'contains no addition or removal.'
    })).toBe(
      'Invalid context hunk 2 of 3: contains no addition or removal. ' +
      'No file changes were written.'
    );

    expect(formatEditFilePatchFailure({
      kind: 'document',
      reason: 'Unsupported patch header.'
    })).toBe('Unsupported patch header. No file changes were written.');
  });

  it.each([
    {
      name: 'beginning difference',
      expectedLine: `E${'😀'.repeat(260)}\n`,
      actualLine: `A${'😀'.repeat(260)}\n`,
      expectedFocus: 'E',
      actualFocus: 'A'
    },
    {
      name: 'middle difference with distinct leading whitespace',
      expectedLine: `   ${'😀'.repeat(130)}X${'z'.repeat(130)}\n`,
      actualLine: ` ${'😀'.repeat(130)}Y${'z'.repeat(130)}\n`,
      expectedFocus: 'X',
      actualFocus: 'Y'
    },
    {
      name: 'ending difference',
      expectedLine: `${'😀'.repeat(260)}X\n`,
      actualLine: `${'😀'.repeat(260)}Y\n`,
      expectedFocus: 'X',
      actualFocus: 'Y'
    },
    {
      name: 'insertion boundary',
      expectedLine: `${'😀'.repeat(260)}\n`,
      actualLine: `${'😀'.repeat(260)}I\n`,
      expectedFocus: '😀',
      actualFocus: 'I'
    },
    {
      name: 'deletion boundary',
      expectedLine: `${'😀'.repeat(260)}D\n`,
      actualLine: `${'😀'.repeat(260)}\n`,
      expectedFocus: 'D',
      actualFocus: '😀'
    }
  ])('focuses and bounds long Unicode evidence at the $name', ({
    name, expectedLine, actualLine, expectedFocus, actualFocus
  }) => {
    const message = formatEditFilePatchFailure({
      kind: 'missing_context',
      hunkIndex: 1,
      hunkCount: 1,
      candidateResult: {
        kind: 'unique',
        startIndex: 0,
        lineCount: 2,
        mismatchIndex: 0,
        expectedLine,
        actualLine
      }
    });
    const evidenceLines = message.split('\n').filter((line) => /^[+-]/.test(line));

    expect(evidenceLines).toHaveLength(2);
    expect(evidenceLines[0]).toContain(expectedFocus);
    expect(evidenceLines[1]).toContain(actualFocus);
    expect(evidenceLines.some((line) => line.includes('…'))).toBe(true);
    for (const line of evidenceLines) {
      expect(Array.from(line).length).toBeLessThanOrEqual(200);
    }
    if (name.startsWith('middle')) {
      expect(evidenceLines.map((line) => Array.from(line).length)).toEqual([200, 200]);
    }
  });
});
