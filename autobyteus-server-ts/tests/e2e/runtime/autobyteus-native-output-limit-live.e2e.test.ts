/**
 * Live AutoByteus (native runtime) output-limit E2E, run through the real studio server (HTTP GraphQL + agent
 * WebSocket) with real providers. It enters through the same commands the desktop app sends: create an agent run
 * (optionally with a configured `max_tokens` in its model config) and send a message. The shared harness
 * (`../helpers/native-runtime-live-harness.ts`) records every outgoing provider POST body exactly as production built it.
 *
 * Cases (each needs its provider key; a case whose key is missing is skipped, and a skip is not a pass):
 *   OLM-E2E-001  Anthropic, unconfigured: every streamed request carries the model's maximum output tokens
 *                (128000 for claude-opus-5-5), and one write_file call longer than 8,192 output tokens is written
 *                (the original "Anthropic content block is incomplete." failure) (AC-001, SCN-001)
 *   OLM-E2E-002  Anthropic, `max_tokens: 4096` configured on the run: sent unchanged (AC-001, BEH-004)
 *   OLM-E2E-003  Anthropic non-streaming call through the production construction path, unconfigured: 8192, accepted
 *                (AC-008, REQ-007)
 *   OLM-E2E-004..009  Unconfigured native agent turn per provider family: the request carries the catalog maximum
 *                under the provider's parameter name, or omits it for a model with no known limit (AC-013, RSK-004)
 *   OLM-E2E-010  DeepSeek and GLM, `max_tokens: 24` configured: sent as `max_tokens`, and the provider applies it
 *                (finish reason `length`) (RSK-004)
 * Output-limit recovery (Step 2) lives in `autobyteus-native-output-limit-recovery-live.e2e.test.ts`.
 *
 * Gate: RUN_NATIVE_OUTPUT_LIMIT_E2E=1 plus the provider keys (ANTHROPIC_API_KEY, OPENAI_API_KEY, DEEPSEEK_API_KEY,
 * GLM_API_KEY, VERTEX_AI_API_KEY, DASHSCOPE_API_KEY, GROK_API_KEY), saved into the test-owned database vault and never
 * logged. Run it with a clean environment (`env -i PATH=… HOME=… TMPDIR=…`) so no live-app variable leaks in; pass
 * QWEN_BASE_URL for a regional Qwen endpoint. Uses real credits: OLM-E2E-001 generates one ~30K-token Opus answer
 * (several minutes); every other case is a one-word answer.
 * Optional: OUTPUT_LIMIT_E2E_ANTHROPIC_MODEL (default claude-opus-5-5), OUTPUT_LIMIT_E2E_<PROVIDER>_MODEL,
 * OUTPUT_LIMIT_E2E_EVIDENCE_DIR (keeps per-call summaries and case results), OUTPUT_LIMIT_E2E_STEP_TIMEOUT_MS
 * (default 1200000).
 */
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { LLMUserMessage } from "autobyteus-ts/llm/user-message.js";
import { createAvailableLlm } from "../../../src/agent-execution/backends/autobyteus/available-llm-construction.js";
import { NativeRuntimeLiveHarness, type LimitFields } from "../helpers/native-runtime-live-harness.js";

const ENABLED = process.env.RUN_NATIVE_OUTPUT_LIMIT_E2E === "1";
const describeLive = ENABLED ? describe : describe.skip;
const hasKey = (alias: string) => Boolean(process.env[alias]?.trim());
const STEP_TIMEOUT_MS = Number(process.env.OUTPUT_LIMIT_E2E_STEP_TIMEOUT_MS || 1_200_000);
const EVIDENCE_DIR = process.env.OUTPUT_LIMIT_E2E_EVIDENCE_DIR?.trim() || null;
const ANTHROPIC_MODEL = process.env.OUTPUT_LIMIT_E2E_ANTHROPIC_MODEL?.trim() || "claude-opus-5-5";
/** The bounded non-streaming Claude default (REQ-007). */
const ANTHROPIC_NON_STREAMING_DEFAULT = 8192;
/** The streaming default before this change; the large write must exceed it in one response. */
const PREVIOUS_STREAMING_DEFAULT = 8192;
const LARGE_FILE = "large-output.txt";
const LARGE_FILE_LINES = 900;
const PONG = "Reply with the single word pong.";

