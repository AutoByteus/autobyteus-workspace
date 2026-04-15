import fs from "node:fs";
import path from "node:path";

type WarnFn = (message: string) => void;

export const normalizeOptionalConfigString = (
  value: string | null | undefined,
): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const normalizeOptionalUrlBase = (
  value: string | null | undefined,
): string | null => {
  const normalized = normalizeOptionalConfigString(value);
  return normalized ? normalized.replace(/\/+$/, "") : null;
};

export const resolveConfiguredDirectoryPath = ({
  configuredPath,
  dataDir,
  defaultLeaf,
}: {
  configuredPath: string | null | undefined;
  dataDir: string;
  defaultLeaf: string;
}): string => {
  const normalized = normalizeOptionalConfigString(configuredPath);
  if (!normalized) {
    return path.join(dataDir, defaultLeaf);
  }

  return path.isAbsolute(normalized)
    ? path.resolve(normalized)
    : path.resolve(dataDir, normalized);
};

export const listExistingDirectoryPaths = ({
  rawValue,
  label,
  onWarn,
}: {
  rawValue: string | null | undefined;
  label: string;
  onWarn: WarnFn;
}): string[] => {
  const normalized = normalizeOptionalConfigString(rawValue);
  if (!normalized) {
    return [];
  }

  const paths: string[] = [];
  for (const candidate of normalized.split(",")) {
    const trimmed = candidate.trim();
    if (!trimmed) {
      continue;
    }

    if (fs.existsSync(trimmed) && fs.statSync(trimmed).isDirectory()) {
      paths.push(trimmed);
      continue;
    }

    onWarn(`${label} path does not exist or is not a directory: ${trimmed}`);
  }

  return paths;
};

export const listExistingAbsoluteDirectoryPaths = ({
  rawValue,
  label,
  onWarn,
}: {
  rawValue: string | null | undefined;
  label: string;
  onWarn: WarnFn;
}): string[] => {
  const normalized = normalizeOptionalConfigString(rawValue);
  if (!normalized) {
    return [];
  }

  const seen = new Set<string>();
  const roots: string[] = [];
  for (const candidate of normalized.split(",")) {
    const trimmed = candidate.trim();
    if (!trimmed) {
      continue;
    }

    if (!path.isAbsolute(trimmed)) {
      onWarn(`${label} path must be absolute and will be ignored: ${trimmed}`);
      continue;
    }

    const resolved = path.resolve(trimmed);
    if (seen.has(resolved)) {
      continue;
    }

    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
      onWarn(`${label} path does not exist or is not a directory: ${resolved}`);
      continue;
    }

    seen.add(resolved);
    roots.push(resolved);
  }

  return roots;
};

export const parsePositiveNumberConfig = ({
  rawValue,
  envName,
  defaultValue,
}: {
  rawValue: string | null | undefined;
  envName: string;
  defaultValue: number;
}): number => {
  const normalized = normalizeOptionalConfigString(rawValue);
  if (!normalized) {
    return defaultValue;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${envName} must be a positive number.`);
  }

  return parsed;
};
