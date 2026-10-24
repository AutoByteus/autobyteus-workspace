// Usage: node cors-order-probe.mjs <fastify-dir> <@fastify/cors-dir>
// Mirrors build-studio-server.ts order: encapsulated MCP-like plugin first, then root cors, then a normal route.
import { pathToFileURL } from "node:url";
import path from "node:path";
const load = async (dir) => (await import(pathToFileURL(path.join(dir, (await import(pathToFileURL(path.join(dir, "package.json")), { with: { type: "json" } })).default.main || "index.js")).href)).default;
const fastify = await load(process.argv[2]);
const cors = await load(process.argv[3]);
const app = fastify();
await app.register(async (child) => {
  child.all("/mcp-with-config", { config: { cors: false } }, async () => ({ ok: 1 }));
  child.all("/mcp-no-config", async () => ({ ok: 1 }));
});
await app.register(cors, { origin: true, methods: ["GET", "POST", "OPTIONS"] });
app.get("/rest/x", async () => ({ ok: 1 }));
await app.ready();
for (const url of ["/mcp-with-config", "/mcp-no-config", "/rest/x"]) {
  const r = await app.inject({ method: "GET", url, headers: { origin: "http://evil.example" } });
  const p = await app.inject({ method: "OPTIONS", url, headers: { origin: "http://evil.example", "access-control-request-method": "POST" } });
  console.log(app.version, url, "GET acao=", r.headers["access-control-allow-origin"] ?? "-", "| OPTIONS status=", p.statusCode, "acao=", p.headers["access-control-allow-origin"] ?? "-");
}
await app.close();
