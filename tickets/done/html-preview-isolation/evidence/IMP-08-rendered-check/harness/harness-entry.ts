// Serves the synthetic workspace through the real registerWorkspaceRoutes (worktree source) at /rest,
// and a stand-in "other site" on a second port. Logs the Origin of every request.
import fs from "node:fs";
import path from "node:path";
import fastify from "fastify";
import { registerWorkspaceRoutes } from "/Users/normy/autobyteus_org/autobyteus-worktrees/html-preview-isolation/autobyteus-server-ts/src/api/rest/workspaces.ts";

const log = (line: string) => fs.appendFileSync(process.env.HPI_LOG!, line + "\n");
const node = fastify();
node.addHook("onRequest", async (request) => {
  log(`NODE ${request.method} ${request.url} origin=${request.headers.origin ?? "<absent>"}`);
});
node.addHook("onSend", async (request, reply, payload) => {
  log(`NODE-REPLY ${request.url} status=${reply.statusCode} csp=${reply.getHeader("content-security-policy") ?? "<none>"}`);
  return payload;
});
await node.register(registerWorkspaceRoutes, { prefix: "/rest" });
await node.listen({ host: "127.0.0.1", port: 47931 });

const other = fastify();
other.get("/cdn/lib.js", async (_request, reply) => {
  reply.type("text/javascript");
  return fs.readFileSync(path.join(process.env.HPI_CDN_ROOT!, "lib.js"));
});
await other.listen({ host: "127.0.0.1", port: 47932 });
log("listening");
