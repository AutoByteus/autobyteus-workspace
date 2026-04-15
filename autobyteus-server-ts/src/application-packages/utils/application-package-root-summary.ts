import fs from "node:fs";
import path from "node:path";
import type { ApplicationPackageSummary } from "../types.js";

const countDefinitionsInDir = (directoryPath: string, fileName: string): number => {
  if (!fs.existsSync(directoryPath)) {
    return 0;
  }

  let entries: fs.Dirent[] = [];
  try {
    entries = fs.readdirSync(directoryPath, { withFileTypes: true });
  } catch {
    return 0;
  }

  let count = 0;
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith("_")) {
      continue;
    }
    if (fs.existsSync(path.join(directoryPath, entry.name, fileName))) {
      count += 1;
    }
  }
  return count;
};

export const validateApplicationPackageRoot = (packageRoot: string): string => {
  if (!path.isAbsolute(packageRoot)) {
    throw new Error("Application package path must be absolute.");
  }

  const resolved = path.resolve(packageRoot);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Application package directory not found: ${resolved}`);
  }
  if (!fs.statSync(resolved).isDirectory()) {
    throw new Error(`Application package path is not a directory: ${resolved}`);
  }

  const applicationsDir = path.join(resolved, "applications");
  const hasApplications =
    fs.existsSync(applicationsDir) && fs.statSync(applicationsDir).isDirectory();

  if (!hasApplications) {
    throw new Error(
      "Application package must contain an 'applications' directory.",
    );
  }

  return resolved;
};

export const buildApplicationPackageSummary = (
  packageRoot: string,
): ApplicationPackageSummary => ({
  applicationCount: countDefinitionsInDir(path.join(path.resolve(packageRoot), "applications"), "application.json"),
});

export const buildLocalApplicationPackageId = (rootPath: string): string =>
  `application-local:${encodeURIComponent(path.resolve(rootPath))}`;

export const buildGitHubApplicationPackageId = (normalizedRepository: string): string =>
  `application-github:${normalizedRepository.toLowerCase()}`;
