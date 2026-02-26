import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { downloadFileFromUrl } from "../../../src/utils/download-utils.js";

const LIVE_TEST_URL = process.env.AUTOBYTEUS_DOWNLOAD_TEST_URL;

const runTest = LIVE_TEST_URL ? it : it.skip;

describe("downloadFileFromUrl (live)", () => {
  runTest("downloads a real file from a live URL", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "download-utils-live-"));

    try {
      const downloadedPath = await downloadFileFromUrl(LIVE_TEST_URL!, tempDir);
      expect(fs.existsSync(downloadedPath)).toBe(true);
      expect(fs.statSync(downloadedPath).size).toBeGreaterThan(0);
      expect(path.extname(downloadedPath)).not.toBe("");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        message.includes("fetch failed") ||
        message.includes("ECONNREFUSED") ||
        message.includes("ENOTFOUND")
      ) {
        return;
      }
      throw error;
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
