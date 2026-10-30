/**
 * Live AutoByteus (native runtime) compaction on the agent's own model with a cached summary request
 * (compaction-prompt-cache-reuse), run through the real studio server (HTTP GraphQL + agent WebSocket) as the desktop
 * app does: create a run, send messages, change Settings. The shared harness records every provider request body and
 * the provider-reported usage. Anthropic calls are sent with the strict preserved-thinking check (validation harness
 * only), so a kept thinking block under a changed request prefix fails with a 400 instead of being dropped silently.
 *
 * Compaction is placed the way a user's Settings change places it: each case starts with a high trigger, and after two
 * turns Settings lowers it, sized from the observed prompt H: context-size override = the model's max output + 256 + 4H
 * and trigger ratio 0.2125, so the trigger sits at 0.85H with room for the planner's target. (An override at or below
 * the model's max output leaves no input budget and hangs the run, a pre-existing defect reported separately; a budget
 * too small for the history is refused as `target_unattainable`.) The core reads these settings on every LLM phase, so the third turn's first
 * (tool-calling) response crosses the trigger mid-turn; compaction is then pending and runs at the start of the fourth
 * turn, before its own request (`before_parent_request`), on the agent's settled history.
 *
 * Cases (each needs its provider key; a skip is not a pass):
 *   CCR-E2E-001  Opus 5.5 (strict): the summary request is the agent's previous request (system, tools, settings,
 *                messages unchanged, kept thinking included) plus one instruction; its cache read is >= 90 % of its
 *                input; the summary is accepted (compaction completed); the turn continues on the compacted context; the
 *                Token Meter feed has the `autobyteus_compaction` call with the provider's cache read, and the run summary
 *                equals the provider usage (AC-001 live, AC-002, AC-007, QR-001)
 *   CCR-E2E-002  Opus 5.5 (strict): Settings → default image model changes the tools after the thinking tool cycles and
 *                before the compaction turn; the summary request carries no thinking and the new tools, and is accepted
 *                (no 400); the turn continues (AC-006, REQ-006)
 *   CCR-E2E-003  Gemini (Vertex Express): Gemini's catalog mode is the transcript summary (REQ-002), so compaction goes
 *                straight to the transcript request on the agent's own model and succeeds; the run continues, the meter
 *                has the compaction call (AC-008); every agent request carries the agent's own system prompt and every
 *                summary request the summary prompt (AC-010); the note never echoes the cached instruction (F-4)
 *   CCR-E2E-004  Opus 5.5 (strict) with a small configured output limit (max_tokens 4096 < 16384): the cached summary
 *                request carries the raised, fitted limit L_eff = max(R, min(L, room)) (REQ-009/SR-010, here 16384),
 *                still reads the conversation from the prompt cache (>= 90 %) and is accepted; the agent's own requests
 *                keep max_tokens 4096 (AC-011 on Anthropic)
 *
 * Gate and environment: RUN_COMPACTION_CACHE_E2E=1, with the Anthropic and Vertex Express keys in the test vault
 * (AUTOBYTEUS_TEST_VAULT, see TESTING.md#test-vault); run with a clean `env -i` so no live-app variable leaks in.
 * A case whose key is missing is reported as a skip. From `autobyteus-server-ts`:
 *   env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault RUN_COMPACTION_CACHE_E2E=1 ./node_modules/.bin/vitest run tests/e2e/runtime/autobyteus-compaction-cache-reuse-live.e2e.test.ts --no-watch
 * Optional: COMPACTION_CACHE_E2E_ANTHROPIC_MODEL (default claude-opus-5-5; any cached-mode Anthropic catalog model),
 * COMPACTION_CACHE_E2E_GEMINI_MODEL (default gemini-3.8-flash), COMPACTION_CACHE_E2E_STEP_TIMEOUT_MS (default 600000).
 * COMPACTION_CACHE_E2E_EVIDENCE_DIR keeps case results, call summaries and full request bodies. The compaction settings
 * are predefined and cannot be deleted, so every case sets its own trigger at its start instead of relying on cleanup.
 * Cost: small (about 30 short Opus calls, mostly cache reads; a few Gemini calls).
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, type TestContext } from "vitest";
import {
  NativeRuntimeLiveHarness,
  isRecord,
  requestMessages,
  summaryRequestMode,
  type CapturedCall,
  type Json,
  type RunSession,
  type WsMessage,
} from "../helpers/native-runtime-live-harness.js";
import { localImportSecretIdForAlias } from "../../../src/secret-management/provisioning/local-import-credential-alias-registry.js";
import { requireLiveCapability } from "../../../../test-support/test-vault/live-server-vault.js";
import { COMPACTION_SUMMARY_HEADINGS } from "autobyteus-ts/memory/compaction/compaction-summary-parser.js";
import { COMPACTION_SUMMARY_INSTRUCTION, COMPACTION_SUMMARY_PROMPT } from "autobyteus-ts/memory/compaction/compaction-summary-prompt.js";
import { DEFAULT_IMAGE_GENERATION_MODEL_SETTING_KEY } from "../../../src/config/media-default-model-settings.js";

const ENABLED = process.env.RUN_COMPACTION_CACHE_E2E === "1";
const describeLive = ENABLED ? describe : describe.skip;
/** Skips the case with its reason when the live vault lacks the key the importer alias names (never a pass). */
const requireKey = (context: TestContext, alias: string) =>
  requireLiveCapability(context, String(localImportSecretIdForAlias(alias)));