type ProviderCase = {
  id: string;
  providerId: string;
  keyAlias: string;
  model: string;
  /** The field a known limit must be sent under; the others must be absent. */
  field: keyof LimitFields;
  geminiMode?: "VERTEX_EXPRESS";
};

const PROVIDER_CASES: ProviderCase[] = [
  { id: "OLM-E2E-004", providerId: "OPENAI", keyAlias: "OPENAI_API_KEY", model: process.env.OUTPUT_LIMIT_E2E_OPENAI_MODEL?.trim() || "gpt-5.4-mini", field: "max_output_tokens" },
  { id: "OLM-E2E-005", providerId: "DEEPSEEK", keyAlias: "DEEPSEEK_API_KEY", model: process.env.OUTPUT_LIMIT_E2E_DEEPSEEK_MODEL?.trim() || "deepseek-v4-flash", field: "max_tokens" },
  { id: "OLM-E2E-006", providerId: "GLM", keyAlias: "GLM_API_KEY", model: process.env.OUTPUT_LIMIT_E2E_GLM_MODEL?.trim() || "glm-5.3", field: "max_tokens" },
  { id: "OLM-E2E-007", providerId: "GEMINI", keyAlias: "VERTEX_AI_API_KEY", model: process.env.OUTPUT_LIMIT_E2E_GEMINI_MODEL?.trim() || "gemini-3.8-flash", field: "maxOutputTokens", geminiMode: "VERTEX_EXPRESS" },
  { id: "OLM-E2E-008", providerId: "QWEN", keyAlias: "DASHSCOPE_API_KEY", model: process.env.OUTPUT_LIMIT_E2E_QWEN_MODEL?.trim() || "qwen3.7-max", field: "max_completion_tokens" },
  { id: "OLM-E2E-009", providerId: "GROK", keyAlias: "GROK_API_KEY", model: process.env.OUTPUT_LIMIT_E2E_GROK_MODEL?.trim() || "grok-4.7", field: "max_completion_tokens" },
];

