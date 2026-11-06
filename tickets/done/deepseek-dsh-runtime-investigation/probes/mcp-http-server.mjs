// Minimal Streamable-HTTP MCP server (JSON responses). One tool: lookup_order. Logs every call.
// Usage: node mcp-http-server.mjs <port> <log.jsonl>   (EXPECT_AUTH from env, fake)
import http from "node:http";
import fs from "node:fs";
const [port, logPath] = process.argv.slice(2);
const log = (o) => fs.appendFileSync(logPath, JSON.stringify(o) + "\n");
http.createServer((req, res) => {
  let body = ""; req.on("data", (c) => (body += c));
  req.on("end", () => {
    const authOk = req.headers.authorization === `Bearer ${process.env.EXPECT_AUTH}`;
    if (req.method !== "POST") { log({ method: req.method, authOk }); res.writeHead(405); res.end(); return; }
    const msg = JSON.parse(body);
    log({ rpc: msg.method, authOk, params: msg.method === "tools/call" ? msg.params : undefined });
    if (msg.id === undefined) { res.writeHead(202); res.end(); return; }
    const reply = (result) => { res.writeHead(200, { "content-type": "application/json", "mcp-session-id": "probe-session" }); res.end(JSON.stringify({ jsonrpc: "2.0", id: msg.id, result })); };
    if (msg.method === "initialize") return reply({ protocolVersion: msg.params.protocolVersion, capabilities: { tools: {} }, serverInfo: { name: "probe-agent-tools", version: "0.0.1" } });
    if (msg.method === "tools/list") return reply({ tools: [{ name: "lookup_order", description: "Look up the shipping status of an order by its id.", inputSchema: { type: "object", properties: { order_id: { type: "string" } }, required: ["order_id"] } }] });
    if (msg.method === "tools/call") return reply({ content: [{ type: "text", text: `Order ${msg.params.arguments?.order_id}: shipped on 2026-11-02, carrier DHL.` }] });
    res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ jsonrpc: "2.0", id: msg.id, error: { code: -32601, message: "Method not found" } }));
  });
}).listen(Number(port), "127.0.0.1");
