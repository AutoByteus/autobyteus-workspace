import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sendUserFile } from "../../../../src/api/rest/user-file-reply.js";

// autobyteus-574 D-1 (REQ-005, AC-005): a user file is served by byte range with its version as a strong ETag, and every
// client revalidates before reusing a copy. A player streams and seeks by range; a cache keeps an unchanged version and
// is never shown an old one. Production: sendUserFile, through a real Fastify route over a real file.
describe("sendUserFile ranges, versions and freshness", () => {
  let app: FastifyInstance;
  let root: string;
  let file: string;
  const bytes = Buffer.from(Array.from({ length: 1000 }, (_, index) => index % 256));

  const etagOf = () => {
    const stat = fs.statSync(file);
    return `"${stat.size}-${Math.floor(stat.mtimeMs)}"`;
  };
  const get = (headers: Record<string, string> = {}, url = "/file") => app.inject({ method: "GET", url, headers });

  beforeAll(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "user-file-ranges-"));
    file = path.join(root, "clip.mp4");
    fs.writeFileSync(file, bytes);
    app = fastify();
    const content = () => {
      const stat = fs.statSync(file);
      return { kind: "file" as const, mimeType: "video/mp4", path: file, size: stat.size, modifiedMs: stat.mtimeMs };
    };
    app.get("/file", async (request, reply) => sendUserFile(reply, content(), request));
    app.get("/no-store", async (request, reply) => {
      reply.header("cache-control", "no-store");
      return sendUserFile(reply, content(), request);
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("without Range: 200, the whole file, Accept-Ranges, a strong ETag, no-cache and no Last-Modified", async () => {
    const response = await get();
    expect(response.statusCode).toBe(200);
    expect(response.rawPayload.equals(bytes)).toBe(true);
    expect(response.headers["content-length"]).toBe("1000");
    expect(response.headers["accept-ranges"]).toBe("bytes");
    expect(response.headers.etag).toBe(etagOf());
    expect(response.headers["cache-control"]).toBe("no-cache");
    expect(response.headers["last-modified"]).toBeUndefined();
    expect(response.headers["content-security-policy"]).toBe("sandbox allow-scripts");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
  });

  it.each([
    ["bytes=100-199", 100, 199],
    ["bytes=900-", 900, 999],
    ["bytes=-50", 950, 999],
    ["bytes=990-5000", 990, 999],
    ["bytes=0-0", 0, 0],
  ])("Range %s: 206 with exactly bytes %i-%i", async (range, start, end) => {
    const response = await get({ range });
    expect(response.statusCode).toBe(206);
    expect(response.headers["content-range"]).toBe(`bytes ${start}-${end}/1000`);
    expect(response.headers["content-length"]).toBe(String(end - start + 1));
    expect(response.rawPayload.equals(bytes.subarray(start, end + 1))).toBe(true);
    expect(response.headers["accept-ranges"]).toBe("bytes");
    expect(response.headers.etag).toBe(etagOf());
    expect(response.headers["cache-control"]).toBe("no-cache");
  });

  it.each(["bytes=1000-", "bytes=5000-6000", "bytes=-0"])("an unsatisfiable Range %s: 416 with the size", async (range) => {
    const response = await get({ range });
    expect(response.statusCode).toBe(416);
    expect(response.headers["content-range"]).toBe("bytes */1000");
    expect(response.rawPayload.length).toBe(0);
  });

  it.each(["bytes=0-9,20-29", "items=0-9", "bytes=9-0", "bytes=abc"])(
    "a multi-range or malformed Range %s: 200 with the whole file", async (range) => {
      const response = await get({ range });
      expect(response.statusCode).toBe(200);
      expect(response.rawPayload.equals(bytes)).toBe(true);
    });

  it("If-None-Match with the current version: 304, no body; with another version or a list without it: the file", async () => {
    const current = etagOf();
    const notModified = await get({ "if-none-match": current });
    expect(notModified.statusCode).toBe(304);
    expect(notModified.rawPayload.length).toBe(0);
    expect(notModified.headers.etag).toBe(current);
    expect(notModified.headers["cache-control"]).toBe("no-cache");
    expect((await get({ "if-none-match": `"1-1", ${current}` })).statusCode).toBe(304);
    expect((await get({ "if-none-match": `W/${current}` })).statusCode).toBe(304);
    expect((await get({ "if-none-match": "*" })).statusCode).toBe(304);
    expect((await get({ "if-none-match": `"1000-1"` })).statusCode).toBe(200);
  });

  it("If-Range with the current version serves the range; with an old version or a date, the whole file", async () => {
    const current = etagOf();
    expect((await get({ range: "bytes=10-19", "if-range": current })).statusCode).toBe(206);
    const stale = await get({ range: "bytes=10-19", "if-range": `"1000-1"` });
    expect(stale.statusCode).toBe(200);
    expect(stale.rawPayload.equals(bytes)).toBe(true);
    expect((await get({ range: "bytes=10-19", "if-range": "Wed, 21 Oct 2015 07:28:00 GMT" })).statusCode).toBe(200);
  });

  it("a route that sets no-store keeps it, and still serves ranges", async () => {
    const response = await get({ range: "bytes=0-9" }, "/no-store");
    expect(response.statusCode).toBe(206);
    expect(response.headers["cache-control"]).toBe("no-store");
  });

  it("a rewritten file is never answered 304 for the old version: new bytes and a new ETag", async () => {
    const before = etagOf();
    const rewritten = Buffer.from("a rewritten file, longer than before or not");
    fs.writeFileSync(file, rewritten);
    fs.utimesSync(file, new Date(), new Date(Date.now() + 5_000));
    try {
      const response = await get({ "if-none-match": before });
      expect(response.statusCode).toBe(200);
      expect(response.rawPayload.equals(rewritten)).toBe(true);
      expect(response.headers.etag).not.toBe(before);
      expect(response.headers.etag).toBe(etagOf());
    } finally {
      fs.writeFileSync(file, bytes);
    }
  });

  it("HEAD answers the headers of the whole file or the range, without a body", async () => {
    const whole = await app.inject({ method: "HEAD", url: "/file" });
    expect(whole.statusCode).toBe(200);
    expect(whole.headers["content-length"]).toBe("1000");
    expect(whole.headers["accept-ranges"]).toBe("bytes");
    const ranged = await app.inject({ method: "HEAD", url: "/file", headers: { range: "bytes=0-1" } });
    expect(ranged.statusCode).toBe(206);
    expect(ranged.headers["content-range"]).toBe("bytes 0-1/1000");
  });
});