const STEP_TIMEOUT_MS = Number(process.env.COMPACTION_CACHE_E2E_STEP_TIMEOUT_MS || 600_000);
/** A case runs several turns; each turn step is bounded by STEP_TIMEOUT_MS so a stall reports its recent frames. */
const CASE_TIMEOUT_MS = 4 * STEP_TIMEOUT_MS;
const EVIDENCE_DIR = process.env.COMPACTION_CACHE_E2E_EVIDENCE_DIR?.trim() || null;
const ANTHROPIC_MODEL = process.env.COMPACTION_CACHE_E2E_ANTHROPIC_MODEL?.trim() || "claude-opus-5-5";
const GEMINI_MODEL = process.env.COMPACTION_CACHE_E2E_GEMINI_MODEL?.trim() || "gemini-3.8-flash";
/**
 * Settings → Compaction values sized from the run's own history so that the next request crosses the trigger and the
 * compaction plan is attainable: with the last observed prompt H (provider-reported input of the last call), an input
 * budget of 4H and ratio 0.2125 put the trigger at 0.85H and the post-compaction target at ~0.77H, which holds the
 * system prompt, tools, the 8K replacement reserve and the protected recent messages. The context override also holds the
 * model's reserved output (its max output tokens + 256 safety margin). (Fixed small values either leave no positive input
 * budget, where planning fails and the run never returns to idle — a pre-existing defect reported separately — or end in
 * `target_unattainable`, a correct block.)
 */
/**
 * Each case first sets these explicit starting values (no compaction while the history is built). The compaction settings
 * are predefined and cannot be deleted, so an earlier case's lowered values would otherwise stay in effect.
 */
const highTrigger = (maxOutputTokens: number | null): Record<string, string> => ({
  AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE: String((maxOutputTokens ?? 8192) + 256 + 800_000),
  AUTOBYTEUS_COMPACTION_TRIGGER_RATIO: "0.95",
});
const lowTrigger = (maxOutputTokens: number | null, observedPrompt: number): Record<string, string> => ({
  AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE: String((maxOutputTokens ?? 8192) + 256 + 4 * observedPrompt),
  AUTOBYTEUS_COMPACTION_TRIGGER_RATIO: "0.2125",
});
const observedPrompt = (calls: CapturedCall[]): number => calls.filter((call) => call.usage).at(-1)?.usage?.inputTotal ?? 0;
const CHANGED_IMAGE_MODEL = "imagen-4";
const AUDIT = "After each file, carefully check whether any component depends on itself directly or through components "
  + "seen in earlier files, and keep a running list of such cycles.";
const chunkFiles = (): Record<string, string> => Object.fromEntries(Array.from({ length: 30 }, (_, index) => {
  const n = index + 1;
  const id = String(n).padStart(2, "0");
  const lines = Array.from({ length: 24 }, (_, i) =>
    `Section ${i + 1}: component C${(n * 7 + i) % 23} depends on C${(n * 11 + i) % 19} with latency budget ${(n * 13 + i * 5) % 97} ms.`);
  return [`chunk-${id}.txt`, [`CODE: K${id}-${(n * 37) % 101}`, ...lines].join("\n")];
}));

