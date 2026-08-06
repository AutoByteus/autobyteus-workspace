export type DiagnosticCandidateResult =
  | { kind: 'zero' }
  | {
      kind: 'unique';
      startIndex: number;
      lineCount: number;
      mismatchIndex: number;
      expectedLine: string;
      actualLine: string;
    }
  | { kind: 'multiple' };

export type ContextPatchFailure =
  | { kind: 'document'; reason: string }
  | { kind: 'invalid_hunk'; hunkIndex: number; hunkCount: number; reason: string }
  | {
      kind: 'missing_context';
      hunkIndex: number;
      hunkCount: number;
      candidateResult: DiagnosticCandidateResult;
    }
  | {
      kind: 'ambiguous_context';
      hunkIndex: number;
      hunkCount: number;
      matchCount: number;
    };

type FailureMessageFormatter = (failure: ContextPatchFailure) => string;

function formatAttemptFailure(failure: ContextPatchFailure): string {
  switch (failure.kind) {
    case 'document':
      return failure.reason;
    case 'invalid_hunk':
      return `Invalid context hunk ${failure.hunkIndex} of ${failure.hunkCount}: ${failure.reason}`;
    case 'missing_context':
      return `Could not find context hunk ${failure.hunkIndex} of ${failure.hunkCount} in the eligible target region.`;
    case 'ambiguous_context':
      return (
        `Context hunk ${failure.hunkIndex} of ${failure.hunkCount} is ambiguous: matched ` +
        `${failure.matchCount} eligible locations. Include more unique context.`
      );
  }
}

export class PatchApplicationError extends Error {
  readonly failure: ContextPatchFailure;

  constructor(failure: ContextPatchFailure, formatter: FailureMessageFormatter = formatAttemptFailure) {
    super(formatter(failure));
    this.name = 'PatchApplicationError';
    this.failure = failure;
  }
}

export type ContextPatchOptions = { ignoreWhitespace?: boolean };

type ParsedHunkLine = { prefix: ' ' | '-' | '+'; content: string };
type ParsedHunk = {
  hunkIndex: number;
  hunkCount: number;
  lines: ParsedHunkLine[];
  expectedOriginal: string[];
};

// Numeric decoration is tolerated as model-output noise. The expression has
// no capture groups because coordinates never participate in patch semantics.
const NUMERIC_HUNK_HEADER_RE = /^@@ -\d+(?:,\d+)? \+\d+(?:,\d+)? @@$/;
const NO_NEWLINE_MARKER = '\\ No newline at end of file';

function splitLinesKeepEnds(text: string): string[] {
  const matches = text.match(/.*(?:\r\n|\n|$)/g) ?? [];
  if (matches.at(-1) === '') {
    matches.pop();
  }
  return matches;
}

function stripLineEnding(line: string): string {
  return line.replace(/\r?\n$/, '');
}

function removeLineEnding(line: string): string {
  return line.replace(/\r?\n$/, '');
}

function completePatchDocument(patch: string): string {
  if (patch.endsWith('\n')) {
    return patch;
  }
  return patch + (patch.includes('\r\n') ? '\r\n' : '\n');
}

function isUnprefixedHunkHeader(line: string): boolean {
  const token = stripLineEnding(line);
  return token === '@@' || NUMERIC_HUNK_HEADER_RE.test(token);
}

function throwDocumentFailure(reason: string): never {
  throw new PatchApplicationError({ kind: 'document', reason });
}

function throwInvalidHunk(
  hunkIndex: number, hunkCount: number, reason: string
): never {
  throw new PatchApplicationError({ kind: 'invalid_hunk', hunkIndex, hunkCount, reason });
}

