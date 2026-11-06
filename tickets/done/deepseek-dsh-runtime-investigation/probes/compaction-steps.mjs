// Prints the compaction-probe steps JSON for workspace argv[2].
const cwd = process.argv[2];
let fill = "";
for (let i = 1; i <= 90; i++) fill += "Filler sentence number " + i + " talks about warehouses, shipping routes, pallets and invoices in some detail. ";
const prompt = (text) => ({ method: "session/prompt", params: { sessionId: "$session", prompt: [{ type: "text", text }] }, timeoutMs: 240000 });
const steps = [
  { method: "initialize", params: { protocolVersion: 1, clientCapabilities: {}, clientInfo: { name: "autobyteus-probe", version: "0" } } },
  { method: "session/new", params: { cwd, mcpServers: [] } },
  prompt("The code word is PELICAN-77. Remember it. Background text follows; reply only OK. " + fill),
  prompt("More background; reply only OK. " + fill),
  prompt("Even more background; reply only OK. " + fill),
  prompt("Without tools: what was the code word I gave you in my first message?"),
  { method: "session/close", params: { sessionId: "$session" } },
];
process.stdout.write(JSON.stringify(steps));
