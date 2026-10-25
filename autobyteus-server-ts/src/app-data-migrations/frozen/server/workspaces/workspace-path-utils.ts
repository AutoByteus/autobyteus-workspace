import path from "node:path";

const trimTrailingSeparators = (value: string): string => {
  const parsedRoot = path.parse(value).root;
  if (value === parsedRoot) {
    return value;
  }
  return value.replace(/[\\/]+$/, "");
};

export const canonicalizeWorkspaceRootPath = (input: string): string => {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("workspaceRootPath cannot be empty.");
  }
  const normalized = path.normalize(path.resolve(trimmed));
  return trimTrailingSeparators(normalized);
};