function scanRawHunks(patch: string): string[][] {
  if (!patch || patch.trim().length === 0) {
    throwDocumentFailure('Patch content is empty; nothing to apply.');
  }

  const patchLines = splitLinesKeepEnds(completePatchDocument(patch));
  const rawHunks: string[][] = [];
  let lineIndex = 0;

  while (lineIndex < patchLines.length) {
    const headerLine = patchLines[lineIndex];
    if (!isUnprefixedHunkHeader(headerLine)) {
      const unsupportedHeader = headerLine.trimStart().startsWith('@@') ||
        ['diff --git ', '---', '+++', '*** '].some((prefix) => headerLine.startsWith(prefix));
      if (unsupportedHeader) {
        throwDocumentFailure(
          'Unsupported patch header. Use a bare @@ header without file headers, line numbers, labels, or Begin/End metadata.'
        );
      }
      throwDocumentFailure(
        `Unexpected content outside of a bare @@ hunk header: '${stripLineEnding(headerLine)}'.`
      );
    }

    lineIndex += 1;
    const bodyLines: string[] = [];
    while (lineIndex < patchLines.length && !isUnprefixedHunkHeader(patchLines[lineIndex])) {
      bodyLines.push(patchLines[lineIndex]);
      lineIndex += 1;
    }
    rawHunks.push(bodyLines);
  }

  return rawHunks;
}

function parseHunkBody(bodyLines: string[], hunkIndex: number, hunkCount: number): ParsedHunk {
  const lines: ParsedHunkLine[] = [];
  let hasChange = false;

  for (let index = 0; index < bodyLines.length; index += 1) {
    const line = bodyLines[index];
    const markerText = stripLineEnding(line);

    if (markerText === NO_NEWLINE_MARKER) {
      const previous = lines.at(-1);
      if (!previous || stripLineEnding(bodyLines[index - 1]) === NO_NEWLINE_MARKER) {
        throwInvalidHunk(
          hunkIndex,
          hunkCount,
          'The no-newline marker must immediately follow a context, removal, or addition line.'
        );
      }
      previous.content = removeLineEnding(previous.content);
      continue;
    }

    const prefix = line[0];
    if (prefix !== ' ' && prefix !== '-' && prefix !== '+') {
      if (line.startsWith('\\')) {
        throwInvalidHunk(
          hunkIndex,
          hunkCount,
          `Unsupported context-patch marker: '${stripLineEnding(line)}'.`
        );
      }
      throwInvalidHunk(
        hunkIndex,
        hunkCount,
        `Unsupported context-patch line: '${stripLineEnding(line)}'. ` +
        'Prefix every hunk line with one space, -, or +.'
      );
    }

    lines.push({ prefix, content: line.slice(1) });
    if (prefix === '-' || prefix === '+') {
      hasChange = true;
    }
  }

  if (!hasChange) {
    throwInvalidHunk(hunkIndex, hunkCount, 'contains no addition or removal.');
  }

  const expectedOriginal = lines
    .filter((line) => line.prefix === ' ' || line.prefix === '-')
    .map((line) => line.content);

  if (expectedOriginal.length === 0) {
    throwInvalidHunk(
      hunkIndex,
      hunkCount,
      'requires at least one unchanged or removal line as a safe location anchor.'
    );
  }

  return { hunkIndex, hunkCount, lines, expectedOriginal };
}

function parsePatch(patch: string): ParsedHunk[] {
  const rawHunks = scanRawHunks(patch);
  return rawHunks.map((bodyLines, index) =>
    parseHunkBody(bodyLines, index + 1, rawHunks.length)
  );
}

function linesMatch(
  actual: string, expected: string, ignoreWhitespace: boolean, allowEofNewlineMismatch: boolean
): boolean {
  if (ignoreWhitespace) {
    return actual.trim() === expected.trim();
  }
  if (actual === expected) {
    return true;
  }
  return allowEofNewlineMismatch && removeLineEnding(actual) === removeLineEnding(expected);
}

function recordDiagnosticCandidate(
  current: DiagnosticCandidateResult,
  startIndex: number,
  expectedOriginal: string[],
  originalLines: string[],
  mismatchIndex: number
): DiagnosticCandidateResult {
  if (current.kind === 'multiple') {
    return current;
  }
  if (current.kind === 'unique') {
    // The second qualifying window irreversibly discards candidate content.
    return { kind: 'multiple' };
  }
  return {
    kind: 'unique',
    startIndex,
    lineCount: expectedOriginal.length,
    mismatchIndex,
    expectedLine: expectedOriginal[mismatchIndex],
    actualLine: originalLines[startIndex + mismatchIndex]
  };
}

