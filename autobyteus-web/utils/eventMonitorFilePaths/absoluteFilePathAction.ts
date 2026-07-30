import {
  determineFilePreviewType,
  type SupportedFileDataType,
} from '~/utils/fileExplorer/fileTypePolicy';

export type AbsoluteFilePathSourceKind =
  | 'markdown-link'
  | 'prose'
  | 'inline-code'
  | 'fenced-code';

export interface AbsoluteFilePathAction {
  id: string;
  rawCandidate: string;
  rawDestination?: string;
  normalizedCandidate: string;
  sourceKind: AbsoluteFilePathSourceKind;
  displayLabel: string;
  previewType: SupportedFileDataType;
}

export interface AbsoluteFilePathActionCandidate {
  rawCandidate: string;
  normalizedCandidate: string;
  rawDestination?: string;
}

export type EventMonitorMarkdownFileDestination =
  | { kind: 'not-file' }
  | {
    kind: 'valid';
    normalizedCandidate: string;
    previewType: SupportedFileDataType;
    rawDestination?: string;
  }
  | { kind: 'invalid-file'; rawDestination: string };

export interface AbsoluteFilePathCandidate {
  rawCandidate: string;
  normalizedCandidate: string;
  start: number;
  end: number;
}

/**
 * Code blocks can contain a complete path line or a literal Markdown-link
 * destination with spaces. Prose remains whitespace-delimited so ordinary
 * sentences are not reinterpreted as paths.
 */
export function findAbsoluteFilePathCodeCandidates(value: string): AbsoluteFilePathCandidate[] {
  const candidates: AbsoluteFilePathCandidate[] = [];
  const seen = new Set<string>();
  const addCandidate = (rawCandidate: string, start: number): void => {
    const normalizedCandidate = normalizeAbsoluteFilePath(rawCandidate);
    if (!normalizedCandidate) return;
    const key = `${start}:${rawCandidate}`;
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push({
      rawCandidate,
      normalizedCandidate,
      start,
      end: start + rawCandidate.length,
    });
  };

  let lineStart = 0;
  for (const line of value.split('\n')) {
    const trimmedLine = line.trim();
    if (trimmedLine) {
      const leadingWhitespace = line.indexOf(trimmedLine);
      addCandidate(trimmedLine, lineStart + leadingWhitespace);
    }
    lineStart += line.length + 1;
  }

  const markdownLinkDestination = /\]\(((?:\/[^\r\n)]*|[A-Za-z]:[\\/][^\r\n)]*))\)/g;
  let match: RegExpExecArray | null;
  while ((match = markdownLinkDestination.exec(value))) {
    const rawDestination = match[1];
    const rawCandidate = rawDestination.trim();
    const leadingWhitespace = rawDestination.length - rawDestination.trimStart().length;
    const start = match.index + match[0].indexOf(rawDestination) + leadingWhitespace;
    addCandidate(rawCandidate, start);
  }

  return candidates.sort((left, right) => left.start - right.start);
}

const WINDOWS_ABSOLUTE_PATH = /^[A-Za-z]:[\\/]/;
const TRAILING_PATH_PUNCTUATION = /[.,;:!?\]}\)>]+$/;
const INCOMPLETE_PATH_COMPONENTS = new Set(['.', '..', '...', '…']);

export function isAbsoluteFilePath(value: string): boolean {
  const candidate = value.trim();
  return candidate.startsWith('/') || WINDOWS_ABSOLUTE_PATH.test(candidate);
}

export function normalizeAbsoluteFilePath(value: string): string | null {
  const candidate = value.trim();
  if (!isAbsoluteFilePath(candidate) || candidate.includes('\0')) {
    return null;
  }

  const separatorNormalized = candidate.replace(/\\/g, '/');
  if (separatorNormalized.split('/').some((component) => INCOMPLETE_PATH_COMPONENTS.has(component))) {
    return null;
  }

  const normalized = separatorNormalized;
  if (normalized === '/' || /^[A-Za-z]:\/$/.test(normalized)) {
    return null;
  }
  return normalized.replace(/\/+/g, '/').replace(/\/$/, '') || null;
}

const FILE_URI_SCHEME = /^file:/i;

const invalidFileDestination = (rawDestination: string): EventMonitorMarkdownFileDestination => ({
  kind: 'invalid-file',
  rawDestination,
});

const decodeFileUriPath = (rawDestination: string): string | null => {
  const candidate = rawDestination.trim();
  const remainder = candidate.slice(5);
  if (!remainder.startsWith('//')) {
    return null;
  }

  const authorityAndPath = remainder.slice(2);
  const pathStart = authorityAndPath.indexOf('/');
  if (pathStart < 0 || authorityAndPath.slice(0, pathStart)) {
    return null;
  }

  const rawPath = authorityAndPath.slice(pathStart);
  if (rawDestination.includes('?') || rawDestination.includes('#')) {
    return null;
  }

  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(rawPath);
  } catch {
    return null;
  }

  if (/^\/[A-Za-z]:[\\/]/.test(decodedPath)) {
    return decodedPath.slice(1);
  }
  return decodedPath;
};

/**
 * Resolves a raw Markdown link destination without consulting browser URL
 * resolution or any runtime/file-access owner. File URI failures are distinct
 * from ordinary non-file links so Event Monitor can neutralize them safely.
 */
export function resolveEventMonitorMarkdownFileDestination(
  rawDestination: string,
): EventMonitorMarkdownFileDestination {
  const candidate = rawDestination.trim();
  if (FILE_URI_SCHEME.test(candidate)) {
    const decodedPath = decodeFileUriPath(candidate);
    if (!decodedPath) {
      return invalidFileDestination(rawDestination);
    }

    const normalizedCandidate = normalizeAbsoluteFilePath(decodedPath);
    if (!normalizedCandidate) {
      return invalidFileDestination(rawDestination);
    }

    const previewType = determineFilePreviewType(normalizedCandidate);
    if (previewType === 'Unsupported') {
      return invalidFileDestination(rawDestination);
    }

    return {
      kind: 'valid',
      normalizedCandidate,
      previewType,
      rawDestination,
    };
  }

  let decodedCandidate: string;
  try {
    decodedCandidate = decodeURIComponent(candidate);
  } catch {
    return { kind: 'not-file' };
  }

  const normalizedCandidate = normalizeAbsoluteFilePath(decodedCandidate);
  if (!normalizedCandidate) {
    return { kind: 'not-file' };
  }
  const previewType = determineFilePreviewType(normalizedCandidate);
  if (previewType === 'Unsupported') {
    return invalidFileDestination(rawDestination);
  }

  return {
    kind: 'valid',
    normalizedCandidate,
    previewType,
  };
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
  candidate: AbsoluteFilePathActionCandidate,
  sourceKind: AbsoluteFilePathSourceKind,
): AbsoluteFilePathAction | null {
  const normalizedCandidate = normalizeAbsoluteFilePath(candidate.normalizedCandidate);
  if (!normalizedCandidate) {
    return null;
  }

  const previewType = determineFilePreviewType(normalizedCandidate);
  if (previewType === 'Unsupported') {
    return null;
  }

  const action: AbsoluteFilePathAction = {
    id,
    rawCandidate: candidate.rawCandidate,
    normalizedCandidate,
    sourceKind,
    displayLabel: displayNameForAbsoluteFilePath(normalizedCandidate),
    previewType,
  };
  if (candidate.rawDestination !== undefined) {
    action.rawDestination = candidate.rawDestination;
  }
  return action;
}
