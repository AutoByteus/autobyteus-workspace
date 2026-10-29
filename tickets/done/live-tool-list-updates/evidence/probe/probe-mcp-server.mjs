#!/usr/bin/env node
// Probe MCP server (autobyteus-324): does a runtime's MCP client honor notifications/tools/list_changed in a running session?
// Streamable HTTP, no dependencies. Starts with tool probe_alpha. Control endpoints change the tool list and notify:
//   POST /control/add-beta      -> adds probe_beta, sends notifications/tools/list_changed
//   POST /control/remove-alpha  -> removes probe_alpha (calls to it are refused), sends notifications/tools/list_changed
//   GET  /control/state         -> current tools, open SSE streams, counts
// Every request is appended to <log> as one JSON line. Usage: node probe-mcp-server.mjs <port> <log.jsonl>
import http from "node:http";
import fs from "node:fs";
import { randomUUID } from "node:crypto";

const port = Number(process.argv[2] ?? 39931);
const logPath = process.argv[3] ?? "/tmp/probe-mcp.jsonl";
// A 3rd argument "empty" starts the server with no tools (the zero-tool case, ARCH-REV-001 AR-003).
const tools = process.argv[4] === "empty" ? new Map()
  : new Map([["probe_alpha", { name: "probe_alpha", description: "Probe tool alpha. Call it with no arguments.", inputSchema: { type: "object", properties: {} } }]]);
const BETA = { name: "probe_beta", description: "Probe tool beta, added while the session runs. Call it with no arguments.", inputSchema: { type: "object", properties: {} } };
const streams = new Set();
let pendingForPost = false;
const log = (entry) => fs.appendFileSync(logPath, JSON.stringify({ t: new Date().toISOString(), ...entry }) + "\n");

const notifyChanged = (reason) => {
  const frame = `event: message\ndata: ${JSON.stringify({ jsonrpc: "2.0", method: "notifications/tools/list_changed" })}\n\n`;
  for (const res of streams) res.write(frame);
  pendingForPost = true;
  log({ kind: "notify", reason, getStreams: streams.size, tools: [...tools.keys()] });
};

const readBody = (req) => new Promise((resolve) => { let b = ""; req.on("data", (c) => { b += c; }); req.on("end", () => resolve(b)); });

const handleRpc = (msg) => {
  const { id, method, params } = msg;
  if (method === "initialize") {
    return { jsonrpc: "2.0", id, result: { protocolVersion: params?.protocolVersion ?? "2025-06-18", capabilities: { tools: { listChanged: true } }, serverInfo: { name: "probe", version: "0.1.0" } } };
  }
  if (method === "tools/list") return { jsonrpc: "2.0", id, result: { tools: [...tools.values()] } };
  if (method === "ping") return { jsonrpc: "2.0", id, result: {} };
  if (method === "tools/call") {
    const name = params?.name;
    if (!tools.has(name)) return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: `REFUSED: tool '${name}' is not available.` }], isError: true } };
    return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: `${name.toUpperCase()}_OK_7319` }] } };
  }
  return { jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found" } };
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.startsWith("/control/")) {
    if (url.pathname === "/control/add-beta") { tools.set(BETA.name, BETA); notifyChanged("add-beta"); }
    if (url.pathname === "/control/remove-alpha") { tools.delete("probe_alpha"); notifyChanged("remove-alpha"); }
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ tools: [...tools.keys()], getStreams: streams.size }));
  }
  const accept = String(req.headers.accept ?? "");
  const session = req.headers["mcp-session-id"] ?? null;
  const ua = req.headers["user-agent"] ?? null;
  if (req.method === "GET") {
    log({ kind: "http", http: "GET", accept, session, ua });
    // As the AutoByteus endpoint does for AGY's run-scoped header (agent-tools-mcp-routes.ts:97-98): no GET stream.
    if (String(req.headers["x-autobyteus-mcp-transport"] ?? "") === "streamable-http") { res.writeHead(405); return res.end(); }
    if (!accept.includes("text/event-stream")) { res.writeHead(405); return res.end(); }
    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
    res.write(": open\n\n");
    streams.add(res);
    const keep = setInterval(() => res.write(": keepalive\n\n"), 15_000);
    req.on("close", () => { clearInterval(keep); streams.delete(res); log({ kind: "http", http: "GET-closed", session }); });
    return;
  }
  if (req.method === "DELETE") { log({ kind: "http", http: "DELETE", session }); res.writeHead(200); return res.end(); }
  if (req.method !== "POST") { res.writeHead(405); return res.end(); }
  const raw = await readBody(req);
  let msg; try { msg = JSON.parse(raw); } catch { res.writeHead(400); return res.end(); }
  const batch = Array.isArray(msg) ? msg : [msg];
  log({ kind: "rpc", methods: batch.map((m) => m.method ?? (m.result !== undefined ? "response" : "?")), names: batch.map((m) => m.params?.name ?? null), accept, session, ua });
  const requests = batch.filter((m) => m.method && m.id !== undefined);
  if (requests.length === 0) { res.writeHead(202); return res.end(); }
  const replies = requests.map(handleRpc);
  const headers = {};
  if (requests.some((m) => m.method === "initialize")) headers["mcp-session-id"] = randomUUID();
  if (accept.includes("text/event-stream")) {
    res.writeHead(200, { ...headers, "content-type": "text/event-stream", "cache-control": "no-cache" });
    // A change that no GET stream carried is also sent on the next POST response stream (allowed by the spec).
    if (pendingForPost) { res.write(`event: message\ndata: ${JSON.stringify({ jsonrpc: "2.0", method: "notifications/tools/list_changed" })}\n\n`); pendingForPost = false; log({ kind: "notify-on-post" }); }
    for (const r of replies) res.write(`event: message\ndata: ${JSON.stringify(r)}\n\n`);
    return res.end();
  }
  res.writeHead(200, { ...headers, "content-type": "application/json" });
  res.end(JSON.stringify(Array.isArray(msg) ? replies : replies[0]));
}).listen(port, "127.0.0.1", () => log({ kind: "listening", port }));
