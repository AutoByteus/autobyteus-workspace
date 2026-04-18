import fs from "node:fs";
import path from "node:path";

const hasApplicationsDir = (candidateRoot: string): boolean => {
  try {
    const entries = fs.readdirSync(candidateRoot, { withFileTypes: true });
    return entries.some((entry) => entry.isDirectory() && entry.name === "applications");
  } catch {
    return false;
  }
};

export const resolveBundledApplicationResourceRoot = (
  serverAppRootDir: string,
): string => {
  let current = path.resolve(serverAppRootDir);

  while (true) {
    if (hasApplicationsDir(current)) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return path.resolve(serverAppRootDir);
    }
    current = parent;
  }
};
