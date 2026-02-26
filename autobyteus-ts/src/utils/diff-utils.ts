export class PatchApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PatchApplicationError';
  }
}

const HUNK_HEADER_RE = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;
const GIT_HEADER_PREFIXES = [
  'diff --git ',
  'index ',
  'new file mode ',
  'deleted file mode ',
  'old mode ',
  'new mode ',
  'similarity index ',
  'dissimilarity index ',
  'rename from ',
  'rename to ',
  'copy from ',
  'copy to ',
  'binary files '
];

function splitLinesKeepEnds(text: string): string[] {
  const matches = text.match(/.*(?:\n|$)/g) ?? [];
  if (matches.length > 0 && matches[matches.length - 1] === '') {
    matches.pop();
  }
  return matches;
}

function linesMatch(
  line1: string,
  line2: string,
  ignoreWhitespace: boolean,
  allowEofNewlineMismatch: boolean
): boolean {
  if (ignoreWhitespace) {
    return line1.trim() === line2.trim();
  }
  if (line1 === line2) {
    return true;
  }
  if (allowEofNewlineMismatch) {
    return line1.replace(/\n$/, '') === line2.replace(/\n$/, '');
  }
  return false;
}

export function applyUnifiedDiff(
  originalLines: string[],
  patch: string,
  options: { fuzzFactor?: number; ignoreWhitespace?: boolean } = {}
): string[] {
  if (!patch || patch.trim().length === 0) {
    throw new PatchApplicationError('Patch content is empty; nothing to apply.');
  }

  const fuzzFactor = options.fuzzFactor ?? 0;
  const ignoreWhitespace = options.ignoreWhitespace ?? false;
  const patchedLines: string[] = [];
  const patchLines = splitLinesKeepEnds(patch);
  let origIdx = 0;
  let lineIdx = 0;

  while (lineIdx < patchLines.length) {
    const line = patchLines[lineIdx];

    if (line.startsWith('---') || line.startsWith('+++')) {
      lineIdx += 1;
      continue;
    }

    const strippedLine = line.trimStart().toLowerCase();
    if (GIT_HEADER_PREFIXES.some((prefix) => strippedLine.startsWith(prefix))) {
      lineIdx += 1;
      continue;
    }

    if (!line.startsWith('@@')) {
      const stripped = line.trim();
      if (stripped === '') {
        lineIdx += 1;
        continue;
      }
      throw new PatchApplicationError(`Unexpected content outside of hunk header: '${stripped}'.`);
    }

    const match = HUNK_HEADER_RE.exec(line);
    if (!match) {
      throw new PatchApplicationError(`Malformed hunk header: '${line.trim()}'.`);
    }

    const oldStart = parseInt(match[1], 10);
    const oldCount = parseInt(match[2] ?? '1', 10);
    const expectedOldCount = Number.isNaN(oldCount) ? 1 : oldCount;

    lineIdx += 1;

    const hunkBody: string[] = [];
    while (lineIdx < patchLines.length) {
      const hunkLine = patchLines[lineIdx];
      if (hunkLine.startsWith('@@')) {
        break;
      }
      hunkBody.push(hunkLine);
      lineIdx += 1;
    }

    const refinedExpectedOrig: string[] = [];
    for (let h = 0; h < hunkBody.length; h += 1) {
      const hLine = hunkBody[h];
      if (hLine.startsWith(' ') || hLine.startsWith('-')) {
        let content = hLine.slice(1);
        if (h + 1 < hunkBody.length && hunkBody[h + 1].startsWith('\\ No newline')) {
          content = content.replace(/\n$/, '');
        }
        refinedExpectedOrig.push(content);
      } else if (hLine.startsWith('+')) {
        continue;
      } else if (hLine.startsWith('\\')) {
        continue;
      } else if (hLine.trim() === '') {
        continue;
      } else {
        throw new PatchApplicationError(`Unsupported patch line: '${hLine.trim()}'.`);
      }
    }

    const expectedCount = refinedExpectedOrig.length;
    const targetIdxBase = oldStart > 0 ? oldStart - 1 : 0;

    let foundIdx = -1;
    const offsets: number[] = [0];
    for (let f = 1; f <= fuzzFactor; f += 1) {
      offsets.push(-f, f);
    }

    for (const offset of offsets) {
      const candidateIdx = targetIdxBase + offset;
      if (candidateIdx < origIdx) {
        continue;
      }
      if (candidateIdx + expectedCount > originalLines.length) {
        continue;
      }

      let matchSuccess = true;
      for (let k = 0; k < expectedCount; k += 1) {
        const isEofLine = candidateIdx + expectedCount === originalLines.length && k === expectedCount - 1;
        if (!linesMatch(
          originalLines[candidateIdx + k],
          refinedExpectedOrig[k],
          ignoreWhitespace,
          isEofLine
        )) {
          matchSuccess = false;
          break;
        }
      }

      if (matchSuccess) {
        foundIdx = candidateIdx;
        break;
      }
    }

    if (foundIdx === -1) {
      throw new PatchApplicationError(
        `Could not find context for hunk starting at ${oldStart} (fuzz=${fuzzFactor}).`
      );
    }

    patchedLines.push(...originalLines.slice(origIdx, foundIdx));

    let matchedOrigOffset = 0;
    for (let h = 0; h < hunkBody.length; h += 1) {
      const hLine = hunkBody[h];

      if (hLine.startsWith(' ')) {
        if (foundIdx + matchedOrigOffset < originalLines.length) {
          patchedLines.push(originalLines[foundIdx + matchedOrigOffset]);
        }
        matchedOrigOffset += 1;
        continue;
      }

      if (hLine.startsWith('-')) {
        matchedOrigOffset += 1;
        continue;
      }

      if (hLine.startsWith('+')) {
        let content = hLine.slice(1);
        if (h + 1 < hunkBody.length && hunkBody[h + 1].startsWith('\\ No newline')) {
          content = content.replace(/\n$/, '');
        }
        patchedLines.push(content);
        continue;
      }

      if (hLine.trim() === '') {
        patchedLines.push(hLine);
        continue;
      }

      if (hLine.startsWith('\\')) {
        continue;
      }
    }

    origIdx = foundIdx + expectedCount;
    if (expectedOldCount === 0) {
      origIdx = foundIdx;
    }
  }

  patchedLines.push(...originalLines.slice(origIdx));
  return patchedLines;
}