/** Anthropic body helpers (the strict cases run on Anthropic). */
const thinkingBlocks = (body: Json): number => (Array.isArray(body.messages) ? body.messages as Json[] : [])
  .filter((message) => message.role === "assistant" && Array.isArray(message.content))
  .reduce((sum, message) => sum + (message.content as Json[]).filter((block) => block.type === "thinking" || block.type === "redacted_thinking").length, 0);
const withoutCacheControl = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(withoutCacheControl);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => key !== "cache_control").map(([key, entry]) => [key, withoutCacheControl(entry)]));
};
/** (role, block) entries, the unit Anthropic's prefix cache matches on. */
const blockEntries = (body: Json): string[] => (Array.isArray(body.messages) ? body.messages as Json[] : []).flatMap((message) => {
  const content = typeof message.content === "string" ? [{ type: "text", text: message.content }] : Array.isArray(message.content) ? message.content : [];
  return (content as unknown[]).map((block) => JSON.stringify([message.role, withoutCacheControl(block)]));
});
const isPrefixOf = (shorter: string[], longer: string[]) => shorter.length <= longer.length && shorter.every((entry, index) => entry === longer[index]);
const cacheShare = (call: CapturedCall) => call.usage && call.usage.inputTotal > 0 ? call.usage.cacheRead / call.usage.inputTotal : null;
const compactionFrames = (frames: WsMessage[]) => frames.filter((frame) => frame.type.startsWith("COMPACTION_"));
const compactionUsageFrames = (frames: WsMessage[]) => frames.filter((frame) => frame.type === "TOKEN_USAGE_UPDATED" && frame.payload.ingestion_kind === "autobyteus_compaction");
const num = (value: unknown) => typeof value === "number" ? value : null;
/**
 * The strict preserved-thinking check is a sub-field of the request's `thinking` parameter, so it applies exactly when the
 * request carries one (Opus does; a model that thinks without a `thinking` parameter, e.g. Sonnet 5, cannot be checked).
 */
const expectStrictWhenThinking = (call: CapturedCall) =>
  expect(call.strictInjected, `call ${call.index}: strict check applied iff the request has a thinking parameter`).toBe(isRecord(call.body.thinking));
/**
 * The instruction's opening sentence. The note is the agent's memory of the conversation; the request to write it is
 * not part of that conversation, so no agent request after compaction may carry it (e.g. recorded as an open request).
 */
const INSTRUCTION_OPENING = COMPACTION_SUMMARY_INSTRUCTION.trim().split(". ")[0]!;
const assertNoInstructionEcho = (calls: CapturedCall[], label: string) => {
  expect(INSTRUCTION_OPENING.length).toBeGreaterThan(20);
  for (const call of calls) {
    expect(JSON.stringify(call.body).includes(INSTRUCTION_OPENING),
      `${label}: agent request ${call.index} after compaction carries the summary instruction (recorded in the note)`).toBe(false);
  }
};
/** Gemini wire body: the request's system prompt (`systemInstruction` parts text), or null when the request has none. */
const geminiSystemText = (body: Json): string | null => {
  const instruction = body.systemInstruction;
  if (typeof instruction === "string") return instruction;
  if (!isRecord(instruction) || !Array.isArray(instruction.parts)) return null;
  return (instruction.parts as Json[]).map((part) => String(part.text ?? "")).join("");
};

