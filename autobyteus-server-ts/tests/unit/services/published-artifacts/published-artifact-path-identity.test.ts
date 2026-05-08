import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolvePublishedArtifactSourcePath } from "../../../../src/services/published-artifacts/published-artifact-path-identity.js";

const normalizePath = (filePath: string): string => filePath.replace(/\\/g, "/");

const resolveExpectedSourcePath = async (filePath: string): Promise<string> =>
  fs.realpath(filePath).catch(() => filePath);

describe("published-artifact path identity", () => {
  it("stores in-workspace absolute paths as absolute source artifact identities", async () => {
    const workspaceRoot = path.join(path.sep, "tmp", "workspace-root");
    const sourcePath = path.join(workspaceRoot, "brief-studio", "research.md");

    await expect(resolvePublishedArtifactSourcePath(sourcePath, workspaceRoot)).resolves.toEqual({
      ok: true,
      canonicalPath: normalizePath(sourcePath),
      sourceAbsolutePath: sourcePath,
    });
  });

  it("preserves outside-workspace absolute paths as canonical artifact paths", async () => {
    const workspaceRoot = path.join(path.sep, "tmp", "workspace-root");
    const sourcePath = path.join(path.sep, "tmp", "external", "research.md");

    await expect(resolvePublishedArtifactSourcePath(sourcePath, workspaceRoot)).resolves.toEqual({
      ok: true,
      canonicalPath: normalizePath(sourcePath),
      sourceAbsolutePath: sourcePath,
    });
  });

  it("preserves realpath-equivalent in-workspace absolute paths as absolute source identities", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "published-artifact-realpath-root-"));
    const realWorkspaceRoot = path.join(tempRoot, "real-workspace");
    const workspaceAliasRoot = path.join(tempRoot, "workspace-alias");
    try {
      await fs.mkdir(path.join(realWorkspaceRoot, "brief-studio"), { recursive: true });
      await fs.symlink(realWorkspaceRoot, workspaceAliasRoot, "dir");
      const sourcePath = path.join(realWorkspaceRoot, "brief-studio", "research.md");
      await fs.writeFile(sourcePath, "realpath equivalent workspace", "utf-8");
      const expectedSourcePath = await resolveExpectedSourcePath(sourcePath);

      await expect(resolvePublishedArtifactSourcePath(sourcePath, workspaceAliasRoot)).resolves.toEqual({
        ok: true,
        canonicalPath: normalizePath(expectedSourcePath),
        sourceAbsolutePath: expectedSourcePath,
      });
    } finally {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("resolves workspace-relative artifact inputs to absolute source artifact identities", async () => {
    const workspaceRoot = path.join(path.sep, "tmp", "workspace-root");
    const expectedPath = path.join(workspaceRoot, "brief-studio", "research.md");

    await expect(resolvePublishedArtifactSourcePath("brief-studio/research.md", workspaceRoot)).resolves.toEqual({
      ok: true,
      canonicalPath: normalizePath(expectedPath),
      sourceAbsolutePath: expectedPath,
    });
  });

  it("resolves workspace-relative symlink escapes to the target absolute source identity", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "published-artifact-symlink-root-"));
    const workspaceRoot = path.join(tempRoot, "workspace");
    const outsideRoot = path.join(tempRoot, "outside");
    try {
      await fs.mkdir(workspaceRoot, { recursive: true });
      await fs.mkdir(outsideRoot, { recursive: true });
      await fs.symlink(outsideRoot, path.join(workspaceRoot, "escape"), "dir");
      const outsideFilePath = path.join(outsideRoot, "secret.txt");
      await fs.writeFile(outsideFilePath, "outside target", "utf-8");
      const expectedSourcePath = await resolveExpectedSourcePath(outsideFilePath);

      await expect(resolvePublishedArtifactSourcePath("escape/secret.txt", workspaceRoot)).resolves.toEqual({
        ok: true,
        canonicalPath: normalizePath(expectedSourcePath),
        sourceAbsolutePath: expectedSourcePath,
      });
    } finally {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("requires a workspace root for relative artifact paths", async () => {
    await expect(resolvePublishedArtifactSourcePath("brief-studio/research.md", null)).resolves.toEqual({
      ok: false,
      code: "RELATIVE_PATH_REQUIRES_WORKSPACE_ROOT",
      message: "Published artifact relative paths require a workspace root.",
    });
  });
});
