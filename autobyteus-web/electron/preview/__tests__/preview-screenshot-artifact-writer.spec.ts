import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { PreviewScreenshotArtifactWriter } from "../preview-screenshot-artifact-writer";

const tempDirs: string[] = [];

describe("PreviewScreenshotArtifactWriter", () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs.splice(0).map(async (tempDir) => {
        await fs.rm(tempDir, { recursive: true, force: true });
      }),
    );
  });

  it("writes PNG buffers into the configured artifact directory", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "preview-artifacts-"));
    tempDirs.push(tempDir);

    const writer = new PreviewScreenshotArtifactWriter(tempDir);
    const filePath = await writer.write(Buffer.from("png-bytes"), "session-123");

    expect(path.dirname(filePath)).toBe(tempDir);
    expect(path.basename(filePath)).toMatch(/^session-123-\d+\.png$/);
    await expect(fs.readFile(filePath)).resolves.toEqual(Buffer.from("png-bytes"));
  });
});
