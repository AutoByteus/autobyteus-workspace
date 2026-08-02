export class PatchApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PatchApplicationError';
  }
}

export type ContextPatchOptions = { ignoreWhitespace?: boolean };

type ParsedHunkLine = { prefix: ' ' | '-' | '+'; content: string };
type ParsedHunk = { lines: ParsedHunkLine[]; expectedOriginal: string[] };

// Numeric decoration is tolerated as model-output noise. The expression has
// no capture groups because coordinates never participate in patch semantics.
const NUMERIC_HUNK_HEADER_RE = /^@@ -\d+(?:,\d+)? \+\d+(?:,\d+)? @@$/;
const NO_NEWLINE_MARKER = '\\ No newline at end of file';

function splitLinesKeepEnds(text: string): string[] {
  const matches = text.match(/.*(?:\n|$)/g) ?? [];
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

function isHunkHeader(line: string): boolean {
  const normalized = line.trim();
  return normalized === '@@' || NUMERIC_HUNK_HEADER_RE.test(normalized);
}

function parseHunkBody(bodyLines: string[]): ParsedHunk {
  const lines: ParsedHunkLine[] = [];
  let hasChange = false;

  for (let index = 0; index < bodyLines.length; index += 1) {
    const line = bodyLines[index];
    const markerText = stripLineEnding(line);

    if (markerText === NO_NEWLINE_MARKER) {
      const previous = lines.at(-1);
      if (!previous || stripLineEnding(bodyLines[index - 1]) === NO_NEWLINE_MARKER) {
        throw new PatchApplicationError(
          'The no-newline marker must immediately follow a context, removal, or addition line.'
        );
      }
      previous.content = removeLineEnding(previous.content);
      continue;
    }

    const prefix = line[0];
    if (prefix !== ' ' && prefix !== '-' && prefix !== '+') {
      if (line.startsWith('\\')) {
        throw new PatchApplicationError(
          `Unsupported context-patch marker: '${stripLineEnding(line)}'.`
        );
      }
      throw new PatchApplicationError(
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
    throw new PatchApplicationError('Context hunk contains no addition or removal.');
  }

  const expectedOriginal = lines
    .filter((line) => line.prefix === ' ' || line.prefix === '-')
    .map((line) => line.content);

  if (expectedOriginal.length === 0) {
    throw new PatchApplicationError(
      'Context hunk requires at least one unchanged or removal line as a safe location anchor.'
    );
  }

  return { lines, expectedOriginal };
}

function parsePatch(patch: string): ParsedHunk[] {
  if (!patch || patch.trim().length === 0) {
    throw new PatchApplicationError('Patch content is empty; nothing to apply.');
  }

  const patchLines = splitLinesKeepEnds(patch);
  const hunks: ParsedHunk[] = [];
  let lineIndex = 0;

  while (lineIndex < patchLines.length) {
    const headerLine = patchLines[lineIndex];
    if (!isHunkHeader(headerLine)) {
      const unsupportedHeader = headerLine.trimStart().startsWith('@@') ||
        ['diff --git ', '---', '+++', '*** '].some((prefix) => headerLine.startsWith(prefix));
      if (unsupportedHeader) {
        throw new PatchApplicationError(
          'Unsupported patch header. Use a bare @@ header without file headers, line numbers, labels, or Begin/End metadata.'
        );
      }
      throw new PatchApplicationError(
        `Unexpected content outside of a bare @@ hunk header: '${stripLineEnding(headerLine)}'.`
      );
    }

    lineIndex += 1;
    const bodyLines: string[] = [];
    while (lineIndex < patchLines.length && !isHunkHeader(patchLines[lineIndex])) {
      bodyLines.push(patchLines[lineIndex]);
      lineIndex += 1;
    }
    hunks.push(parseHunkBody(bodyLines));
  }

  return hunks;
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

function findUniqueMatch(
  originalLines: string[], expectedOriginal: string[], eligibleStart: number, ignoreWhitespace: boolean
): number {
  let foundIndex = -1;

  for (
    let candidateIndex = eligibleStart;
    candidateIndex + expectedOriginal.length <= originalLines.length;
    candidateIndex += 1
  ) {
    let matches = true;
    for (let expectedIndex = 0; expectedIndex < expectedOriginal.length; expectedIndex += 1) {
      const isEofLine = candidateIndex + expectedOriginal.length === originalLines.length &&
        expectedIndex === expectedOriginal.length - 1;
      if (!linesMatch(
        originalLines[candidateIndex + expectedIndex], expectedOriginal[expectedIndex],
        ignoreWhitespace, isEofLine
      )) {
        matches = false;
        break;
      }
    }

    if (!matches) {
      continue;
    }
    if (foundIndex !== -1) {
      throw new PatchApplicationError(
        'Context hunk is ambiguous: matched multiple eligible locations. Include more unchanged context.'
      );
    }
    foundIndex = candidateIndex;
  }

  if (foundIndex === -1) {
    throw new PatchApplicationError('Could not find the context hunk in the eligible target region.');
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
    const matchIndex = findUniqueMatch(
      originalLines, hunk.expectedOriginal, originalCursor, ignoreWhitespace
    );
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
