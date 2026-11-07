import { Readable } from "node:stream";
import fastify from "fastify";
import { describe, expect, it } from "vitest";
import { sendUserFile } from "../../../../src/api/rest/user-file-reply.js";

// autobyteus-416 D5 (REQ-007, AC-007): every user file answers in an opaque origin, never sniffed.
describe("sendUserFile", () => {
  it.each([
    ["x.html", "text/html", "<!doctype html><script>fetch('/graphql')</script>"],
    ["x.svg", "image/svg+xml", '<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>'],
    ["x.xml", "application/xml", "<?xml version=\"1.0\"?><a/>"],
    ["x.pdf", "application/pdf", "%PDF-1.4\n"],
  ])("serves %s with its type, the body unchanged, sandbox allow-scripts and nosniff", async (_name, mimeType, content) => {
    const app = fastify();
    app.get("/file", async (_request, reply) => {
      reply.header("cache-control", "no-store");
      return sendUserFile(reply, { mimeType, body: Readable.from([Buffer.from(content)]) });
    });
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
});
