/** autobyteus-285 D1: the server's release version from the build stamp; anything else reads as no version. */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readReleaseIdentityFrom } from "../../../src/restart-resume/release-identity.js";

let dir: string;
beforeEach(async () => { dir = await fs.mkdtemp(path.join(os.tmpdir(), "release-identity-")); vi.spyOn(console, "warn").mockImplementation(() => undefined); });
afterEach(async () => { vi.restoreAllMocks(); await fs.rm(dir, { recursive: true, force: true }); });

describe("readReleaseIdentityFrom", () => {
  it("reads the stamped version", async () => {
    await fs.writeFile(path.join(dir, "release-identity.json"), JSON.stringify({ version: " 1.5.11-beta.10 " }));
    expect(readReleaseIdentityFrom(path.join(dir, "release-identity.json"))).toBe("1.5.11-beta.10");
  });

  it("returns null without a stamp (a server run from src), quietly", () => {
    expect(readReleaseIdentityFrom(path.join(dir, "missing.json"))).toBeNull();
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("returns null and logs for a stamp that is not JSON or has no version", async () => {
    await fs.writeFile(path.join(dir, "broken.json"), "{ not json");
    await fs.writeFile(path.join(dir, "empty.json"), JSON.stringify({ version: "" }));
    expect(readReleaseIdentityFrom(path.join(dir, "broken.json"))).toBeNull();
    expect(readReleaseIdentityFrom(path.join(dir, "empty.json"))).toBeNull();
    expect(console.warn).toHaveBeenCalledTimes(2);
  });
});
