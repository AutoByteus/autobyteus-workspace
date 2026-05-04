import path from "node:path";

const CANDIDATE_PATTERN = /(^|[\s("'`*_])((?:\/(?!\/)[^\s<>"'`]+)|(?:[A-Za-z]:[\\/][^\s<>"'`]+))/g;
const TRAILING_PUNCTUATION = new Set([".", ",", ";", ":", "!", "?"]);
const TRAILING_BRACKETS: Record<string, string> = {
  ")": "(",
  "]": "[",
  "}": "{",
};
const KNOWN_EXTENSIONLESS_FILE_NAMES = new Set([
  "dockerfile",
  "makefile",
  "license",
  "notice",
  "readme",
  "gemfile",
  "rakefile",
  "procfile",
  "vagrantfile",
  "justfile",
]);

const countChar = (value: string, char: string): number =>
  Array.from(value).filter((candidate) => candidate === char).length;

const stripTrailingDelimiters = (
  value: string,
  emphasisDelimiter: "*" | "_" | null = null,
): string => {
  let next = value.trim();
  let changed = true;

  while (changed && next.length > 0) {
    changed = false;
    const last = next[next.length - 1];
    if (!last) {
      break;
    }

    if (TRAILING_PUNCTUATION.has(last)) {
      next = next.slice(0, -1).trimEnd();
      changed = true;
      continue;
    }

    if (emphasisDelimiter && last === emphasisDelimiter) {
      next = next.slice(0, -1).trimEnd();
      changed = true;
      continue;
    }

    const openingBracket = TRAILING_BRACKETS[last];
    if (openingBracket && countChar(next, last) > countChar(next, openingBracket)) {
      next = next.slice(0, -1).trimEnd();
      changed = true;
    }
  }

  return next;
};

const normalizeCandidatePath = (
  value: string,
  emphasisDelimiter: "*" | "_" | null = null,
): string =>
  stripTrailingDelimiters(value, emphasisDelimiter).replace(/\\/g, "/").replace(/\/+/g, "/");

const isAbsoluteLocalPath = (value: string): boolean =>
  path.posix.isAbsolute(value) || path.win32.isAbsolute(value) || path.isAbsolute(value);

const hasFileLikeBasename = (value: string): boolean => {
  const basename = path.posix.basename(value).trim();
  if (!basename || basename === "." || basename === "..") {
    return false;
  }
  if (basename.includes(".")) {
    return true;
  }
  return KNOWN_EXTENSIONLESS_FILE_NAMES.has(basename.toLowerCase());
};

export const isValidMessageFileReferencePathCandidate = (value: string): boolean => {
  const candidate = normalizeCandidatePath(value);
  if (!candidate || candidate.includes("\0")) {
    return false;
  }
  if (candidate.startsWith("//") || candidate.includes("://")) {
    return false;
  }
  if (!isAbsoluteLocalPath(candidate)) {
    return false;
  }

  const segments = candidate.split("/").filter(Boolean);
  if (segments.length < 2) {
    return false;
  }
  if (
    segments.some((segment) =>
      segment === "." ||
      segment === ".." ||
      segment.startsWith(":") ||
      segment.includes("{") ||
      segment.includes("}")
    )
  ) {
    return false;
  }

  return hasFileLikeBasename(candidate);
};

export const extractMessageFileReferencePathCandidates = (content: string): string[] => {
  if (typeof content !== "string" || content.length === 0 || content.includes("\0")) {
    return [];
  }

  const paths: string[] = [];
  const seen = new Set<string>();
  CANDIDATE_PATTERN.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = CANDIDATE_PATTERN.exec(content)) !== null) {
    const rawCandidate = match[2];
    if (!rawCandidate) {
      continue;
    }

    const leadingDelimiter = match[1];
    const emphasisDelimiter: "*" | "_" | null =
      leadingDelimiter === "*" || leadingDelimiter === "_" ? leadingDelimiter : null;
    const normalized = normalizeCandidatePath(rawCandidate, emphasisDelimiter);
    if (!isValidMessageFileReferencePathCandidate(normalized) || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    paths.push(normalized);
  }

  return paths;
};
