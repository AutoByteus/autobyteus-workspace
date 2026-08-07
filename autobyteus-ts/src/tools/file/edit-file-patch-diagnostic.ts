import type { ContextPatchFailure } from './context-patch.js';

const MAX_EVIDENCE_PAYLOAD_POINTS = 199;
const FOCUSED_SOURCE_POINTS = 197;
const FOCUS_LEFT_POINTS = 98;

function stripOneLineEnding(line: string): string {
  return line.replace(/\r?\n$/, '');
}

function longestCommonPrefixLength(left: string[], right: string[]): number {
  const limit = Math.min(left.length, right.length);
  let index = 0;
  while (index < limit && left[index] === right[index]) {
    index += 1;
  }
  return index;
}

function mapNormalizedOffsetToExactLine(exactLine: string, differenceOffset: number): number {
  const exactPoints = Array.from(exactLine);
  const withoutLeadingWhitespacePoints = Array.from(exactLine.trimStart());
  const leadingWhitespacePoints = exactPoints.length - withoutLeadingWhitespacePoints.length;
  return Math.min(exactPoints.length, leadingWhitespacePoints + differenceOffset);
}

function focusedEvidencePayload(exactLine: string, differenceOffset: number): string {
  const source = Array.from(exactLine);
  if (source.length <= MAX_EVIDENCE_PAYLOAD_POINTS) {
    return exactLine;
  }

  const focus = mapNormalizedOffsetToExactLine(exactLine, differenceOffset);
  const latestStart = Math.max(0, source.length - FOCUSED_SOURCE_POINTS);
  const start = Math.min(Math.max(focus - FOCUS_LEFT_POINTS, 0), latestStart);
  const end = Math.min(source.length, start + FOCUSED_SOURCE_POINTS);
  const leadingEllipsis = start > 0 ? '…' : '';
  const trailingEllipsis = end < source.length ? '…' : '';
  return `${leadingEllipsis}${source.slice(start, end).join('')}${trailingEllipsis}`;
}

function renderEvidenceLines(expectedLine: string, actualLine: string): string {
  const exactExpected = stripOneLineEnding(expectedLine);
  const exactActual = stripOneLineEnding(actualLine);
  const differenceOffset = longestCommonPrefixLength(
    Array.from(exactExpected.trim()),
    Array.from(exactActual.trim())
  );
  return (
    `-${focusedEvidencePayload(exactExpected, differenceOffset)}\n` +
    `+${focusedEvidencePayload(exactActual, differenceOffset)}`
  );
}

function ensureSentence(reason: string): string {
  const trimmed = reason.trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

export function formatEditFilePatchFailure(failure: ContextPatchFailure): string {
  switch (failure.kind) {
    case 'document':
      return `${ensureSentence(failure.reason)} No file changes were written.`;
    case 'invalid_hunk':
      return (
        `Invalid context hunk ${failure.hunkIndex} of ${failure.hunkCount}: ` +
        `${ensureSentence(failure.reason)} No file changes were written.`
      );
    case 'ambiguous_context':
      return (
        `Could not apply context hunk ${failure.hunkIndex} of ${failure.hunkCount} after exact and ` +
        `whitespace-tolerant matching: unchanged/removal context matched ${failure.matchCount} ` +
        'eligible target locations. No location was selected or applied.\n' +
        `Read the current target region for hunk ${failure.hunkIndex} and retry with more unique ` +
        'exact unchanged/removal context. No file changes were written.'
      );
    case 'missing_context': {
      const heading =
        `Could not apply context hunk ${failure.hunkIndex} of ${failure.hunkCount} after exact and ` +
        'whitespace-tolerant matching.';
      if (failure.candidateResult.kind === 'zero') {
        return (
          `${heading}\nNo one-line-difference target was found in the eligible region.\n` +
          `Read the current target region for hunk ${failure.hunkIndex} and retry with exact ` +
          'unchanged/removal context. No file changes were written.'
        );
      }
      if (failure.candidateResult.kind === 'multiple') {
        return (
          `${heading}\nMultiple one-line-difference targets were found in the eligible region; ` +
          'none was selected or applied.\n' +
          `Read the current target region for hunk ${failure.hunkIndex} and retry with more unique ` +
          'exact unchanged/removal context. No file changes were written.'
        );
      }

      const candidate = failure.candidateResult;
      const startLine = candidate.startIndex + 1;
      const endLine = candidate.startIndex + candidate.lineCount;
      const mismatchLine = candidate.startIndex + candidate.mismatchIndex + 1;
      return (
        `${heading}\nUnique one-line-difference target at lines ${startLine}-${endLine} ` +
        `(diagnostic only; not applied); mismatch at line ${mismatchLine}:\n` +
        `${renderEvidenceLines(candidate.expectedLine, candidate.actualLine)}\n` +
        `Read target lines ${startLine}-${endLine} and retry with exact unchanged/removal context. ` +
        'No file changes were written.'
      );
    }
  }
}
