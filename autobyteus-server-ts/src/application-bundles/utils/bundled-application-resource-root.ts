import fs from "node:fs";
import path from "node:path";

const hasBundledApplicationPackageRoot = (candidateRoot: string): boolean => {
  try {
    const applicationsDir = path.join(candidateRoot, "application-packages", "platform", "applications");
    return fs.statSync(applicationsDir).isDirectory();
  } catch {
    return false;
  }
};

export const resolveBundledApplicationResourceRoot = (
  serverAppRootDir: string,
): string => {
  let current = path.resolve(serverAppRootDir);

  while (true) {
    if (hasBundledApplicationPackageRoot(current)) {
      return path.join(current, "application-packages", "platform");
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return path.resolve(serverAppRootDir);
    }
    current = parent;
  }
};
