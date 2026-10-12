/**
 * Live native (AutoByteus runtime) compaction and the Token Meter through the real Studio server (HTTP GraphQL + agent
 * WebSocket) on a real model (token-meter-accuracy AC-011, D-12, and the event order the D-13 "Compacted" note relies
 * on). Default provider DeepSeek (deepseek-v4-flash, a few cents per run); LM Studio works without credentials.
 *
 * Two data turns build the history under a high trigger; Settings then lower it from the observed prompt H (context
 * override = the model's max output + 256 + 4H, trigger ratio 0.2125, so the trigger sits at 0.85H), as the upstream
 * compaction-cache-reuse suite places it. A further short turn crosses the trigger, so compaction runs on the agent's
 * own model. Expected on the live stream and the persisted summary:
 *   - the `autobyteus_compaction` summary call is one model call; its tokens and cost go into the totals;
 *   - it carries no reading, so "Latest prompt" keeps the pre-compaction value (D-12, unchanged D-4 rule);
 *   - its usage reaches the meter before COMPACTION_STATUS `completed`, so the completed compaction marks the
 *     run after it; only the run's next live model call clears the note (D-13, SR-014);
 *   - the agent's next call reports a smaller reading.
 *
 * Gate: RUN_NATIVE_COMPACTION_METER_E2E=1. Provider: NATIVE_COMPACTION_METER_E2E_PROVIDER = DEEPSEEK (default; needs
 * DEEPSEEK_API_KEY, saved into the test-owned vault as a credential alias) or LMSTUDIO (a reachable LM Studio server).
 * Run from `autobyteus-server-ts` with a clean environment so only the chosen key reaches the test vault:
 *   env -i PATH="$PATH" HOME="$(mktemp -d)" TMPDIR="$TMPDIR" RUN_NATIVE_COMPACTION_METER_E2E=1 DEEPSEEK_API_KEY=<key> ./node_modules/.bin/vitest run tests/e2e/runtime/autobyteus-compaction-token-reading-live.e2e.test.ts --no-watch
 * Optional: NATIVE_COMPACTION_METER_E2E_MODEL (default deepseek-v4-flash, or qwen/qwen3.8-27b for LMSTUDIO),
 * NATIVE_COMPACTION_METER_E2E_STEP_TIMEOUT_MS (default 900000), NATIVE_COMPACTION_METER_E2E_EVIDENCE_DIR.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NativeRuntimeLiveHarness, type WsMessage } from "../helpers/native-runtime-live-harness.js";

const PROVIDER = process.env.NATIVE_COMPACTION_METER_E2E_PROVIDER?.trim().toUpperCase() || "DEEPSEEK";
const MODEL = process.env.NATIVE_COMPACTION_METER_E2E_MODEL?.trim()
  || (PROVIDER === "LMSTUDIO" ? "qwen/qwen3.8-27b" : "deepseek-v4-flash");
const STEP_TIMEOUT_MS = Number(process.env.NATIVE_COMPACTION_METER_E2E_STEP_TIMEOUT_MS || 900_000);
const ENABLED = process.env.RUN_NATIVE_COMPACTION_METER_E2E === "1"
  && (PROVIDER !== "DEEPSEEK" || Boolean(process.env.DEEPSEEK_API_KEY?.trim()));
const describeLive = ENABLED ? describe : describe.skip;

const dataTurn = (label: string) => `Data dump ${label}. Do not analyze it. Reply with exactly: OK ${label}\n` +
  Array.from({ length: 320 }, (_, i) =>
    `Record ${label}-${i}: the quick brown fox ${i * 7} jumps over lazy dog ${i * 13}; checksum ${(i * 2654435761) % 1000003}.`).join("\n");
const usageFrames = (frames: WsMessage[]) => frames.filter((frame) => frame.type === "TOKEN_USAGE_UPDATED");
const summaryOf = (frame: WsMessage) => frame.payload.run_summary_after_event as Record<string, any>;
const num = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;

describeLive(`Native compaction keeps the Token Meter reading until the next call (live, ${PROVIDER})`, () => {
  const harness = new NativeRuntimeLiveHarness({ evidenceDir: process.env.NATIVE_COMPACTION_METER_E2E_EVIDENCE_DIR?.trim() || null,
    stepTimeoutMs: STEP_TIMEOUT_MS, tempPrefix: "native-compaction-meter" });
  const changed = new Set<string>();
  const setSetting = async (key: string, value: string) => { changed.add(key); await harness.updateServerSetting(key, value); };

  beforeAll(async () => { await harness.start(); }, 180_000);
  afterAll(async () => {
    for (const key of changed) await harness.deleteServerSetting(key);
    await harness.stop();
  }, 180_000);

  it("counts the compaction summary call, keeps the reading through it and shows a smaller one on the next call", async () => {
    const model = await harness.catalogModel(PROVIDER, MODEL);
    const maxOutput = model.maxOutputTokens ?? 8192;
    await setSetting("AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE", String(maxOutput + 256 + 800_000));
    await setSetting("AUTOBYTEUS_COMPACTION_TRIGGER_RATIO", "0.95");
    const definitionId = await harness.createDefinition("native-compaction-meter",
      "You are a terse assistant. Follow the user's reply instructions exactly. Do not use tools.", []);
    const session = await harness.startRun(definitionId, model.modelIdentifier, null);

    for (const label of ["ONE", "TWO"]) {
      const turn = await harness.runTurn(session, `T-${label}`, dataTurn(label));
      expect(turn.error, JSON.stringify(turn.error?.payload ?? null)).toBeNull();
    }
    const lastAgentCall = usageFrames(session.frames).filter((frame) => frame.payload.ingestion_kind === "autobyteus_llm_phase").at(-1)!;
    const observedPrompt = num(lastAgentCall.payload.latest_prompt_tokens)!;
    expect(observedPrompt).toBeGreaterThan(0);
    await setSetting("AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE", String(maxOutput + 256 + 4 * observedPrompt));
    await setSetting("AUTOBYTEUS_COMPACTION_TRIGGER_RATIO", "0.2125");

    // Short turns until a compaction completes and an agent call follows it (normally two).
    const from = session.frames.length;
    const completedIndex = () => session.frames.findIndex((frame, index) => index >= from
      && frame.type === "COMPACTION_STATUS" && frame.payload.phase === "completed");
    for (const label of ["THREE", "FOUR", "FIVE"]) {
      const turn = await harness.runTurn(session, `T-${label}`, `Reply with exactly: OK ${label}`);
      expect(turn.error, JSON.stringify(turn.error?.payload ?? null)).toBeNull();
      const done = completedIndex();
      if (done >= 0 && usageFrames(session.frames.slice(done)).some((frame) => frame.payload.ingestion_kind === "autobyteus_llm_phase")) break;
    }

    const frames = session.frames.slice(from);
    const timeline = frames.filter((frame) => frame.type === "TOKEN_USAGE_UPDATED" || frame.type.startsWith("COMPACTION_"))
      .map((frame) => frame.type === "TOKEN_USAGE_UPDATED"
        ? { usage: frame.payload.ingestion_kind, call: frame.payload.reports_model_call, prompt: frame.payload.latest_prompt_tokens,
          tokens: frame.payload.accounting_total_tokens, count: summaryOf(frame)?.usage_report_count,
          revision: summaryOf(frame)?.revision, summaryPrompt: summaryOf(frame)?.latest_prompt_tokens, total: summaryOf(frame)?.total_tokens }
        : { [frame.type]: frame.payload.phase ?? frame.payload.status ?? null });
    console.info("[native compaction meter]", JSON.stringify({ model: model.modelIdentifier, maxOutput, observedPrompt, timeline }));

    const done = completedIndex();
    expect(done, "a native compaction completed").toBeGreaterThanOrEqual(0);
    const all = session.frames;
    const compactionCalls = usageFrames(all.slice(from)).filter((frame) => frame.payload.ingestion_kind === "autobyteus_compaction");
    expect(compactionCalls.length, "the compaction summary call reaches the meter").toBeGreaterThanOrEqual(1);
    const summaryCall = compactionCalls.at(-1)!;
    const summaryCallIndex = all.indexOf(summaryCall);
    // D-13 relies on this order: the summary call's save precedes the completed status.
    expect(summaryCallIndex, "compaction usage precedes COMPACTION_STATUS completed").toBeLessThan(done);
    const before = usageFrames(all.slice(0, summaryCallIndex)).at(-1)!;
    const beforeSummary = summaryOf(before);
    const afterSummary = summaryOf(summaryCall);
    // AC-011: one more model call with its tokens; the reading is kept (D-12).
    expect(summaryCall.payload.reports_model_call).toBe(true);
    expect(summaryCall.payload.latest_prompt_tokens).toBeNull();
    expect(num(summaryCall.payload.accounting_total_tokens)).toBeGreaterThan(0);
    expect(afterSummary).toMatchObject({
      usage_report_count: beforeSummary.usage_report_count + 1,
      revision: beforeSummary.revision + 1,
      total_tokens: beforeSummary.total_tokens + summaryCall.payload.accounting_total_tokens,
      latest_prompt_tokens: beforeSummary.latest_prompt_tokens,
      effective_context_window_tokens: beforeSummary.effective_context_window_tokens,
    });
    // No meter save lands between the summary call and the completed status, so the mark follows the summary call.
    const between = usageFrames(all.slice(summaryCallIndex + 1, done));
    expect(between, "no other meter save between the summary call and completed").toEqual([]);
    // The agent's next call is the run's next live model call (it clears the note) and reports a smaller reading.
    const next = usageFrames(all.slice(done)).find((frame) => frame.payload.ingestion_kind === "autobyteus_llm_phase");
    expect(next, "an agent call after the completed compaction").toBeTruthy();
    expect(num(next!.payload.latest_prompt_tokens)!).toBeLessThan(num(beforeSummary.latest_prompt_tokens)!);
    expect(summaryOf(next!).revision).toBeGreaterThan(afterSummary.revision);
    // The persisted summary is what the live stream ended with.
    const last = summaryOf(usageFrames(all).at(-1)!);
    const persisted = (await harness.gql<{ getAgentRunTokenUsageSummary: Record<string, unknown> }>(
      "query($id: String!) { getAgentRunTokenUsageSummary(runId: $id) { usageReportCount revision totalTokens latestPromptTokens } }",
      { id: session.runId })).getAgentRunTokenUsageSummary;
    expect(persisted).toMatchObject({ usageReportCount: last.usage_report_count, revision: last.revision,
      totalTokens: last.total_tokens, latestPromptTokens: last.latest_prompt_tokens });
  }, STEP_TIMEOUT_MS * 6);
});
