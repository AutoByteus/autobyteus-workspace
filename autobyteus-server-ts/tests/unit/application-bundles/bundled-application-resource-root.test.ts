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

  it("returns the nearest ancestor with an exact applications directory", async () => {
    const bundledRoot = path.join(tempRoot, "bundle");
    const serverRoot = path.join(bundledRoot, "server", "dist");

    await fs.mkdir(path.join(bundledRoot, "applications"), { recursive: true });
    await fs.mkdir(serverRoot, { recursive: true });

    expect(resolveBundledApplicationResourceRoot(serverRoot)).toBe(path.resolve(bundledRoot));
  });

  it("does not match a differently cased Applications directory", async () => {
    const packageRoot = path.join(tempRoot, "package-root");
    const serverRoot = path.join(packageRoot, "server", "dist");

    await fs.mkdir(path.join(packageRoot, "Applications"), { recursive: true });
    await fs.mkdir(serverRoot, { recursive: true });

    expect(resolveBundledApplicationResourceRoot(serverRoot)).toBe(path.resolve(serverRoot));
  });
});
