import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import fastify from "fastify";
import multipart from "@fastify/multipart";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mediaState = {
  root: "",
  documentsDir: "",
  imagesDir: "",
  audioDir: "",
  videoDir: "",
  othersDir: "",
};

const mockMediaStorageService = vi.hoisted(() => {
  const ensureDir = (dirPath: string): void => {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  };

  const service = {
    __setRoot: (rootPath: string): void => {
      mediaState.root = rootPath;
      mediaState.documentsDir = path.join(rootPath, "documents");
      mediaState.imagesDir = path.join(rootPath, "images");
      mediaState.audioDir = path.join(rootPath, "audio");
      mediaState.videoDir = path.join(rootPath, "video");
      mediaState.othersDir = path.join(rootPath, "others");
      ensureDir(mediaState.documentsDir);
      ensureDir(mediaState.imagesDir);
      ensureDir(mediaState.audioDir);
      ensureDir(mediaState.videoDir);
      ensureDir(mediaState.othersDir);
    },
    getMediaRoot: (): string => mediaState.root,
    getStorageDirByCategory: (category: string): string => {
      if (category === "images") {
        return mediaState.imagesDir;
      }
      if (category === "video") {
        return mediaState.videoDir;
      }
      if (category === "audio") {
        return mediaState.audioDir;
      }
      if (category === "documents" || category === "texts") {
        return mediaState.documentsDir;
      }
      return mediaState.othersDir;
    },
  };

  return service;
});

vi.mock("../../../../src/services/media-storage-service.js", () => ({
  getMediaStorageService: () => mockMediaStorageService,
}));

vi.mock("../../../../src/config/app-config-provider.js", () => ({
  appConfigProvider: {
    config: {
      getBaseUrl: (): string => "http://localhost:8000",
      getAppDataDir: (): string => mediaState.root,
    },
  },
}));

import { registerUploadRoutes } from "../../../../src/api/rest/upload-file.js";
import { registerFileRoutes } from "../../../../src/api/rest/files.js";

const buildMultipartPayload = (options: {
  fieldName: string;
  filename: string;
  contentType: string;
  content: string | Buffer;
}): { boundary: string; payload: Buffer } => {
  const boundary = "----autobyteus-upload-boundary";
  const header = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name=\"${options.fieldName}\"; filename=\"${options.filename}\"\r\n` +
      `Content-Type: ${options.contentType}\r\n\r\n`,
    "utf8",
  );
  const contentBuffer = Buffer.isBuffer(options.content)
    ? options.content
    : Buffer.from(options.content, "utf8");
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`, "utf8");
  return { boundary, payload: Buffer.concat([header, contentBuffer, footer]) };
};

describe("REST upload-file route", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-upload-"));
    mockMediaStorageService.__setRoot(path.join(tempDir, "media"));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("uploads a file and serves it from /rest/files", async () => {
    const app = fastify();
    await app.register(multipart);
    await app.register(
      async (instance) => {
        await registerUploadRoutes(instance);
        await registerFileRoutes(instance);
      },
      { prefix: "/rest" },
    );

    const { boundary, payload } = buildMultipartPayload({
      fieldName: "file",
      filename: "test.txt",
      contentType: "text/plain",
      content: "Hello, world",
    });

    const uploadResponse = await app.inject({
      method: "POST",
      url: "/rest/upload-file",
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload,
    });

    expect(uploadResponse.statusCode).toBe(200);
    const uploadJson = uploadResponse.json() as { fileUrl: string };
    expect(uploadJson.fileUrl).toContain("/rest/files/");

    const filePath = new URL(uploadJson.fileUrl).pathname;
    const fileResponse = await app.inject({
      method: "GET",
      url: filePath,
    });

    expect(fileResponse.statusCode).toBe(200);
    expect(fileResponse.payload).toBe("Hello, world");

    await app.close();
  });

  it("uploads a dummy PNG image and stores it under /images", async () => {
    const app = fastify();
    await app.register(multipart);
    await app.register(
      async (instance) => {
        await registerUploadRoutes(instance);
        await registerFileRoutes(instance);
      },
      { prefix: "/rest" },
    );

    // 1x1 PNG
    const onePixelPng = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Yt9sAAAAASUVORK5CYII=",
      "base64",
    );
    const { boundary, payload } = buildMultipartPayload({
      fieldName: "file",
      filename: "avatar.png",
      contentType: "image/png",
      content: onePixelPng,
    });

    const uploadResponse = await app.inject({
      method: "POST",
      url: "/rest/upload-file",
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload,
    });

    expect(uploadResponse.statusCode).toBe(200);
    const uploadJson = uploadResponse.json() as { fileUrl: string };
    expect(uploadJson.fileUrl).toContain("/rest/files/images/");
    expect(uploadJson.fileUrl.endsWith(".png")).toBe(true);

    const imagePath = new URL(uploadJson.fileUrl).pathname;
    const fileResponse = await app.inject({
      method: "GET",
      url: imagePath,
    });

    expect(fileResponse.statusCode).toBe(200);
    expect(fileResponse.headers["content-type"]).toContain("image/png");
    expect(fileResponse.rawPayload.length).toBeGreaterThan(0);

    await app.close();
  });

  it("rejects unsupported file types", async () => {
    const app = fastify();
    await app.register(multipart);
    await app.register(
      async (instance) => {
        await registerUploadRoutes(instance);
      },
      { prefix: "/rest" },
    );

    const { boundary, payload } = buildMultipartPayload({
      fieldName: "file",
      filename: "archive.zip",
      contentType: "application/zip",
      content: "PK\u0003\u0004",
    });

    const response = await app.inject({
      method: "POST",
      url: "/rest/upload-file",
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      detail: "Unsupported file type: application/zip",
    });

    await app.close();
  });

  it("returns 400 when no file is provided", async () => {
    const app = fastify();
    await app.register(multipart);
    await app.register(
      async (instance) => {
        await registerUploadRoutes(instance);
      },
      { prefix: "/rest" },
    );

    const response = await app.inject({
      method: "POST",
      url: "/rest/upload-file",
      headers: {
        "content-type": "multipart/form-data; boundary=empty",
      },
      payload: "--empty--\r\n",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ detail: "No file uploaded." });

    await app.close();
  });

  it("returns 413 and does not persist truncated files when upload exceeds file size limit", async () => {
    const app = fastify();
    await app.register(multipart, {
      limits: {
        fileSize: 1024,
      },
      throwFileSizeLimit: false,
    });
    await app.register(
      async (instance) => {
        await registerUploadRoutes(instance);
      },
      { prefix: "/rest" },
    );

    const oversizedPngPayload = Buffer.alloc(4096, 0x89);
    const { boundary, payload } = buildMultipartPayload({
      fieldName: "file",
      filename: "oversized-avatar.png",
      contentType: "image/png",
      content: oversizedPngPayload,
    });

    const response = await app.inject({
      method: "POST",
      url: "/rest/upload-file",
      headers: {
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
      payload,
    });

    expect(response.statusCode).toBe(413);
    expect(response.json()).toEqual({
      detail: "Uploaded file is too large.",
    });

    expect(fs.readdirSync(mediaState.imagesDir)).toHaveLength(0);

    await app.close();
  });
});
