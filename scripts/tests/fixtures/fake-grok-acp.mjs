#!/usr/bin/env node
// A token-free `grok` for checking the live smoke suite's model choice (GROK_BUILD_COMMAND=<this file>).
// `--version` and `agent --help` pass the server's CLI check. `agent ... stdio` speaks ACP: `initialize` offers
// grok-4.5 and grok-4.6 (not the pinned grok-4.7), sessions open and report their MCP servers ready, and every prompt
// is refused. It never calls a provider, so a run spends nothing and needs no key.
import readline from "node:readline";

const args = process.argv.slice(2);
if (args[0] === "--version") {
  process.stdout.write("grok 1.0.46 (fake) [stable]\n");
  process.exit(0);
}
if (args[0] === "agent" && args.includes("--help")) {
  process.stdout.write("Commands:\n  stdio  Run the agent over stdio\nOptions:\n  -m, --model <MODEL>\n"
    + "  --reasoning-effort <EFFORT>\n  --no-leader\n");
  process.exit(0);
}
if (!(args[0] === "agent" && args.at(-1) === "stdio")) process.exit(2);

const efforts = ["high", "low"].map((value) => ({ id: value, value, label: value, default: value === "high" }));
const model = (modelId) => ({ modelId, name: modelId, description: "fake",
  _meta: { totalContextTokens: 100000, supportsReasoningEffort: true, reasoningEfforts: efforts } });
const INITIALIZE = {
  protocolVersion: 1,
  agentCapabilities: { loadSession: true, mcpCapabilities: { http: true, sse: true },
    promptCapabilities: { image: false, audio: false, embeddedContext: true }, sessionCapabilities: { close: {} } },
  authMethods: [],
  _meta: { agentVersion: "1.0.46", modelState: { currentModelId: "grok-4.5", availableModels: [model("grok-4.5"), model("grok-4.6")] } },
};

const send = (message) => process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", ...message })}\n`);
const reportReady = (sessionId, servers) => {
  for (const server of servers ?? []) {
    send({ method: "_x.ai/mcp/server_status",
      params: { sessionId, name: server.name, source: "local", status: "ready", reason: "initialized", tools: null } });
  }
};

readline.createInterface({ input: process.stdin }).on("line", (line) => {
  if (!line.trim()) return;
  const { id, method, params } = JSON.parse(line);
  if (id === undefined || !method) return; // notifications and answers need nothing
  if (method === "initialize") return send({ id, result: INITIALIZE });
  if (method === "session/new" || method === "session/load") {
    const sessionId = params?.sessionId ?? "fake-grok-session";
    send({ id, result: method === "session/new" ? { sessionId } : {} });
    return reportReady(sessionId, params?.mcpServers);
  }
  if (method === "session/close") return send({ id, result: {} });
  if (method === "session/prompt") {
    return send({ id, error: { code: -32603, message: "fake Grok refuses prompts (token-free model-choice check)" } });
  }
  send({ id, error: { code: -32601, message: `fake Grok does not support ${method}` } });
});
process.stdin.on("end", () => process.exit(0));
