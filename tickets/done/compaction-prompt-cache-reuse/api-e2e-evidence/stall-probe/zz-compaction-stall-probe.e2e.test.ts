/**
 * Temporary API/E2E probe (compaction-prompt-cache-reuse): what happens when a turn's first call crosses a just-lowered
 * compaction trigger and that call is a tool call? Records every frame (digest) and the ERROR payloads.
 * Run with RUN_STALL_PROBE=1, DEEPSEEK_API_KEY, PROBE_OUT. Copy into autobyteus-server-ts/tests/e2e/runtime/ for the run only.
 */
import { writeFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, it } from "vitest";
import { NativeRuntimeLiveHarness, frameDigest, summaryRequestMode, type RunSession } from "../helpers/native-runtime-live-harness.js";

const run = process.env.RUN_STALL_PROBE === "1" ? describe : describe.skip;
const files = Object.fromEntries(Array.from({ length: 30 }, (_, index) => {
  const n = index + 1; const id = String(n).padStart(2, "0");
  return [`chunk-${id}.txt`, [`CODE: K${id}`, ...Array.from({ length: 24 }, (_, i) =>
    `Section ${i + 1}: component C${(n * 7 + i) % 23} depends on C${(n * 11 + i) % 19} with latency budget ${(n * 13 + i * 5) % 97} ms.`)].join("\n")];
}));

run("compaction stall probe", () => {
  const harness = new NativeRuntimeLiveHarness({ evidenceDir: null, stepTimeoutMs: 240_000, tempPrefix: "stall-probe" });
  const out: Record<string, unknown> = {};
  let session: RunSession | null = null;
  beforeAll(async () => { await harness.start(); }, 120_000);
  afterAll(async () => {
    out.frames = session ? frameDigest(session.frames) : null;
    out.errors = session ? session.frames.filter((f) => f.type === "ERROR" || f.type.startsWith("COMPACTION_")).map((f) => f.payload) : null;
    out.calls = harness.calls.map((c) => ({ ...harness.summarize(c), mode: summaryRequestMode(c.body) }));
    await writeFile(process.env.PROBE_OUT!, JSON.stringify(out, null, 2));
    for (const key of ["AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE", "AUTOBYTEUS_COMPACTION_TRIGGER_RATIO"]) await harness.deleteServerSetting(key);
    await harness.stop();
  }, 180_000);
  it("lowers the trigger between turns, then a tool-calling turn", async () => {
    const model = await harness.catalogModel("DEEPSEEK", "deepseek-v4-flash");
    const definition = await harness.createDefinition("stall-probe", "Use read_file to read files, one file per tool call. Reply briefly.", ["read_file"]);
    session = await harness.startRun(definition, model.modelIdentifier, { extra_params: { thinking_type: "disabled" } }, await harness.makeWorkspace(files));
    out.t1 = (await harness.runTurn(session, "T1", "Read chunk-01.txt through chunk-08.txt, one file per tool call, in order. Then reply with the CODE of the last file.")).error?.payload ?? "ok";
    await harness.updateServerSetting("AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE", "60000");
    await harness.updateServerSetting("AUTOBYTEUS_COMPACTION_TRIGGER_RATIO", process.env.PROBE_RATIO ?? "0.1");
    try {
      out.t2 = (await harness.runTurn(session, "T2", "Read chunk-09.txt and chunk-10.txt, one file per tool call. Then reply with the CODE of the last file.")).error?.payload ?? "ok";
    } catch (error) { out.t2 = `stalled: ${String(error).slice(0, 300)}`; }
  }, 900_000);
});
