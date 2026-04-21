import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveBundledApplicationResourceRoot } from "../../../src/application-bundles/utils/bundled-application-resource-root.js";

describe("resolveBundledApplicationResourceRoot", () => {
  let tempRoot: string;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "bundled-app-root-"));
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it("returns the nearest ancestor with a bundled application-packages/platform/applications directory", async () => {
    const packageRoot = path.join(tempRoot, "bundle");
    const bundledPlatformRoot = path.join(packageRoot, "application-packages", "platform");
    const serverRoot = path.join(packageRoot, "server", "dist");

    await fs.mkdir(path.join(bundledPlatformRoot, "applications"), { recursive: true });
    await fs.mkdir(serverRoot, { recursive: true });

    expect(resolveBundledApplicationResourceRoot(serverRoot)).toBe(path.resolve(bundledPlatformRoot));
  });

  it("prefers the bundled platform applications root instead of a repo-level applications directory", async () => {
    const repoRoot = path.join(tempRoot, "repo-root");
    const serverRoot = path.join(repoRoot, "autobyteus-server-ts", "dist");
    const bundledPlatformRoot = path.join(repoRoot, "autobyteus-server-ts", "application-packages", "platform");

    await fs.mkdir(path.join(repoRoot, "applications"), { recursive: true });
    await fs.mkdir(path.join(bundledPlatformRoot, "applications"), { recursive: true });
    await fs.mkdir(serverRoot, { recursive: true });

    expect(resolveBundledApplicationResourceRoot(serverRoot)).toBe(path.resolve(bundledPlatformRoot));
  });

  it("falls back to the provided server root when no bundled platform applications root exists", async () => {
    const packageRoot = path.join(tempRoot, "package-root");
    const serverRoot = path.join(packageRoot, "server", "dist");

    await fs.mkdir(path.join(packageRoot, "Applications"), { recursive: true });
    await fs.mkdir(serverRoot, { recursive: true });

    expect(resolveBundledApplicationResourceRoot(serverRoot)).toBe(path.resolve(serverRoot));
  });
});
