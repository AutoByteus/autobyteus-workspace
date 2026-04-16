import fs from "node:fs";
import path from "node:path";

const hasApplicationsDir = (candidateRoot: string): boolean => {
  const applicationsDir = path.join(candidateRoot, "applications");
  return fs.existsSync(applicationsDir) && fs.statSync(applicationsDir).isDirectory();
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
