import path from "node:path";

export const MEMORY_SYNC_FILE_KINDS = ["agents", "agent_teams"] as const;
export type MemorySyncFileKind = (typeof MEMORY_SYNC_FILE_KINDS)[number];

const kindSet = new Set<string>(MEMORY_SYNC_FILE_KINDS);
const DISALLOWED_LEAF_SUFFIXES = [".tmp", ".partial", ".lock", ".swp", ".swx"];

export class MemorySyncPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MemorySyncPathError";
  }
}

export const normalizeMemorySyncFileKind = (kind: string): MemorySyncFileKind => {
  const normalized = String(kind ?? "").trim();
  if (!kindSet.has(normalized)) {
    throw new MemorySyncPathError(`Unsupported memory sync file kind: ${kind}`);
  }
  return normalized as MemorySyncFileKind;
};

export const normalizeMemorySyncRelativePath = (relativePath: string): string => {
  const raw = String(relativePath ?? "").trim();
  if (!raw) {
    throw new MemorySyncPathError("relativePath is required.");
  }
  if (raw.includes("\0")) {
    throw new MemorySyncPathError("relativePath must not contain null bytes.");
  }
  if (path.isAbsolute(raw) || /^[A-Za-z]:[\\/]/.test(raw)) {
    throw new MemorySyncPathError("relativePath must not be absolute.");
  }

  const slashPath = raw.replace(/\\+/g, "/");
  const segments = slashPath.split("/").filter((segment) => segment.length > 0);
  if (segments.length === 0) {
    throw new MemorySyncPathError("relativePath is required.");
  }
  for (const segment of segments) {
    if (segment === "." || segment === "..") {
      throw new MemorySyncPathError("relativePath must not contain '.' or '..' segments.");
    }
  }
  return segments.join("/");
};

export const toMemorySyncFileKey = (kind: MemorySyncFileKind, relativePath: string): string =>
  `${normalizeMemorySyncFileKind(kind)}/${normalizeMemorySyncRelativePath(relativePath)}`;

export const resolveUnderRoot = (rootDir: string, ...segments: string[]): string => {
  const root = path.resolve(rootDir);
  const candidate = path.resolve(root, ...segments);
  if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) {
    throw new MemorySyncPathError("Resolved path escapes the memory sync root.");
  }
  return candidate;
};

export const resolveKindRelativePathUnderRoot = (
  rootDir: string,
  kind: MemorySyncFileKind,
  relativePath: string,
): string => {
  const normalizedKind = normalizeMemorySyncFileKind(kind);
  const normalizedRelativePath = normalizeMemorySyncRelativePath(relativePath);
  return resolveUnderRoot(rootDir, normalizedKind, ...normalizedRelativePath.split("/"));
};

export const shouldExcludeMemorySyncLeaf = (leafName: string): boolean => {
  const normalized = String(leafName ?? "").trim();
  if (!normalized) {
    return true;
  }
  if (normalized === ".DS_Store") {
    return true;
  }
  return DISALLOWED_LEAF_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
};