describeLive("AutoByteus native runtime output limits (live, wire-level)", () => {
  const harness = new NativeRuntimeLiveHarness({ evidenceDir: EVIDENCE_DIR, stepTimeoutMs: STEP_TIMEOUT_MS, tempPrefix: "output-limit-e2e" });
  let agentDefinitionId = "";
  let writerDefinitionId = "";

  beforeAll(async () => {
    await harness.start();
    agentDefinitionId = await harness.createDefinition("output-limit-e2e", "You are a concise assistant. Answer exactly what is asked.", []);
    writerDefinitionId = await harness.createDefinition("output-limit-e2e-writer", [
      "You are a file-writing agent. When asked to create a file, call write_file exactly once with the complete content.",
      "Never abbreviate, summarize or elide file content, and never use placeholders such as '...'.",
      "After the file is written, reply with the single word done.",
    ].join("\n"), ["write_file"]);
  }, 300_000);

  afterEach(async (context) => { await harness.finishCase(context); });
  afterAll(async () => { await harness.stop(); }, 180_000);

  it.skipIf(!hasKey("ANTHROPIC_API_KEY"))("OLM-E2E-001: Anthropic unconfigured streams the model maximum and writes a file longer than 8,192 output tokens in one call", async () => {
    const model = await harness.catalogModel("ANTHROPIC", ANTHROPIC_MODEL);
    expect(model.maxOutputTokens, "catalog maximum output tokens").not.toBeNull();
    if (ANTHROPIC_MODEL === "claude-opus-5-5") expect(model.maxOutputTokens).toBe(128_000);
    const session = await harness.startRun(writerDefinitionId, model.modelIdentifier, null);
    const { error } = await harness.runTurn(session, "OLM-001", [
      `Create the file ${LARGE_FILE} with write_file in one single call.`,
      `It must contain exactly ${LARGE_FILE_LINES} lines. Line N (for every N from 1 to ${LARGE_FILE_LINES}) is exactly:`,
      "\"Line N: this sentence belongs to the output-limit validation file and is written out in full with its own number N.\"",
      "Write every line in full, in order, with the real number in place of N, and no ellipsis, placeholder or omission.",
    ].join("\n"));
    const phaseCalls = harness.callsOf("OLM-001");
    const toolCall = phaseCalls.find((call) => call.stopSignals.includes("tool_use"));
    const filePath = path.join(session.workspaceRootPath, LARGE_FILE);
    const fileStat = await stat(filePath).catch(() => null);
    const lines = fileStat ? (await readFile(filePath, "utf-8")).split("\n").filter((line) => line.trim()).length : 0;
    harness.recordCase("OLM-E2E-001", {
      model: model.modelIdentifier, catalogMaxOutputTokens: model.maxOutputTokens, error: error?.payload ?? null,
      calls: phaseCalls.map((call) => harness.summarize(call)), toolCallOutputTokens: toolCall?.maxReportedOutputTokens ?? null,
      fileBytes: fileStat?.size ?? null, fileLines: lines,
    });
    expect(error, `ERROR frame: ${JSON.stringify(error?.payload)}`).toBeNull();
    harness.assertAccepted(phaseCalls, "OLM-001");
    for (const call of phaseCalls) {
      expect(call.stream, `call ${call.index} streamed`).toBe(true);
      harness.assertLimit(call, "max_tokens", model.maxOutputTokens, "OLM-001");
    }
    expect(toolCall, "a response that ended with tool_use").toBeTruthy();
    expect(toolCall!.maxReportedOutputTokens!, "the write_file response exceeded the previous 8,192 default").toBeGreaterThan(PREVIOUS_STREAMING_DEFAULT);
    expect(fileStat, `${LARGE_FILE} written`).not.toBeNull();
    // ~4 characters per token: the written content itself is larger than 8,192 tokens' worth of text.
    expect(fileStat!.size).toBeGreaterThan(PREVIOUS_STREAMING_DEFAULT * 4);
    await harness.stopRun(session);
  }, STEP_TIMEOUT_MS + 120_000);

  it.skipIf(!hasKey("ANTHROPIC_API_KEY"))("OLM-E2E-002: Anthropic run with max_tokens 4096 configured sends 4096 unchanged", async () => {
    const model = await harness.catalogModel("ANTHROPIC", ANTHROPIC_MODEL);
    const session = await harness.startRun(agentDefinitionId, model.modelIdentifier, { max_tokens: 4096 });
    const { error } = await harness.runTurn(session, "OLM-002", PONG);
    const phaseCalls = harness.callsOf("OLM-002");
    harness.recordCase("OLM-E2E-002", { model: model.modelIdentifier, error: error?.payload ?? null, calls: phaseCalls.map((call) => harness.summarize(call)) });
    expect(error, `ERROR frame: ${JSON.stringify(error?.payload)}`).toBeNull();
    harness.assertAccepted(phaseCalls, "OLM-002");
    for (const call of phaseCalls) harness.assertLimit(call, "max_tokens", 4096, "OLM-002");
    await harness.stopRun(session);
  }, STEP_TIMEOUT_MS);

  it.skipIf(!hasKey("ANTHROPIC_API_KEY"))("OLM-E2E-003: Anthropic non-streaming call without a configured limit sends the bounded 8192 and succeeds", async () => {
    const model = await harness.catalogModel("ANTHROPIC", ANTHROPIC_MODEL);
    harness.phase = "OLM-003";
    const llm = await createAvailableLlm(model.modelIdentifier);
    let content = "";
    try {
      const response = await llm.sendUserMessage(new LLMUserMessage({ content: PONG }));
      content = response.content ?? "";
    } finally {
      await llm.cleanup();
    }
    await harness.settleCalls();
    const phaseCalls = harness.callsOf("OLM-003");
    harness.recordCase("OLM-E2E-003", { model: model.modelIdentifier, contentLength: content.length, calls: phaseCalls.map((call) => harness.summarize(call)) });
    harness.assertAccepted(phaseCalls, "OLM-003");
    for (const call of phaseCalls) {
      expect(call.stream, `call ${call.index} is non-streaming`).toBe(false);
      harness.assertLimit(call, "max_tokens", ANTHROPIC_NON_STREAMING_DEFAULT, "OLM-003");
    }
    expect(content.trim().length).toBeGreaterThan(0);
  }, STEP_TIMEOUT_MS);

  for (const providerCase of PROVIDER_CASES) {
    it.skipIf(!hasKey(providerCase.keyAlias))(`${providerCase.id}: ${providerCase.providerId} ${providerCase.model} unconfigured sends the catalog maximum as ${providerCase.field} (or omits an unknown limit)`, async () => {
      if (providerCase.geminiMode) {
        await harness.gql("mutation($mode: GeminiSetupMode!) { useGeminiMode(mode: $mode) { setup { activeMode } } }", { mode: providerCase.geminiMode });
      }
      const model = await harness.catalogModel(providerCase.providerId, providerCase.model);
      const session = await harness.startRun(agentDefinitionId, model.modelIdentifier, null);
      const { error } = await harness.runTurn(session, providerCase.id, PONG);
      const phaseCalls = harness.callsOf(providerCase.id);
      harness.recordCase(providerCase.id, { model: model.modelIdentifier, catalogMaxOutputTokens: model.maxOutputTokens, error: error?.payload ?? null, calls: phaseCalls.map((call) => harness.summarize(call)) });
      expect(error, `ERROR frame: ${JSON.stringify(error?.payload)}`).toBeNull();
      harness.assertAccepted(phaseCalls, providerCase.id);
      for (const call of phaseCalls) harness.assertLimit(call, providerCase.field, model.maxOutputTokens, providerCase.id);
      await harness.stopRun(session);
    }, STEP_TIMEOUT_MS);
  }

  for (const providerCase of PROVIDER_CASES.filter((entry) => entry.field === "max_tokens")) {
    it.skipIf(!hasKey(providerCase.keyAlias))(`OLM-E2E-010 (${providerCase.providerId}): a configured max_tokens 24 is sent as max_tokens and the provider applies it`, async () => {
      const model = await harness.catalogModel(providerCase.providerId, providerCase.model);
      const session = await harness.startRun(agentDefinitionId, model.modelIdentifier, { max_tokens: 24 });
      const casePhase = `OLM-010-${providerCase.providerId}`;
      const { error } = await harness.runTurn(session, casePhase, "Count from 1 to 300, separated by single spaces. Output only the numbers.");
      const phaseCalls = harness.callsOf(casePhase);
      harness.recordCase(`OLM-E2E-010-${providerCase.providerId}`, { model: model.modelIdentifier, error: error?.payload ?? null, calls: phaseCalls.map((call) => harness.summarize(call)) });
      harness.assertAccepted(phaseCalls, casePhase);
      for (const call of phaseCalls) harness.assertLimit(call, "max_tokens", 24, casePhase);
      // A counted 1..300 answer is ~600 tokens; finish reason `length` shows the provider applied the 24-token field.
      expect(phaseCalls[0]!.stopSignals, "provider finish reasons").toContain("length");
      await harness.stopRun(session);
    }, STEP_TIMEOUT_MS);
  }
});