describeLive("AutoByteus native compaction on the agent's own model with a cached summary request (live)", () => {
  const harness = new NativeRuntimeLiveHarness({ evidenceDir: EVIDENCE_DIR, stepTimeoutMs: STEP_TIMEOUT_MS, tempPrefix: "compaction-cache-e2e",
    strictAnthropicThinking: true, writeBodies: true });
  let auditorDefinitionId = "";
  let chatDefinitionId = "";
  const changedSettings = new Set<string>();

  const setSetting = async (key: string, value: string) => { changedSettings.add(key); return harness.updateServerSetting(key, value); };
  const clearSettings = async () => { for (const key of changedSettings) await harness.deleteServerSetting(key); changedSettings.clear(); };
  const runSummary = async (runId: string) => (await harness.gql<{ getAgentRunTokenUsageSummary: Json }>(
    `query($id: String!) { getAgentRunTokenUsageSummary(runId: $id) { usageReportCount standardInputTokens cacheReadInputTokens
      cacheCreationInputTokens outputTokens estimatedApiTotalCost apiCostStatus cacheState } }`, { id: runId })).getAgentRunTokenUsageSummary;
  /** One user send: ends at TURN_COMPLETED (then idle), or fails fast on a blocked compaction or an error status. */
  const runTurn = async (session: RunSession, phase: string, content: string): Promise<{ error: WsMessage | null; frames: WsMessage[] }> => {
    const from = session.frames.length;
    const ended = await harness.sendAndWaitFor(session, phase, content, (frame) => frame.type === "TURN_COMPLETED" || frame.type === "COMPACTION_BLOCKED"
      || frame.type === "ERROR" || (frame.type === "AGENT_STATUS" && frame.payload.status === "error"), `${phase} outcome`);
    if (ended.some((frame) => frame.type === "TURN_COMPLETED")) {
      await harness.waitFor(session, from, (frame) => frame.type === "AGENT_STATUS" && frame.payload.status === "idle", `${phase} idle`);
    }
    await harness.settleCalls();
    const frames = session.frames.slice(from);
    const failure = frames.find((frame) => frame.type === "ERROR" || frame.type === "COMPACTION_BLOCKED"
      || (frame.type === "COMPACTION_STATUS" && frame.payload.phase === "failed")) ?? null;
    return { error: failure, frames };
  };
  const turnOk = (label: string, result: { error: WsMessage | null; frames: WsMessage[] }) => {
    expect(result.error, `${label}: ${JSON.stringify(result.error?.payload)}`).toBeNull();
    expect(result.frames.some((frame) => frame.type === "TURN_COMPLETED"), `${label} completed`).toBe(true);
  };

  beforeAll(async () => {
    await harness.start();
    auditorDefinitionId = await harness.createDefinition("compaction-cache-auditor", [
      "You are a careful engineering agent working through workspace files with tools.",
      "When auditing dependency data, reason carefully about what you have read before every next read_file call.",
      "Call read_file exactly once per file, one tool call per response.",
      "Never call generate_image unless the user explicitly asks for an image.",
      "After the last requested file, reply in one short sentence with exactly what was asked.",
    ].join("\n"), ["read_file", "generate_image"]);
    chatDefinitionId = await harness.createDefinition("compaction-cache-chat", "You are a helpful assistant. Answer the user's request directly.", []);
  }, 300_000);

  afterEach(async (context) => { await clearSettings(); await harness.finishCase(context); });
  afterAll(async () => { await clearSettings(); await harness.stop(); }, 180_000);

  /**
   * T1 and T2 build a thinking tool-cycle history above ~17.6K tokens under the default settings; Settings then lowers the
   * trigger; T3's first (tool-call) response crosses it, so compaction becomes pending and is not run inside the turn.
   */
  let triggerSettings: Record<string, string> = {};
  /** The agent's resolved output limit R in the current case (configured max_tokens, else the model maximum). */
  let agentOutputLimit: number | null = null;
  let anthropicModelMaxOutput: number | null = null;
  const runToPendingCompaction = async (prefix: string, maxTokens?: number): Promise<RunSession> => {
    const model = await harness.catalogModel("ANTHROPIC", ANTHROPIC_MODEL);
    anthropicModelMaxOutput = model.maxOutputTokens;
    agentOutputLimit = maxTokens ?? model.maxOutputTokens;
    const workspace = await harness.makeWorkspace(chunkFiles());
    for (const [key, value] of Object.entries(highTrigger(agentOutputLimit))) await setSetting(key, value);
    const session = await harness.startRun(auditorDefinitionId, model.modelIdentifier,
      { ...(maxTokens ? { max_tokens: maxTokens } : {}) }, workspace);
    turnOk(`${prefix}-T1`, await runTurn(session, `${prefix}-T1`, `Audit chunk-01.txt through chunk-12.txt using the read_file tool, one file per tool call, in order. ${AUDIT} At the end, reply with the cycles in one sentence.`));
    turnOk(`${prefix}-T2`, await runTurn(session, `${prefix}-T2`, `Continue the audit with chunk-13.txt through chunk-20.txt using the read_file tool, one file per tool call, in order. ${AUDIT} At the end, reply with any new cycles in one sentence.`));
    triggerSettings = lowTrigger(agentOutputLimit, observedPrompt(harness.callsOf(`${prefix}-T2`)));
    for (const [key, value] of Object.entries(triggerSettings)) await setSetting(key, value);
    turnOk(`${prefix}-T3`, await runTurn(session, `${prefix}-T3`, `Continue the audit with chunk-21.txt and chunk-22.txt using the read_file tool, one file per tool call. ${AUDIT} At the end, reply with any new cycles in one sentence.`));
    return session;
  };
  const T4_MESSAGE = `Continue the audit with chunk-23.txt and chunk-24.txt using the read_file tool, one file per tool call. ${AUDIT} At the end, reply with any new cycles in one sentence.`;
  /** Summary calls and the agent request they extend (the last agent call before the first summary call). */
  const compactionView = (phases: string[]) => {
    const calls = phases.flatMap((phase) => harness.callsOf(phase));
    const summaryCalls = calls.filter((call) => summaryRequestMode(call.body) !== null);
    const first = summaryCalls[0];
    const agentCalls = harness.calls.filter((call) => summaryRequestMode(call.body) === null && call.phase !== "setup");
    const lastBefore = first ? agentCalls.filter((call) => call.index < first.index).at(-1) : undefined;
    const after = first ? calls.filter((call) => call.index > first.index && summaryRequestMode(call.body) === null) : [];
    return { summaryCalls, first, lastBefore, after };
  };

  it("CCR-E2E-001: the cached-mode Anthropic model (default Opus 5.5; COMPACTION_CACHE_E2E_ANTHROPIC_MODEL) compacts with a cached summary request (>= 90 % cache read), continues, and meters the call", async (testContext) => {
    await requireKey(testContext, "ANTHROPIC_API_KEY");
    const session = await runToPendingCompaction("CCR1");
    const t3Summaries = harness.callsOf("CCR1-T3").filter((call) => summaryRequestMode(call.body) !== null);
    const t4 = await runTurn(session, "CCR1-T4", T4_MESSAGE);
    const { summaryCalls, first: cached, lastBefore, after } = compactionView(["CCR1-T3", "CCR1-T4"]);
    const allFrames = session.frames;
    const statuses = compactionFrames(allFrames);
    const meterFrames = compactionUsageFrames(allFrames);
    const summary = await runSummary(session.runId);
    const okCalls = harness.calls.filter((call) => call.phase.startsWith("CCR1-") && call.status === 200 && call.usage);
    harness.recordCase("CCR-E2E-001", {
      triggerSettings, compactionSite: t3Summaries.length ? "after_final_response (T3)" : "before_parent_request (T4)",
      modes: summaryCalls.map((call) => summaryRequestMode(call.body)),
      summaryCalls: summaryCalls.map((call) => ({ ...harness.summarize(call), phase: call.phase, cacheShare: cacheShare(call), thinkingBlocks: thinkingBlocks(call.body) })),
      lastAgentCallBefore: lastBefore ? { ...harness.summarize(lastBefore), thinkingBlocks: thinkingBlocks(lastBefore.body) } : null,
      firstAgentCallAfter: after[0] ? harness.summarize(after[0]) : null,
      compactionFrames: statuses.map((frame) => ({ type: frame.type, ...frame.payload })),
      meterFrames: meterFrames.map((frame) => frame.payload), runSummary: summary, providerCalls: okCalls.length,
    });
    turnOk("T4", t4);
    expect(cached, "a summary request was sent").toBeDefined();
    expect(lastBefore, "the agent request the summary extends").toBeDefined();
    expect(summaryRequestMode(cached!.body), "first attempt is the cached summary request").toBe("cached");
    expect(cached!.status, String(cached!.errorBody)).toBe(200);
    expectStrictWhenThinking(cached!);
    // AC-001 live: the agent's previous request (kept thinking included), unchanged, plus one appended instruction.
    expect(thinkingBlocks(lastBefore!.body), "the history holds kept thinking").toBeGreaterThan(0);
    expect(JSON.stringify(withoutCacheControl(cached!.body.system))).toBe(JSON.stringify(withoutCacheControl(lastBefore!.body.system)));
    expect(JSON.stringify(cached!.body.tools)).toBe(JSON.stringify(lastBefore!.body.tools));
    for (const key of ["model", "max_tokens", "thinking", "cache_control"]) expect(cached!.body[key], key).toEqual(lastBefore!.body[key]);
    expect(isPrefixOf(blockEntries(lastBefore!.body), blockEntries(cached!.body)), "summary request extends the previous request").toBe(true);
    expect(requestMessages(cached!.body).at(-1)!.role).toBe("user");
    expect(summaryRequestMode({ messages: [(cached!.body.messages as Json[]).at(-1)] }), "instruction is the last message").toBe("cached");
    // AC-002 / QR-001.
    expect(cacheShare(cached!), JSON.stringify(cached!.usage)).toBeGreaterThanOrEqual(0.9);
    expect(statuses.some((frame) => frame.payload.phase === "completed"), "compaction completed (summary parsed and committed)").toBe(true);
    expect(summaryCalls.length, "the cached summary was accepted on its first attempt").toBe(1);
    // The turn continues on the compacted context.
    harness.assertAccepted(after, "agent calls after compaction");
    const afterBody = JSON.stringify(after[0]!.body);
    for (const heading of COMPACTION_SUMMARY_HEADINGS) {
      expect(afterBody, `the next agent request carries the summary (## ${heading})`).toContain(`## ${heading}`);
    }
    expect(blockEntries(after[0]!.body).length, "the compacted context is smaller").toBeLessThan(blockEntries(lastBefore!.body).length);
    assertNoInstructionEcho(after, "CCR-E2E-001");
    // AC-007: the compaction call is metered with the provider's cache read; the run summary equals the provider usage.
    expect(meterFrames.length).toBe(1);
    expect(num(meterFrames[0]!.payload.cache_read_input_tokens), "meter cache read = provider cache read").toBe(cached!.usage!.cacheRead);
    const providerRead = okCalls.reduce((sum, call) => sum + call.usage!.cacheRead, 0);
    expect(summary.usageReportCount, "every provider call (agent + compaction) is metered").toBe(okCalls.length);
    expect(summary.cacheReadInputTokens).toBe(providerRead);
    await harness.stopRun(session);
  }, CASE_TIMEOUT_MS);

  it("CCR-E2E-002: tools changed in Settings before the compaction turn: the summary request carries no thinking and is accepted (strict)", async (testContext) => {
    await requireKey(testContext, "ANTHROPIC_API_KEY");
    const session = await runToPendingCompaction("CCR2");
    const t3Summaries = harness.callsOf("CCR2-T3").filter((call) => summaryRequestMode(call.body) !== null);
    const lastT3 = harness.callsOf("CCR2-T3").at(-1)!;
    const settingMessage = await setSetting(DEFAULT_IMAGE_GENERATION_MODEL_SETTING_KEY, CHANGED_IMAGE_MODEL);
    const t4 = await runTurn(session, "CCR2-T4", T4_MESSAGE);
    const t4Calls = harness.callsOf("CCR2-T4");
    const summaryCalls = t4Calls.filter((call) => summaryRequestMode(call.body) !== null);
    const agentCalls = t4Calls.filter((call) => summaryRequestMode(call.body) === null);
    const statuses = compactionFrames(t4.frames);
    harness.recordCase("CCR-E2E-002", {
      settingMessage, compactionInT3: t3Summaries.length, thinkingBlocksInLastRequestBefore: thinkingBlocks(lastT3.body),
      summaryCalls: summaryCalls.map((call) => ({ ...harness.summarize(call), thinkingBlocks: thinkingBlocks(call.body), cacheShare: cacheShare(call) })),
      toolsChanged: summaryCalls[0] ? JSON.stringify(summaryCalls[0].body.tools) !== JSON.stringify(lastT3.body.tools) : null,
      compactionFrames: statuses.map((frame) => ({ type: frame.type, ...frame.payload })),
      agentCalls: agentCalls.map((call) => harness.summarize(call)),
    });
    expect(t3Summaries.length, "compaction stayed pending through T3 (the tools change happens before it runs)").toBe(0);
    expect(thinkingBlocks(lastT3.body), "the history held thinking before the change").toBeGreaterThan(0);
    turnOk("T4", t4);
    expect(summaryCalls.length, "a summary request was sent").toBeGreaterThan(0);
    for (const call of summaryCalls) {
      expect(call.status, String(call.errorBody)).toBe(200);
      expectStrictWhenThinking(call);
      expect(thinkingBlocks(call.body), `summary call ${call.index}: prefix-bound reasoning removed before the fork`).toBe(0);
      expect(JSON.stringify(call.body.tools)).toContain(CHANGED_IMAGE_MODEL);
    }
    expect(JSON.stringify(summaryCalls[0]!.body.tools), "tools changed by the setting").not.toBe(JSON.stringify(lastT3.body.tools));
    expect(statuses.some((frame) => frame.payload.phase === "completed"), "compaction completed").toBe(true);
    harness.assertAccepted(agentCalls, "T4 agent calls");
    assertNoInstructionEcho(agentCalls.filter((call) => call.index > summaryCalls[0]!.index), "CCR-E2E-002");
    await harness.stopRun(session);
  }, CASE_TIMEOUT_MS);

  it("CCR-E2E-003: Gemini (transcript summary mode) compacts on its own model, continues, and meters the call", async (testContext) => {
    await requireKey(testContext, "VERTEX_AI_API_KEY");
    await harness.gql("mutation($mode: GeminiSetupMode!) { useGeminiMode(mode: $mode) { setup { activeMode } } }", { mode: "VERTEX_EXPRESS" });
    const model = await harness.catalogModel("GEMINI", GEMINI_MODEL);
    for (const [key, value] of Object.entries(highTrigger(model.maxOutputTokens))) await setSetting(key, value);
    const session: RunSession = await harness.startRun(chatDefinitionId, model.modelIdentifier, { extra_params: { thinking_level: "low" } });
    const notes = (from: number) => Array.from({ length: 300 }, (_, index) =>
      `Note ${from + index}: warehouse bin ${from + index} holds ${(from + index) * 7} units of part P-${1000 + from + index}.`).join("\n");
    for (const [index, from] of [1, 301, 601, 901].entries()) {
      turnOk(`T${index + 1}`, await runTurn(session, `CCR3-T${index + 1}`, `${notes(from)}\n\nRemember these warehouse notes. Reply with only the word ok.`));
    }
    for (const [key, value] of Object.entries(lowTrigger(model.maxOutputTokens, observedPrompt(harness.callsOf("CCR3-T4"))))) await setSetting(key, value);
    // The next (final) response crosses the trigger, so compaction runs right after it (`after_final_response`); the
    // question after that checks that the agent still knows the facts on the compacted context.
    turnOk("T5", await runTurn(session, "CCR3-T5", "Got everything? Reply with only the word ok."));
    const t3 = await runTurn(session, "CCR3-T6", "How many units does warehouse bin 700 hold? Answer with the number only.");
    const t3Calls = harness.calls.filter((call) => call.phase.startsWith("CCR3-"));
    const summaryCalls = t3Calls.filter((call) => summaryRequestMode(call.body) !== null);
    const agentCalls = t3Calls.filter((call) => summaryRequestMode(call.body) === null);
    const statuses = compactionFrames(session.frames);
    const meterFrames = compactionUsageFrames(session.frames);
    const answer = t3.frames.filter((frame) => frame.type === "SEGMENT_CONTENT").map((frame) => String(frame.payload.delta ?? "")).join("");
    harness.recordCase("CCR-E2E-003", {
      modes: summaryCalls.map((call) => summaryRequestMode(call.body)),
      summaryCalls: summaryCalls.map((call) => ({ ...harness.summarize(call), cacheShare: cacheShare(call),
        mode: summaryRequestMode(call.body), systemInstruction: geminiSystemText(call.body)?.slice(0, 120) ?? null })),
      agentSystemInstructions: [...new Set(agentCalls.map((call) => geminiSystemText(call.body)))].map((text) => text?.slice(0, 200) ?? null),
      compactionFrames: statuses.map((frame) => ({ type: frame.type, ...frame.payload })),
      meterFrames: meterFrames.map((frame) => frame.payload), agentCalls: agentCalls.map((call) => harness.summarize(call)), answer: answer.slice(0, 200),
    });
    turnOk("T6", t3);
    expect(answer, "the agent still knows the facts after compaction").toContain("4900");
    expect(summaryCalls.length, "a summary request was sent").toBeGreaterThan(0);
    // REQ-002: Gemini's catalog entry selects the transcript summary, so no cached summary request is sent.
    expect(summaryCalls.map((call) => summaryRequestMode(call.body)), "Gemini uses only the transcript summary request").toEqual(summaryCalls.map(() => "transcript"));
    expect(statuses.some((frame) => frame.payload.phase === "completed"), "compaction completed").toBe(true);
    harness.assertAccepted(agentCalls, "T3 agent calls");
    expect(meterFrames.length, "compaction calls are metered").toBe(summaryCalls.filter((call) => call.status === 200).length);
    // AC-010: Gemini takes its system prompt from the request's leading SYSTEM message(s). A normal agent request carries
    // the agent's own system prompt, unchanged across the run; the cached summary request extends that same request;
    // a transcript fallback request (if one is needed) carries the summary prompt instead.
    const agentSystem = new Set(agentCalls.map((call) => geminiSystemText(call.body)));
    expect(agentSystem.size, "every agent request carries the same system prompt").toBe(1);
    const agentSystemText = [...agentSystem][0];
    expect(agentSystemText, "agent requests carry the agent's system prompt").toContain("You are a helpful assistant.");
    expect(agentSystemText).not.toContain(COMPACTION_SUMMARY_PROMPT.split("\n")[0]);
    for (const call of summaryCalls) {
      const expected = summaryRequestMode(call.body) === "cached" ? agentSystemText : COMPACTION_SUMMARY_PROMPT;
      expect(geminiSystemText(call.body), `summary call ${call.index} (${summaryRequestMode(call.body)}) system prompt`).toBe(expected);
    }
    assertNoInstructionEcho(agentCalls.filter((call) => call.index > summaryCalls[0]!.index), "CCR-E2E-003");
    await harness.stopRun(session);
  }, CASE_TIMEOUT_MS);

  it("CCR-E2E-004: a small configured output limit: the cached summary request carries the fitted raised limit and still reads from the cache (strict)", async (testContext) => {
    await requireKey(testContext, "ANTHROPIC_API_KEY");
    const R = 4096;
    const session = await runToPendingCompaction("CCR4", R);
    const t4 = await runTurn(session, "CCR4-T4", T4_MESSAGE);
    const { summaryCalls, first: cached, lastBefore, after } = compactionView(["CCR4-T3", "CCR4-T4"]);
    const statuses = compactionFrames(session.frames);
    // REQ-009 / SR-010: L = max(R, min(16384, model max, floor(context / 4))); each request sends max(R, min(L, room)),
    // room = context - estimated input - safety margin (256). The context is the Settings override of this case.
    const context = Number(triggerSettings.AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE);
    const ceiling = Math.max(R, Math.min(16_384, anthropicModelMaxOutput ?? 16_384, Math.floor(context / 4)));
    const agentCalls = harness.calls.filter((call) => call.phase.startsWith("CCR4-") && summaryRequestMode(call.body) === null);
    harness.recordCase("CCR-E2E-004", {
      triggerSettings, agentOutputLimit: R, context, ceiling,
      summaryCalls: summaryCalls.map((call) => ({ ...harness.summarize(call), maxTokens: call.body.max_tokens, cacheShare: cacheShare(call), thinkingBlocks: thinkingBlocks(call.body) })),
      agentMaxTokens: [...new Set(agentCalls.map((call) => call.body.max_tokens))],
      compactionFrames: statuses.map((frame) => ({ type: frame.type, ...frame.payload })),
    });
    turnOk("T4", t4);
    expect(cached, "a summary request was sent").toBeDefined();
    expect(summaryRequestMode(cached!.body), "Anthropic catalog mode: cached summary request first").toBe("cached");
    expect(cached!.status, String(cached!.errorBody)).toBe(200);
    expectStrictWhenThinking(cached!);
    // The room left by this request is far above the ceiling (generous 1.5x allowance for the input estimate), so the
    // fitted limit is exactly the ceiling here.
    expect(context - Math.ceil(1.5 * cached!.usage!.inputTotal) - 256, "room exceeds the ceiling").toBeGreaterThan(ceiling);
    expect(cached!.body.max_tokens, "summary request carries the raised, fitted limit").toBe(ceiling);
    expect(ceiling).toBeGreaterThan(R);
    // The agent's own requests keep its configured limit, before and after compaction.
    expect(agentCalls.length).toBeGreaterThan(0);
    for (const call of agentCalls) expect(call.body.max_tokens, `agent call ${call.index}`).toBe(R);
    // The output limit is not part of the cached prefix: the summary still reads the conversation from the cache.
    expect(isPrefixOf(blockEntries(lastBefore!.body), blockEntries(cached!.body)), "summary request extends the previous request").toBe(true);
    expect(cacheShare(cached!), JSON.stringify(cached!.usage)).toBeGreaterThanOrEqual(0.9);
    expect(statuses.some((frame) => frame.payload.phase === "completed"), "compaction completed").toBe(true);
    expect(summaryCalls.length, "accepted on the first attempt").toBe(1);
    harness.assertAccepted(after, "agent calls after compaction");
    assertNoInstructionEcho(after, "CCR-E2E-004");
    await harness.stopRun(session);
  }, CASE_TIMEOUT_MS);
});
