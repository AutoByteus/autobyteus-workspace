import fs from "node:fs";
import { pathToFileURL } from "node:url";
const root = "/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy-api-e2e-desktop";
const pres = await import(pathToFileURL(`${root}/autobyteus-agent-presentation-contracts/dist/index.js`).href);
const frames = JSON.parse(fs.readFileSync("/tmp/tma-api-e2e/org-raw.json", "utf8"));
const token = frames.filter((f) => /TOKEN_USAGE_UPDATED/.test(JSON.stringify(f)));
const out = [];
for (const f of token) {
  const ev = f.payload.event;
  // find the presentation message inside
  const msg = ev?.message ?? ev?.payload?.message ?? ev;
  const p = msg?.payload ?? {};
  let contract = "n/a";
  const schema = pres.agentPresentationMessageSchema ?? pres.agentPresentationServerMessageSchema;
  if (schema) { try { schema.parse(msg); contract = "ok"; } catch (e) { contract = String(e).slice(0, 300); } }
  out.push({ t: f.t, evKeys: Object.keys(ev ?? {}), msgType: msg?.type, call: p.reports_model_call, prompt: p.latest_prompt_tokens,
    window: p.effective_context_window_tokens, threshold: p.context_compaction_threshold_tokens,
    summaryCount: p.run_summary_after_event?.usage_report_count, summaryRevision: p.run_summary_after_event?.revision, contract });
}
console.log(JSON.stringify({ exports: Object.keys(pres).filter((k) => /Schema$/.test(k) && /message|Message/.test(k)).slice(0, 20), out }, null, 1));
