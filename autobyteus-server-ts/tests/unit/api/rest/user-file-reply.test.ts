import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import fastify from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sendUserFile } from "../../../../src/api/rest/user-file-reply.js";

// autobyteus-416 D5 (REQ-007, AC-007): every user file answers in an opaque origin, never sniffed.
describe("sendUserFile", () => {
  let dir: string;
  beforeAll(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), "user-file-reply-")); });
  afterAll(() => { fs.rmSync(dir, { recursive: true, force: true }); });

  const serve = (name: string, mimeType: string, content: string) => {
    const filePath = path.join(dir, name);
    fs.writeFileSync(filePath, content);
    const stat = fs.statSync(filePath);
    const app = fastify();
    app.get("/file", async (request, reply) => {
      reply.header("cache-control", "no-store");
      return sendUserFile(reply, { mimeType, path: filePath, size: stat.size, modifiedMs: stat.mtimeMs }, request);
    });
    return app;
  };

  it.each([
    ["x.html", "text/html", "<!doctype html><script>fetch('/graphql')</script>"],
    ["x.svg", "image/svg+xml", '<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>'],
    ["x.xml", "application/xml", "<?xml version=\"1.0\"?><a/>"],
    ["x.pdf", "application/pdf", "%PDF-1.4\n"],
  ])("serves %s with its type, the body unchanged, sandbox allow-scripts and nosniff", async (name, mimeType, content) => {
    const app = serve(name, mimeType, content);
    try {
      const response = await app.inject({ method: "GET", url: "/file" });
      expect(response.statusCode).toBe(200);
      expect(String(response.headers["content-type"])).toContain(mimeType);
      expect(response.headers["content-security-policy"]).toBe("sandbox allow-scripts");
      expect(response.headers["x-content-type-options"]).toBe("nosniff");
      expect(response.headers["cache-control"]).toBe("no-store");
      expect(response.body).toBe(content);
    } finally {
      await app.close();
    }
  });

  // autobyteus-572 D-5: a client shows how much of the file has arrived only when its length is declared.
  it("declares the file's length as Content-Length", async () => {
    const app = serve("clip.mp4", "video/mp4", "0123456");
    try {
      const response = await app.inject({ method: "GET", url: "/file" });
      expect(response.statusCode).toBe(200);
      expect(response.headers["content-length"]).toBe("7");
      expect(response.rawPayload.length).toBe(7);
    } finally {
      await app.close();
    }
  });
});
