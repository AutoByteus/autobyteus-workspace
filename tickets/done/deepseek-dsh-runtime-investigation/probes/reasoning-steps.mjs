// Prints steps JSON: max reasoning effort, one hard no-tools problem, for workspace argv[2].
const cwd = process.argv[2];
const steps = [
  { method: "initialize", params: { protocolVersion: 1, clientCapabilities: {}, clientInfo: { name: "autobyteus-probe", version: "0" } } },
  { method: "session/new", params: { cwd, mcpServers: [] } },
  { method: "session/set_config_option", params: { sessionId: "$session", configId: "reasoning_effort", value: "max" } },
  { method: "session/prompt", params: { sessionId: "$session", prompt: [{ type: "text", text: "Without using any tools: how many ways are there to tile a 4 by 10 rectangle with 1 by 2 dominoes? Derive it carefully by hand with a transfer-matrix argument, then verify with a second independent method, and give the final number." }] }, timeoutMs: 900000 },
  { method: "session/close", params: { sessionId: "$session" } },
];
process.stdout.write(JSON.stringify(steps));
