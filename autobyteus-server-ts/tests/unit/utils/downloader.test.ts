import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { downloadWithProgress } from "../../../src/utils/downloader.js";

const encoder = new TextEncoder();

function createStream(chunks: string[]): ReadableStream<Uint8Array> {
  const data = chunks.map((chunk) => encoder.encode(chunk));
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of data) {
        controller.enqueue(chunk);
      }
      controller.close();
    },
  });
}

describe("downloadWithProgress", () => {
  const mockFetch = vi.fn();
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "download-progress-"));
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("downloads content to the target path", async () => {
    const body = createStream(["hello", "world"]);
    mockFetch.mockResolvedValue(
      new Response(body, {
        status: 200,
        headers: { "content-length": "10" },
      }),
    );

    const filePath = path.join(tempDir, "out.txt");
    await downloadWithProgress("https://mock.test.com/file.txt", filePath, "Downloading");

    expect(fs.readFileSync(filePath, "utf-8")).toBe("helloworld");
  });

  it("throws on HTTP errors", async () => {
    mockFetch.mockResolvedValue(
      new Response("not found", {
        status: 404,
        statusText: "Not Found",
      }),
    );

    const filePath = path.join(tempDir, "out.txt");
    await expect(
      downloadWithProgress("https://mock.test.com/file.txt", filePath, "Downloading"),
    ).rejects.toThrow("HTTP 404");
  });

  it("throws when response body is empty", async () => {
    mockFetch.mockResolvedValue(
      new Response(null, {
        status: 200,
      }),
    );

    const filePath = path.join(tempDir, "out.txt");
    await expect(
      downloadWithProgress("https://mock.test.com/file.txt", filePath, "Downloading"),
    ).rejects.toThrow("Response body is empty");
  });
});
