import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { MediaStorageService } from "../../../src/services/media-storage-service.js";

const downloadFileFromUrlMock = vi.hoisted(() => vi.fn());

vi.mock("../../../src/utils/download-utils.js", () => ({
  downloadFileFromUrl: downloadFileFromUrlMock,
}));

const createTempRoot = () => fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-media-"));

describe("MediaStorageService", () => {
  let tempRoot: string;
  let service: MediaStorageService;

  beforeEach(() => {
    tempRoot = createTempRoot();
    downloadFileFromUrlMock.mockReset();
    const config = {
      getAppDataDir: () => tempRoot,
      getBaseUrl: () => "http://unittest.server:8000",
    };
    service = new MediaStorageService(config);
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it("stores media from a remote URL", async () => {
    const destinationDir = path.join(tempRoot, "media", "images");
    const downloadedPath = path.join(destinationDir, "remote_image.png");
    fs.mkdirSync(destinationDir, { recursive: true });
    fs.writeFileSync(downloadedPath, "content", "utf-8");

    downloadFileFromUrlMock.mockResolvedValue(downloadedPath);

    const url = await service.storeMediaAndGetUrl(
      "https://example.com/remote_image.png",
      "downloaded",
    );

    expect(downloadFileFromUrlMock).toHaveBeenCalledWith(
      "https://example.com/remote_image.png",
      destinationDir,
    );
    expect(url).toBe("http://unittest.server:8000/rest/files/images/downloaded.png");
  });

  it("stores media from a data URI", async () => {
    const dataUri = "data:image/png;base64,SGVsbG8sIFdvcmxkIQ=="; // "Hello, World!"

    const url = await service.storeMediaAndGetUrl(dataUri, "hello");

    expect(url).toMatch(/\/rest\/files\/images\/hello\.png$/);

    const filename = url.split("/").pop() as string;
    const expectedPath = path.join(tempRoot, "media", "images", filename);
    const contents = fs.readFileSync(expectedPath, "utf-8");

    expect(contents).toBe("Hello, World!");
  });

  it("stores media from a local file path", async () => {
    const localPath = path.join(tempRoot, "local_file.jpg");
    fs.writeFileSync(localPath, "local content", "utf-8");

    const url = await service.storeMediaAndGetUrl(localPath, "local_file");

    expect(url).toMatch(/\/rest\/files\/images\/local_file\.jpg$/);

    const filename = url.split("/").pop() as string;
    const expectedPath = path.join(tempRoot, "media", "images", filename);
    const contents = fs.readFileSync(expectedPath, "utf-8");

    expect(contents).toBe("local content");
  });

  it("throws for unsupported sources", async () => {
    await expect(service.storeMediaAndGetUrl("ftp://example.com/file.txt", "file")).rejects.toThrow(
      "Unsupported media source",
    );
  });
});
