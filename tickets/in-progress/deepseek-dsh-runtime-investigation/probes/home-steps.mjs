const cwd = process.argv[2];
const prompt = (text) => ({ method: "session/prompt", params: { sessionId: "$session", prompt: [{ type: "text", text }] }, timeoutMs: 180000 });
process.stdout.write(JSON.stringify([
  { method: "initialize", params: { protocolVersion: 1, clientCapabilities: {}, clientInfo: { name: "autobyteus-probe", version: "0" } } },
  { method: "session/new", params: { cwd, mcpServers: [] } },
  prompt("Who are you, according to your instructions? Quote the sentence that mentions braces exactly."),
  prompt("Please greet Ryan."),
  prompt("Run this exact bash command and show me its raw output: env | grep -E 'DEEPSEEK|AUTOBYTEUS' | sed -E 's/=.*/=<set>/' ; echo done"),
  { method: "session/close", params: { sessionId: "$session" } },
]));
