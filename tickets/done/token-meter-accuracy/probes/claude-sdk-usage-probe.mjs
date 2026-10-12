// Probe: what usage/context data does the Claude Agent SDK give, and when?
// Usage: node claude-sdk-usage-probe.mjs <model> <outFile> [scenario]
// scenario: "multi" (default) = turn 1 with several sequential tool calls, turn 2 a plain reply.
import { writeFileSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { mkdtempSync } from "node:fs";
import path from "node:path";

const SDK = "/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/node_modules/.pnpm/@anthropic-ai+claude-agent-sdk@0.3.280_@anthropic-ai+sdk@0.128.0_zod@4.3.6__@modelconte_49585bd31487830510ba6409d519ab00/node_modules/@anthropic-ai/claude-agent-sdk/sdk.mjs";
const { query } = await import(SDK);

const model = process.argv[2] ?? "claude-haiku-4-5";
const out = process.argv[3] ?? "/tmp/claude-sdk-usage-probe.jsonl";
const scenario = process.argv[4] ?? "multi";
const extraSettings = process.argv[5] ? JSON.parse(process.argv[5]) : null;
writeFileSync(out, "");
const t0 = Date.now();
const log = (label, data) => appendFileSync(out, JSON.stringify({ label, dt: Date.now() - t0, data }) + "\n");

const prompts = {
  multi: [
    "Use the Bash tool three times, one call at a time (wait for each result before the next): `echo one`, then `echo two`, then `echo three`. Then reply with exactly DONE.",
    "Reply with exactly: SECOND",
  ],
  single: ["Reply with exactly: OK"],
  fill: [
    ...[1, 2, 3, 4].map((n) => `Data dump ${n}. Do not analyze. Reply with exactly: OK${n}\n` +
      Array.from({ length: 2500 }, (_, i) => `record ${n}-${i}: the quick brown fox jumps over the lazy dog`).join("\n")),
    "Reply with exactly: END",
  ],
  big: [
    ...[0, 1, 2, 3, 4, 5].map((i) => `Use the Bash tool to run \`seq ${i * 8000 + 1} ${(i + 1) * 8000}\`. Then reply with exactly DONE.`),
    "Reply with exactly: END",
  ],
}[scenario];

let resolveTurn;
let turnDone = new Promise((r) => (resolveTurn = r));
async function* input() {
  for (const text of prompts) {
    log("SEND", text);
    yield { type: "user", message: { role: "user", content: text }, parent_tool_use_id: null, session_id: "" };
    await turnDone;
    turnDone = new Promise((r) => (resolveTurn = r));
  }
}

const cwd = mkdtempSync(path.join(tmpdir(), "claude-usage-probe-"));
const q = query({
  prompt: input(),
  options: {
    model,
    cwd,
    permissionMode: "bypassPermissions",
    allowDangerouslySkipPermissions: true,
    tools: ["Bash"],
    settingSources: [],
    ...(process.env.PROBE_PARTIAL ? { includePartialMessages: true } : {}),
    ...(extraSettings ? { settings: extraSettings } : {}),
  },
});

let results = 0;
for await (const m of q) {
  const rec = { type: m.type, subtype: m.subtype };
  if (m.type === "assistant") {
    rec.id = m.message?.id;
    rec.blocks = (m.message?.content ?? []).map((b) => b.type);
    rec.usage = m.message?.usage;
    rec.parent_tool_use_id = m.parent_tool_use_id;
  } else if (m.type === "result") {
    rec.num_turns = m.num_turns;
    rec.usage = m.usage;
    rec.modelUsage = m.modelUsage;
    rec.total_cost_usd = m.total_cost_usd;
  } else if (m.type === "system") {
    rec.raw = m.subtype === "init" ? { model: m.model } : m;
  } else if (m.type === "user") {
    rec.tool_result = true;
  } else if (m.type === "stream_event") {
    const ev = m.event;
    if (ev.type === "message_start") rec.raw = { ev: "message_start", id: ev.message?.id, usage: ev.message?.usage };
    else if (ev.type === "message_delta") rec.raw = { ev: "message_delta", usage: ev.usage };
    else continue;
  } else {
    rec.raw = m;
  }
  log("MSG", rec);
  if (process.env.PROBE_MIDTURN && m.type === "stream_event" && m.event.type === "message_delta") {
    q.getContextUsage({ detail: "summary" })
      .then((cu) => log("MIDTURN_CONTEXT", { totalTokens: cu.totalTokens, rawMaxTokens: cu.rawMaxTokens, percentage: cu.percentage, autoCompactThreshold: cu.autoCompactThreshold }))
      .catch((e) => log("MIDTURN_CONTEXT_ERROR", String(e)));
  }
  if (m.type === "result") {
    results += 1;
    for (const detail of ["summary", "full"]) {
      try {
        const cu = await q.getContextUsage({ detail });
        log(`CONTEXT_${detail}`, {
          totalTokens: cu.totalTokens, maxTokens: cu.maxTokens, rawMaxTokens: cu.rawMaxTokens,
          percentage: cu.percentage, autoCompactThreshold: cu.autoCompactThreshold,
          isAutoCompactEnabled: cu.isAutoCompactEnabled, model: cu.model,
          categories: cu.categories.map((c) => ({ name: c.name, tokens: c.tokens, kind: c.kind })),
        });
      } catch (e) { log(`CONTEXT_${detail}_ERROR`, String(e)); }
    }
    resolveTurn();
    if (results >= prompts.length) break;
  }
}
q.close?.();
log("END", { results });
