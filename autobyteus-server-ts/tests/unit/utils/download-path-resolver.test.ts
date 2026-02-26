import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getDownloadsDir } from "../../../src/utils/download-path-resolver.js";

describe("getDownloadsDir", () => {
  it("returns an existing Downloads directory path", () => {
    const downloadsDir = getDownloadsDir();
    expect(downloadsDir).toBeTruthy();
    expect(fs.existsSync(downloadsDir)).toBe(true);

    const expectedBase =
      process.platform === "win32"
        ? path.join(process.env.USERPROFILE ?? os.homedir(), "Downloads")
        : path.join(os.homedir(), "Downloads");

    expect(path.normalize(downloadsDir)).toBe(path.normalize(expectedBase));
  });
});