function findUniqueMatch(
  originalLines: string[], hunk: ParsedHunk, eligibleStart: number, ignoreWhitespace: boolean
): number {
  let foundIndex = -1;
  let matchCount = 0;
  let candidateResult: DiagnosticCandidateResult = { kind: 'zero' };
  const candidateDiagnosticsEnabled = hunk.expectedOriginal.length >= 2;

  for (
    let candidateIndex = eligibleStart;
    candidateIndex + hunk.expectedOriginal.length <= originalLines.length;
    candidateIndex += 1
  ) {
    let fullMatch = true;
    let diagnosticMismatchCount = 0;
    let diagnosticMismatchIndex = -1;

    for (let expectedIndex = 0; expectedIndex < hunk.expectedOriginal.length; expectedIndex += 1) {
      const isEofLine = candidateIndex + hunk.expectedOriginal.length === originalLines.length &&
        expectedIndex === hunk.expectedOriginal.length - 1;
      const actualLine = originalLines[candidateIndex + expectedIndex];
      const expectedLine = hunk.expectedOriginal[expectedIndex];

      if (!linesMatch(actualLine, expectedLine, ignoreWhitespace, isEofLine)) {
        fullMatch = false;
      }
      if (
        candidateDiagnosticsEnabled &&
        diagnosticMismatchCount < 2 &&
        !linesMatch(actualLine, expectedLine, true, isEofLine)
      ) {
        diagnosticMismatchCount += 1;
        diagnosticMismatchIndex = expectedIndex;
      }
    }

    if (fullMatch) {
      matchCount += 1;
      foundIndex = candidateIndex;
    } else if (candidateDiagnosticsEnabled && diagnosticMismatchCount === 1) {
      candidateResult = recordDiagnosticCandidate(
        candidateResult,
        candidateIndex,
        hunk.expectedOriginal,
        originalLines,
        diagnosticMismatchIndex
      );
    }
  }

  // Full-match uniqueness remains authoritative after the complete scan;
  // diagnostic candidates never supply an application index.
  if (matchCount > 1) {
    throw new PatchApplicationError({
      kind: 'ambiguous_context',
      hunkIndex: hunk.hunkIndex,
      hunkCount: hunk.hunkCount,
      matchCount
    });
  }
  if (matchCount === 0) {
    throw new PatchApplicationError({
      kind: 'missing_context',
      hunkIndex: hunk.hunkIndex,
      hunkCount: hunk.hunkCount,
      candidateResult
    });
  }
  return foundIndex;
}

function appendLineRange(target: string[], source: string[], start: number, end: number): void {
  for (let index = start; index < end; index += 1) {
    target.push(source[index]);
  }
}

export function applyContextPatch(
  originalContent: string, patch: string, options: ContextPatchOptions = {}
): string {
  const hunks = parsePatch(patch);
  const originalLines = splitLinesKeepEnds(originalContent);
  const outputLines: string[] = [];
  const ignoreWhitespace = options.ignoreWhitespace ?? false;
  let originalCursor = 0;

  for (const hunk of hunks) {
    const matchIndex = findUniqueMatch(originalLines, hunk, originalCursor, ignoreWhitespace);
    appendLineRange(outputLines, originalLines, originalCursor, matchIndex);

    let matchedOffset = 0;
    for (const line of hunk.lines) {
      if (line.prefix === ' ') {
        outputLines.push(originalLines[matchIndex + matchedOffset]);
        matchedOffset += 1;
      } else if (line.prefix === '-') {
        matchedOffset += 1;
      } else {
        outputLines.push(line.content);
      }
    }

    originalCursor = matchIndex + hunk.expectedOriginal.length;
  }

  appendLineRange(outputLines, originalLines, originalCursor, originalLines.length);
  return outputLines.join('');
}
