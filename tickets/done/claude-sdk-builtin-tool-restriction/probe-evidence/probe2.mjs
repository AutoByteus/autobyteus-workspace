import http from "node:http";
import fs from "node:fs";
const NM = "/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/node_modules";
const { query } = await import(`${NM}/@anthropic-ai/claude-agent-sdk/sdk.mjs`);
const { McpServer } = await import(`${NM}/@modelcontextprotocol/sdk/dist/esm/server/mcp.js`);
const { StreamableHTTPServerTransport } = await import(`${NM}/@modelcontextprotocol/sdk/dist/esm/server/streamableHttp.js`);
const { z } = await import(`${NM}/zod/index.js`);
const [label, optsJson] = [process.argv[2], process.argv[3]];
const extra = JSON.parse(optsJson);

// --- HTTP MCP server mimicking autobyteus_agent_tools ---
const mcpCalls = [];
function buildMcp() {
  const s = new McpServer({ name: "autobyteus_agent_tools", version: "1.0.0" });
  for (const n of ["send_message_to", "delegate_task", "get_handoff_rules"]) {
    s.tool(n, `PROBE_MCP ${n}`, { content: z.string().optional() }, async (a) => { mcpCalls.push(n); return { content: [{ type: "text", text: `${n} ok` }] }; });
  }
  return s;
}
const mcpHttp = http.createServer(async (req, res) => {
  let b = ""; req.on("data", c => b += c); req.on("end", async () => {
    const t = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    const s = buildMcp(); await s.connect(t);
    await t.handleRequest(req, res, b ? JSON.parse(b) : undefined);
  });
});
await new Promise(r => mcpHttp.listen(0, "127.0.0.1", r));

// --- fake Anthropic API: turn 1 emits tool_use calls, turn 2 ends ---
const captured = [];
const ev = (e, d) => `event: ${e}\ndata: ${JSON.stringify(d)}\n\n`;
const TOOL_CALLS = [
  ["Agent", { description: "x", prompt: "do x", subagent_type: "general-purpose" }],
  ["Workflow", { script: "export const meta={name:'x',description:'x'}" }],
  ["SendMessage", { to: "main", summary: "x", message: "x" }],
  ["mcp__autobyteus_agent_tools__send_message_to", { content: "hi" }],
];
function sse(model, n) {
  let out = ev("message_start", { type: "message_start", message: { id: "msg_" + n, type: "message", role: "assistant", model, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } } });
  if (n === 1) {
    TOOL_CALLS.forEach(([name, input], i) => {
      out += ev("content_block_start", { type: "content_block_start", index: i, content_block: { type: "tool_use", id: `toolu_${i}`, name, input: {} } });
      out += ev("content_block_delta", { type: "content_block_delta", index: i, delta: { type: "input_json_delta", partial_json: JSON.stringify(input) } });
      out += ev("content_block_stop", { type: "content_block_stop", index: i });
    });
    out += ev("message_delta", { type: "message_delta", delta: { stop_reason: "tool_use", stop_sequence: null }, usage: { output_tokens: 1 } });
  } else {
    out += ev("content_block_start", { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } });
    out += ev("content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "done" } });
    out += ev("content_block_stop", { type: "content_block_stop", index: 0 });
    out += ev("message_delta", { type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 1 } });
  }
  return out + ev("message_stop", { type: "message_stop" });
}
let mainTurns = 0;
const api = http.createServer((req, res) => {
  let b = ""; req.on("data", c => b += c); req.on("end", () => {
    let j = null; try { j = JSON.parse(b) } catch {}
    captured.push({ url: req.url, body: j });
    if (req.url.startsWith("/v1/messages") && !req.url.includes("count_tokens") && j?.stream) {
      const isMain = (j.tools || []).length > 0; const n = isMain ? ++mainTurns : 99;
      res.writeHead(200, { "content-type": "text/event-stream" }); res.end(sse(j.model, n));
    } else { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ input_tokens: 1 })); }
  });
});
await new Promise(r => api.listen(0, "127.0.0.1", r));

const env = { PATH: process.env.PATH, HOME: process.env.HOME, ANTHROPIC_API_KEY: "sk-ant-dummy", ANTHROPIC_BASE_URL: `http://127.0.0.1:${api.address().port}`, CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1" };
const mcpTools = ["send_message_to", "delegate_task", "get_handoff_rules"];
const allowedTools = ["Skill", ...mcpTools, ...mcpTools.map(n => `mcp__autobyteus_agent_tools__${n}`)];
let init = null; const toolResults = [];
const q = query({ prompt: "say ok", options: {
  model: "claude-sonnet-4-5", systemPrompt: "You are PROBE_SYSTEM_PROMPT.", cwd: "/tmp/claude-tool-probe/ws", env,
  permissionMode: "default", settingSources: ["user", "project", "local"], allowedTools,
  mcpServers: { autobyteus_agent_tools: { type: "http", url: `http://127.0.0.1:${mcpHttp.address().port}/mcp` } },
  canUseTool: async (_n, input) => ({ behavior: "allow", updatedInput: input }),
  ...extra,
}});
try { for await (const m of q) {
  if (m.type === "system" && m.subtype === "init") init = m;
  if (m.type === "user" && Array.isArray(m.message?.content)) for (const c of m.message.content) if (c.type === "tool_result") toolResults.push({ id: c.tool_use_id, is_error: !!c.is_error, text: (typeof c.content === "string" ? c.content : JSON.stringify(c.content)).slice(0, 160) });
  if (m.type === "result") break;
} } catch (e) { console.error("query error:", e.message); }
api.close(); mcpHttp.close();
fs.writeFileSync(`/tmp/claude-tool-probe/${label}.json`, JSON.stringify({ extra, init, captured, toolResults, mcpCalls }, null, 1));
console.log(label, "requests:", captured.map(c => c.url).join(", "));
process.exit(0);
