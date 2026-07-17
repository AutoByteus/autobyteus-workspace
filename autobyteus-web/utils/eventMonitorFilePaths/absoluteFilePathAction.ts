export type AbsoluteFilePathSourceKind =
  | 'markdown-link'
  | 'prose'
  | 'inline-code'
  | 'fenced-code';

export interface AbsoluteFilePathAction {
  id: string;
  rawCandidate: string;
  normalizedCandidate: string;
  sourceKind: AbsoluteFilePathSourceKind;
  displayLabel: string;
}

export interface AbsoluteFilePathCandidate {
  rawCandidate: string;
  normalizedCandidate: string;
  start: number;
  end: number;
}

const WINDOWS_ABSOLUTE_PATH = /^[A-Za-z]:[\\/]/;
const TRAILING_PATH_PUNCTUATION = /[.,;:!?\]}\)>]+$/;

export function isAbsoluteFilePath(value: string): boolean {
  const candidate = value.trim();
  return candidate.startsWith('/') || WINDOWS_ABSOLUTE_PATH.test(candidate);
}

export function normalizeAbsoluteFilePath(value: string): string | null {
  const candidate = value.trim();
  if (!isAbsoluteFilePath(candidate) || candidate.includes('\0')) {
    return null;
  }

  const normalized = candidate.replace(/\\/g, '/');
  if (normalized === '/') {
    return null;
  }
  return normalized.replace(/\/+/g, '/').replace(/\/$/, '') || null;
}

export function displayNameForAbsoluteFilePath(value: string): string {
  const normalized = value.replace(/\\/g, '/').replace(/\/$/, '');
  return normalized.split('/').filter(Boolean).at(-1) || normalized;
}

/**
 * Finds path-shaped prose without interpreting URLs or relative paths.
 * The scanner deliberately does not touch Markdown link destinations; those
 * are handled from the raw link token by the Markdown render model.
 */
export function findAbsoluteFilePathCandidates(value: string): AbsoluteFilePathCandidate[] {
  const candidates: AbsoluteFilePathCandidate[] = [];
  const pattern = /(?:^|[\s([{"'`])((?:\/[^\s<>"'`]+|[A-Za-z]:[\\/][^\s<>"'`]+))/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value))) {
    const rawCandidate = match[1];
    const leadingLength = match[0].length - rawCandidate.length;
    let trimmedCandidate = rawCandidate;
    while (TRAILING_PATH_PUNCTUATION.test(trimmedCandidate)) {
      trimmedCandidate = trimmedCandidate.slice(0, -1);
    }
    const normalizedCandidate = normalizeAbsoluteFilePath(trimmedCandidate);
    if (!normalizedCandidate) {
      continue;
    }

    const start = match.index + leadingLength;
    candidates.push({
      rawCandidate: trimmedCandidate,
      normalizedCandidate,
      start,
      end: start + trimmedCandidate.length,
    });
  }

  return candidates;
}

export function createAbsoluteFilePathAction(
  id: string,
  candidate: { rawCandidate: string; normalizedCandidate: string },
  sourceKind: AbsoluteFilePathSourceKind,
): AbsoluteFilePathAction {
  return {
    id,
    rawCandidate: candidate.rawCandidate,
    normalizedCandidate: candidate.normalizedCandidate,
    sourceKind,
    displayLabel: displayNameForAbsoluteFilePath(candidate.normalizedCandidate),
  };
}
