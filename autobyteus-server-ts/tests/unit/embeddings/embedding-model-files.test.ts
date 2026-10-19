import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { EmbeddingDownloadCancelled, EmbeddingModelFiles } from "../../../src/embeddings/models/embedding-model-files.js";
import { fakeModel } from "../../helpers/fake-embedding-model.js";

const content = { "onnx/model.onnx": "graph-bytes", "onnx/model.onnx_data": "weights".repeat(1000), "tokenizer.json": "{}" } as Record<string, string>;
const fileOf = (filePath: string) => ({ path: filePath, sha256: createHash("sha256").update(content[filePath]!).digest("hex"), bytes: Buffer.byteLength(content[filePath]!) });
const model = fakeModel("tiny", {
  source: { repo: "org/tiny", revision: "abc123" },
  files: Object.keys(content).map(fileOf),
  onnxFile: "onnx/model.onnx",
});

describe("EmbeddingModelFiles", () => {
  let root: string, server: http.Server, baseUrl: string;
  const requests: string[] = [];
  let serve: (url: string) => string | null = (url) => content[url.replace("/org/tiny/resolve/abc123/", "")] ?? null;
  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "embedding-files-"));
    requests.length = 0;
    serve = (url) => content[url.replace("/org/tiny/resolve/abc123/", "")] ?? null;
    server = http.createServer((request, response) => {
      requests.push(request.url!);
      const body = serve(request.url!);
      if (body === null) { response.statusCode = 404; response.end(); return; }
      response.end(body);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterEach(async () => {
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(root, { recursive: true, force: true });
  });

  it("downloads every file from the pinned revision, verifies it, reports byte progress, and reuses verified files", async () => {
    const files = new EmbeddingModelFiles(root, { baseUrl });
    const progress: Array<[number, number]> = [];
    const dir = await files.ensure(model, (done, total) => progress.push([done, total]));
    expect(dir).toBe(path.join(root, "tiny"));
    expect(await fs.readFile(path.join(dir, "onnx/model.onnx_data"), "utf8")).toBe(content["onnx/model.onnx_data"]);
    expect(requests).toEqual(Object.keys(content).map((file) => `/org/tiny/resolve/abc123/${file}`));
    const total = model.files.reduce((sum, file) => sum + file.bytes, 0);
    expect(progress.at(-1)).toEqual([total, total]);
    // Files already present are verified silently: no download progress (the index reports "loading" meanwhile).
    const again: Array<[number, number]> = [];
    await files.ensure(model, (done, all) => again.push([done, all]));
    expect(requests).toHaveLength(3);
    expect(again).toEqual([]);
  });

  it("tells whether every file is present with its pinned size", async () => {
    const files = new EmbeddingModelFiles(root, { baseUrl });
    expect(files.hasAllFiles(model)).toBe(false);
    await files.ensure(model);
    expect(files.hasAllFiles(model)).toBe(true);
    await fs.writeFile(path.join(root, "tiny", "tokenizer.json"), "{ }");
    expect(files.hasAllFiles(model)).toBe(false);
  });

  it("rejects a file whose checksum differs and leaves no partial file", async () => {
    serve = (url) => url.endsWith("tokenizer.json") ? "{\"tampered\":true}" : content[url.replace("/org/tiny/resolve/abc123/", "")] ?? null;
    const files = new EmbeddingModelFiles(root, { baseUrl });
    await expect(files.ensure(model)).rejects.toThrow("does not match the expected file");
    expect((await fs.readdir(path.join(root, "tiny"))).filter((name) => name.endsWith(".part"))).toEqual([]);
  });

  it("re-downloads a damaged local file", async () => {
    const files = new EmbeddingModelFiles(root, { baseUrl });
    await files.ensure(model);
    await fs.writeFile(path.join(root, "tiny", "tokenizer.json"), "broken");
    await files.ensure(model);
    expect(await fs.readFile(path.join(root, "tiny", "tokenizer.json"), "utf8")).toBe("{}");
    expect(requests.filter((url) => url.endsWith("tokenizer.json"))).toHaveLength(2);
  });

  it("names the host when the download fails", async () => {
    serve = () => null;
    await expect(new EmbeddingModelFiles(root, { baseUrl }).ensure(model)).rejects.toThrow(`from 127.0.0.1:${new URL(baseUrl).port} failed (HTTP 404)`);
    await expect(new EmbeddingModelFiles(root, { baseUrl: "http://127.0.0.1:1" }).ensure(model)).rejects.toThrow("Could not reach 127.0.0.1:1");
  });

  it("runs one download per model at a time", async () => {
    const files = new EmbeddingModelFiles(root, { baseUrl });
    await Promise.all([files.ensure(model), files.ensure(model)]);
    expect(requests).toHaveLength(3);
  });

  it("keeps other models' folders, removes one model's folder on request, and sums the bytes on disk", async () => {
    const files = new EmbeddingModelFiles(root, { baseUrl });
    expect(await files.diskUsage()).toBe(0);
    await files.ensure(model);
    await fs.mkdir(path.join(root, "other-model", "onnx"), { recursive: true });
    await fs.writeFile(path.join(root, "other-model", "onnx", "model.onnx.part"), "12345");
    const total = model.files.reduce((sum, file) => sum + file.bytes, 0);
    expect(await files.diskUsage()).toBe(total + 5);
    await files.remove({ id: "other-model" });
    expect(await fs.readdir(root)).toEqual(["tiny"]);
    await files.remove({ id: "never-downloaded" });
    expect(await files.diskUsage()).toBe(total);
  });

  it("stops a download when its signal aborts: rejects as cancelled and moves no partial file into place", async () => {
    const files = new EmbeddingModelFiles(root, { baseUrl });
    const controller = new AbortController();
    await expect(files.ensure(model, () => controller.abort(), controller.signal)).rejects.toBeInstanceOf(EmbeddingDownloadCancelled);
    expect(files.hasAllFiles(model)).toBe(false);
    const left = await fs.readdir(path.join(root, "tiny"), { recursive: true }).catch(() => [] as string[]);
    expect(left.filter((name) => name.endsWith(".part") || name === "onnx/model.onnx")).toEqual([]);
    await expect(files.ensure(model, () => undefined, AbortSignal.abort())).rejects.toBeInstanceOf(EmbeddingDownloadCancelled);
  });
});
