import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { downloadFileFromUrl } from "../../../src/utils/download-utils.js";

const encoder = new TextEncoder();

function createStream(content: string): ReadableStream<Uint8Array> {
  const data = encoder.encode(content);
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(data);
      controller.close();
    },
  });
}

describe("downloadFileFromUrl", () => {
  const mockFetch = vi.fn();
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "download-utils-"));
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("uses Content-Type to determine file extension", async () => {
    const body = createStream("mock file content");
    mockFetch.mockResolvedValue(
      new Response(body, {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      }),
    );

    const filePath = await downloadFileFromUrl(
      "https://mock.test.com/media/images/test.jpg",
      tempDir,
    );

    expect(path.extname(filePath)).toBe(".jpg");
    expect(fs.readFileSync(filePath, "utf-8")).toBe("mock file content");
  });

  it("falls back to URL extension when Content-Type is missing", async () => {
    const body = createStream("mock file content");
    mockFetch.mockResolvedValue(
      new Response(body, {
        status: 200,
      }),
    );

    const filePath = await downloadFileFromUrl(
      "https://mock.test.com/media/images/test.jpg",
      tempDir,
    );

    expect(path.extname(filePath)).toBe(".jpg");
  });

  it("throws and leaves no file on HTTP errors", async () => {
    mockFetch.mockResolvedValue(
      new Response("not found", {
        status: 404,
        statusText: "Not Found",
      }),
    );

    await expect(
      downloadFileFromUrl("https://mock.test.com/media/images/test.jpg", tempDir),
    ).rejects.toThrow("HTTP 404");

    const files = fs.readdirSync(tempDir);
    expect(files).toHaveLength(0);
  });
});
