import http from "node:http";
import { openSession, ts, sleep } from "./lib.mjs";
// Minimal streamable-HTTP MCP server (JSON responses), like AutoByteus's HTTP agent-tools MCP
const server = http.createServer(async (req, res) => {
  if (req.method !== "POST") { res.writeHead(405).end(); return; }
  let body = ""; for await (const c of req) body += c;
  const msg = JSON.parse(body);
  if (msg.id === undefined) { res.writeHead(202).end(); return; }
  let result;
  if (msg.method === "initialize") result = { protocolVersion: msg.params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: "slow", version: "1" } };
  else if (msg.method === "tools/list") result = { tools: [{ name: "slow_echo", description: "Echo text after a delay of `seconds`.", inputSchema: { type: "object", properties: { text: { type: "string" }, seconds: { type: "number" } }, required: ["text", "seconds"] } }] };
  else if (msg.method === "tools/call") { const s = msg.params.arguments.seconds; console.log(ts(), "K: MCP tool call started, sleeping", s); await sleep(s * 1000); console.log(ts(), "K: MCP tool call finishing"); result = { content: [{ type: "text", text: "ECHO:" + msg.params.arguments.text }] }; }
  else result = {};
  res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result }));
});
await new Promise(r => server.listen(0, r));
const url = `http://127.0.0.1:${server.address().port}/mcp`;
const mode = process.argv[2] ?? "default";
const extraEnv = mode === "short" ? { CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS: "4000" } : {};
console.log(ts(), "K mode", mode, JSON.stringify(extraEnv));
const s = openSession({ mcpServers: { slow: { type: "http", url } }, allowedTools: ["mcp__slow__slow_echo"], env: extraEnv }, "K");
s.send("Call the slow_echo tool with text 'hi' and seconds 12, then reply with its exact output.");
await s.nextResult(90000); await sleep(3000);
s.close(); server.close(); await sleep(300); process.exit(0);
