import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const workspacePackageMapCache = new Map();

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function parseWorkspacePatterns(workspaceManifestRaw) {
  return workspaceManifestRaw
    .split(/\r?\n/u)
    .map((line) => line.match(/^\s*-\s*["']?([^"']+)["']?\s*$/u)?.[1]?.trim() ?? null)
    .filter((value) => Boolean(value));
}

function segmentPatternToRegExp(segmentPattern) {
  const escaped = segmentPattern.replace(/[|\\{}()[\]^$+?.]/gu, "\\$&");
  return new RegExp(`^${escaped.replace(/\*/gu, ".*")}$`, "u");
}

async function expandWorkspacePattern(rootPath, workspacePattern) {
  const normalizedPattern = workspacePattern.trim().replace(/^\.\/+/u, "");
  const segments = normalizedPattern.split("/").filter(Boolean);
  const matches = [];

  async function walk(currentPath, segmentIndex) {
    if (segmentIndex >= segments.length) {
      matches.push(currentPath);
      return;
    }

    const segment = segments[segmentIndex];
    if (!segment.includes("*")) {
      const nextPath = path.join(currentPath, segment);
      if (await exists(nextPath)) {
        await walk(nextPath, segmentIndex + 1);
      }
      return;
    }

    const matcher = segmentPatternToRegExp(segment);
    const entries = await readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      if (!matcher.test(entry.name)) {
        continue;
      }
      await walk(path.join(currentPath, entry.name), segmentIndex + 1);
    }
  }

  await walk(rootPath, 0);
  return matches;
}

export async function buildWorkspacePackageRootMap(workspaceRoot) {
  const normalizedWorkspaceRoot = path.resolve(workspaceRoot);
  const cached = workspacePackageMapCache.get(normalizedWorkspaceRoot);
  if (cached) {
    return cached;
  }

  const workspaceManifestPath = path.join(normalizedWorkspaceRoot, "pnpm-workspace.yaml");
  const workspaceManifestRaw = await readFile(workspaceManifestPath, "utf8");
  const workspacePatterns = parseWorkspacePatterns(workspaceManifestRaw);
  const packageRootMap = new Map();

  for (const workspacePattern of workspacePatterns) {
    const candidateRoots = await expandWorkspacePattern(normalizedWorkspaceRoot, workspacePattern);
    for (const candidateRoot of candidateRoots) {
      const manifestPath = path.join(candidateRoot, "package.json");
      if (!(await exists(manifestPath))) {
        continue;
      }

      const manifestRaw = await readFile(manifestPath, "utf8");
      const manifest = JSON.parse(manifestRaw);
      const packageName = typeof manifest.name === "string" ? manifest.name.trim() : "";
      if (!packageName) {
        continue;
      }

      const existingRoot = packageRootMap.get(packageName);
      if (existingRoot && existingRoot !== candidateRoot) {
        throw new Error(
          `Duplicate workspace package name '${packageName}' found at '${existingRoot}' and '${candidateRoot}'.`,
        );
      }
      packageRootMap.set(packageName, candidateRoot);
    }
  }

  workspacePackageMapCache.set(normalizedWorkspaceRoot, packageRootMap);
  return packageRootMap;
}

export async function resolveWorkspacePackageRoot(workspaceRoot, packageName) {
  const packageRootMap = await buildWorkspacePackageRootMap(workspaceRoot);
  return packageRootMap.get(packageName) ?? null;
}

export function clearWorkspacePackageRootMapCache() {
  workspacePackageMapCache.clear();
}
