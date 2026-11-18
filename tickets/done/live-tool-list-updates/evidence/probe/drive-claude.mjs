#!/usr/bin/env node
// Claude Agent SDK driver (autobyteus-324 probe): ONE session (streaming input, as AutoByteus runs it), three turns.
// T1 call probe_alpha; then the server adds probe_beta (list_changed); T2 call probe_beta; then the server removes
// probe_alpha (list_changed); T3 call probe_alpha. allowedTools lists only probe_alpha, as AutoByteus lists the
// definition's tools; canUseTool logs and allows anything else.
// Usage: node drive-claude.mjs <sdkModulePath> <probeBaseUrl> <workdir> <out.jsonl>
import fs from "node:fs";
const [sdkPath, base, workdir, outPath] = process.argv.slice(2);
const { query } = await import(sdkPath);
const out = (e) => fs.appendFileSync(outPath, JSON.stringify({ t: new Date().toISOString(), ...e }) + "\n");
const prompts = [
  "Call the tool probe_alpha (no arguments). Then reply with exactly the text it returned, nothing else.",
  "Do you now have a tool named probe_beta? If yes, call it (no arguments) and reply with exactly the text it returned. If you do not have it, reply exactly NO_BETA_TOOL.",
  "Call the tool probe_alpha again (no arguments) and reply with exactly the text it returned. If you do not have that tool, reply exactly NO_ALPHA_TOOL.",
];
const control = [null, "add-beta", "remove-alpha"];
let nextTurn; const turnDone = () => new Promise((r) => { nextTurn = r; });
async function* input() {
  for (let i = 0; i < prompts.length; i += 1) {
    if (control[i]) {
      const r = await fetch(`${base}/control/${control[i]}`, { method: "POST" });
      out({ kind: "control", action: control[i], state: await r.json() });
      await new Promise((r2) => setTimeout(r2, 3000));
    }
    out({ kind: "turn", n: i + 1, prompt: prompts[i] });
    yield { type: "user", message: { role: "user", content: prompts[i] }, parent_tool_use_id: null, session_id: "" };
    await turnDone();
  }
}
const q = query({ prompt: input(), options: {
  model: "haiku", cwd: workdir, mcpServers: { probe: { type: "http", url: `${base}/mcp` } },
  allowedTools: ["mcp__probe__probe_alpha"], permissionMode: "default",
  canUseTool: async (toolName, toolInput) => { out({ kind: "canUseTool", toolName }); return { behavior: "allow", updatedInput: toolInput }; },
} });
for await (const m of q) {
  if (m.type === "system" && m.subtype === "init") out({ kind: "init", tools: m.tools?.filter((t) => t.startsWith("mcp__")), mcp: m.mcp_servers });
  else if (m.type === "system") out({ kind: "system", subtype: m.subtype, text: JSON.stringify(m).slice(0, 400) });
  else if (m.type === "assistant") for (const c of m.message.content) {
    if (c.type === "tool_use") out({ kind: "tool_use", name: c.name });
    if (c.type === "text") out({ kind: "text", text: c.text.slice(0, 300) });
  } else if (m.type === "user") for (const c of (Array.isArray(m.message.content) ? m.message.content : [])) {
    if (c.type === "tool_result") out({ kind: "tool_result", text: JSON.stringify(c.content).slice(0, 200) });
  } else if (m.type === "result") { out({ kind: "result", subtype: m.subtype, result: String(m.result ?? "").slice(0, 200) }); nextTurn?.(); }
}
out({ kind: "end" });
