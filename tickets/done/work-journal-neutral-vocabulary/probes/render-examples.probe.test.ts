// Probe (not part of any suite). Copy to autobyteus-server-ts/tests/agent-work-journal/ in a worktree with dependencies,
// run: vitest run tests/agent-work-journal/render-examples.probe.test.ts   (after: python3 -I probes/build_examples.py spec)
// Reads /tmp/xrr-spec.json, renders each runtime's synthetic records with the REAL renderer, writes /tmp/xrr-rendered.json.
// Uses the renderer's test fixtures only; touches no data directory.
import { it } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { RuntimeKind } from "../../src/runtime-management/runtime-kind-enum.js";
import { RecordBuilder, render } from "./journal-record-fixtures.js";

const KIND: Record<string, RuntimeKind> = {
  claude: RuntimeKind.CLAUDE_AGENT_SDK, codex: RuntimeKind.CODEX_APP_SERVER, antigravity: RuntimeKind.ANTIGRAVITY_CLI,
  grok: RuntimeKind.GROK_BUILD, autobyteus: RuntimeKind.AUTOBYTEUS,
};
const compact = (r: any) => JSON.stringify({ type: r.traceType, tool: r.toolName, args: r.toolArgs, result: r.toolResult, error: r.toolError, text: r.content },
  (_k, v) => (v === undefined || v === null ? undefined : v));

it("renders the synthetic examples", () => {
  const spec = JSON.parse(readFileSync("/tmp/xrr-spec.json", "utf8")) as Record<string, any[]>;
  const out: Record<string, unknown> = {};
  for (const [rt, cases] of Object.entries(spec)) {
    const b = new RecordBuilder();
    const records: any[] = [];
    const meta: { firstId: string; raw: string }[] = [];
    for (const c of cases) {
      let made: any[];
      if (c.k === "tool") { const call = b.call(c.tool, c.args); made = [call, b.result(call, c.res, c.err)]; }
      else if (c.k === "call_only") made = [b.call(c.tool, c.args)];
      else if (c.k === "result_only") made = [b.record("tool_result", { toolName: c.tool, toolCallId: "orphan_call", toolResult: c.res, toolError: null })];
      else made = [b.record(c.type, { content: c.text })];
      records.push(...made);
      meta.push({ firstId: made[0].id, raw: made.map(compact).join("\n") });
    }
    out[rt] = { md: render(KIND[rt], records).markdown, cases: meta };
  }
  writeFileSync("/tmp/xrr-rendered.json", JSON.stringify(out));
});
