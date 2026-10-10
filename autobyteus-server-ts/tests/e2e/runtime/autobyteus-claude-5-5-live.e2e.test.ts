/**
 * Live AutoByteus (native runtime) E2E for Claude Sonnet 5.5 (`claude-sonnet-5-5`) and Claude Haiku 5.5
 * (`claude-haiku-5-5`), run through the real studio server (HTTP GraphQL + agent WebSocket) with the real Anthropic
 * API, on the shared harness `../helpers/native-runtime-live-harness.ts`. Runs are created with the llmConfig the
 * desktop app writes: the model's schema defaults written explicitly, with the Thinking toggle Off or On.
 *
 * Cases:
 *   C55-E2E-001  the catalog (GraphQL) lists each model exactly once with 1M/1M/128K limits and the thinking schema
 *                (toggle default off; display default Sonnet 5.5 `summarized`, Haiku 5.5 `omitted`) (AC-001, REQ-005/008)
 *   C55-E2E-002  Sonnet 5.5, thinking Off: tool turn; every call sends exactly `thinking: {type: "between_tools"}`
 *   C55-E2E-003  Sonnet 5.5, thinking On:  `{type: "adaptive", display: "summarized"}`
 *   C55-E2E-004  Haiku 5.5, thinking Off:  `{type: "disabled"}`
 *   C55-E2E-005  Haiku 5.5, thinking On:   `{type: "adaptive"}`
 *                For 002..005 every call is accepted (200), streams `max_tokens: 128000`, carries no temperature/top_p/top_k,
 *                the turn reads every file through read_file (tool_use → tool_result continuation), and every thinking
 *                block the provider returned with a tool_use is sent back byte-identically (thinking + signature) in the
 *                continuation (AC-004..007, AC-009, AC-011, REQ-011)
 *   C55-E2E-006  Haiku 5.5 Token Meter: one call at ≤100K and one at >100K gross input (input + cache read + cache write);
 *                the run's estimated cost equals Anthropic's raw usage priced per call at the matching tier (AC-003, REQ-004)
 * Forced tool_choice (AC-008) has no supported trigger through the agent runtime; it is covered by unit tests.
 *
 * Gate: RUN_CLAUDE_5_5_E2E=1 and ANTHROPIC_API_KEY (saved into the test-owned database vault, never logged). Run it with
 * a clean environment (`env -i PATH=… HOME=<temp> TMPDIR=…`). Uses real credits: about a dozen short Sonnet/Haiku calls
 * and one ~130K-token Haiku call (a few cents). Optional: CLAUDE_5_5_E2E_EVIDENCE_DIR (per-call summaries and case
 * results), CLAUDE_5_5_E2E_STEP_TIMEOUT_MS (default 600000).
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  NativeRuntimeLiveHarness,
  isRecord,
  requestMessages,
  wait,
  type CapturedCall,
  type Json,
} from "../helpers/native-runtime-live-harness.js";

const ENABLED = process.env.RUN_CLAUDE_5_5_E2E === "1" && Boolean(process.env.ANTHROPIC_API_KEY?.trim());
const describeLive = ENABLED ? describe : describe.skip;
const STEP_TIMEOUT_MS = Number(process.env.CLAUDE_5_5_E2E_STEP_TIMEOUT_MS || 600_000);
const EVIDENCE_DIR = process.env.CLAUDE_5_5_E2E_EVIDENCE_DIR?.trim() || null;
const MAX_OUTPUT_TOKENS = 128_000;
const SAMPLING_KEYS = ["temperature", "top_p", "top_k"];
const FILE_COUNT = 3;

type ModelExpectation = {
  value: string;
  displayDefault: "summarized" | "omitted";
  offShape: Json;
  onShape: Json;
};
const SONNET_5_5: ModelExpectation = {
  value: "claude-sonnet-5-5", displayDefault: "summarized",
  offShape: { type: "between_tools" }, onShape: { type: "adaptive", display: "summarized" },
};
const HAIKU_5_5: ModelExpectation = {
  value: "claude-haiku-5-5", displayDefault: "omitted",
  offShape: { type: "disabled" }, onShape: { type: "adaptive" },
};

/** Haiku 5.5 Standard prices per MTok by prompt-size tier (REQ-004). */
const HAIKU_TIERS = {
  prompt_le_100k: { input: 0.1, read: 0.01, write5m: 0.125, write1h: 0.2, output: 0.5 },
  prompt_gt_100k: { input: 0.5, read: 0.05, write5m: 0.625, write1h: 1, output: 2.5 },
} as const;

type Usage = { input: number; read: number; creation: number; write5m: number; write1h: number; output: number };
type ResponseBlock = { index: number; type: string; id?: string; thinking?: string; signature?: string; data?: string };
type ParsedResponse = { usage: Usage; blocks: ResponseBlock[] };

const num = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) ? value : 0);
const gross = (usage: Usage) => usage.input + usage.read + usage.creation;

/** Usage and content blocks (thinking text and signature reassembled from deltas) of one streamed Messages response. */
const parseAnthropicStream = (text: string): ParsedResponse => {
  let start: Json = {};
  let delta: Json = {};
  const blocks = new Map<number, ResponseBlock>();
  for (const line of text.split("\n")) {
    if (!line.startsWith("data:")) continue;
    let event: Json;
    try { event = JSON.parse(line.slice(5).trim()) as Json; } catch { continue; }
    if (event.type === "message_start" && isRecord(event.message) && isRecord(event.message.usage)) start = event.message.usage;
    if (event.type === "message_delta" && isRecord(event.usage)) {
      delta = { ...delta, ...Object.fromEntries(Object.entries(event.usage).filter(([, value]) => value !== null)) };
    }
    if (event.type === "content_block_start" && isRecord(event.content_block)) {
      const block = event.content_block;
      blocks.set(num(event.index), {
        index: num(event.index), type: String(block.type),
        ...(typeof block.id === "string" ? { id: block.id } : {}),
        ...(block.type === "thinking" ? { thinking: String(block.thinking ?? ""), signature: String(block.signature ?? "") } : {}),
        ...(block.type === "redacted_thinking" ? { data: String(block.data ?? "") } : {}),
      });
    }
    if (event.type === "content_block_delta" && isRecord(event.delta)) {
      const block = blocks.get(num(event.index));
      if (!block) continue;
      if (event.delta.type === "thinking_delta") block.thinking = `${block.thinking ?? ""}${String(event.delta.thinking ?? "")}`;
      if (event.delta.type === "signature_delta") block.signature = `${block.signature ?? ""}${String(event.delta.signature ?? "")}`;
    }
  }
  const merged = { ...start, ...delta };
  const creation = isRecord(merged.cache_creation) ? merged.cache_creation : isRecord(start.cache_creation) ? start.cache_creation : {};
  return {
    usage: {
      input: num(merged.input_tokens), read: num(merged.cache_read_input_tokens), creation: num(merged.cache_creation_input_tokens),
      write5m: num(creation.ephemeral_5m_input_tokens), write1h: num(creation.ephemeral_1h_input_tokens), output: num(merged.output_tokens),
    },
    blocks: [...blocks.values()].sort((a, b) => a.index - b.index),
  };
};

/** `configSchema` → `{ name: { type, enum, default } }` (parameters list or JSON-schema properties). */
const schemaProps = (schema: unknown): Record<string, { type: unknown; enum: unknown; default: unknown }> => {
  if (!isRecord(schema)) return {};
  if (Array.isArray(schema.parameters)) {
    return Object.fromEntries((schema.parameters as Json[]).map((p) => [String(p.name), {
      type: p.type, enum: p.enum_values ?? p.enumValues ?? p.enum, default: p.default_value ?? p.defaultValue ?? p.default,
    }]));
  }
  const properties = isRecord(schema.properties) ? schema.properties : {};
  return Object.fromEntries(Object.entries(properties).map(([key, p]) => {
    const prop = isRecord(p) ? p : {};
    return [key, { type: prop.type, enum: prop.enum, default: prop.default }];
  }));
};

type CatalogRow = {
  modelIdentifier: string; value: string; maxContextTokens: number | null; maxInputTokens: number | null;
  maxOutputTokens: number | null; configSchema: unknown;
};

describeLive("AutoByteus native runtime: Claude Sonnet 5.5 and Haiku 5.5 (live)", () => {
  const harness = new NativeRuntimeLiveHarness({ evidenceDir: EVIDENCE_DIR, stepTimeoutMs: STEP_TIMEOUT_MS, tempPrefix: "claude-5-5-e2e" });
  /** Response text of each Anthropic call, by harness call index. */
  const responses = new Map<number, Promise<string>>();
  let catalog: CatalogRow[] = [];
  let auditDefinitionId = "";

  /** Wraps the harness recorder to keep each Anthropic response body (the recorder keeps only signals). */
  const installResponseCapture = () => {
    const inner = globalThis.fetch;
    globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const isMessages = url.startsWith("https://api.anthropic.com/") && url.includes("/v1/messages") && init?.method === "POST";
      const index = harness.calls.length;
      const response = await inner(input, init);
      if (isMessages && harness.calls.length > index) responses.set(index, response.clone().text().catch(() => ""));
      return response;
    }) as typeof fetch;
  };
  const parsed = async (call: CapturedCall): Promise<ParsedResponse> => parseAnthropicStream(await (responses.get(call.index) ?? Promise.resolve("")));

  const row = (value: string): CatalogRow => {
    const found = catalog.filter((entry) => entry.value === value);
    expect(found.length, `exactly one ${value} catalog row`).toBe(1);
    return found[0]!;
  };
  /** The llmConfig the app writes for a fresh run: schema defaults explicitly, Thinking toggle as chosen. */
  const appLlmConfig = (value: string, thinkingEnabled: boolean): Json => {
    const props = schemaProps(row(value).configSchema);
    return { thinking_enabled: thinkingEnabled, thinking_display: props.thinking_display?.default };
  };

  beforeAll(async () => {
    await harness.start();
    installResponseCapture();
    const result = await harness.gql<{ ensureProviderModelCatalog: { llmModels: CatalogRow[] } }>(
      `mutation($p: String!, $r: String) { ensureProviderModelCatalog(providerId: $p, runtimeKind: $r) {
        llmModels { modelIdentifier value maxContextTokens maxInputTokens maxOutputTokens configSchema } } }`,
      { p: "ANTHROPIC", r: "autobyteus" });
    catalog = result.ensureProviderModelCatalog.llmModels;
    auditDefinitionId = await harness.createDefinition("claude-5-5-e2e-audit", [
      "You are a careful engineering agent working through workspace files with tools.",
      "When auditing dependency data, reason carefully about what you have read before every next read_file call.",
      "Call read_file exactly once per file, one tool call per response.",
      "After the last requested file, reply in one short sentence with exactly what was asked.",
    ].join("\n"), ["read_file"]);
  }, 300_000);

  afterEach(async (context) => { await harness.finishCase(context); });
  afterAll(async () => { await harness.stop(); }, 180_000);

  it("C55-E2E-001: the catalog lists each model once with 1M/1M/128K limits and its thinking schema defaults", async () => {
    const details: Json = {};
    for (const model of [SONNET_5_5, HAIKU_5_5]) {
      const entry = row(model.value);
      const props = schemaProps(entry.configSchema);
      details[model.value] = { modelIdentifier: entry.modelIdentifier, maxContextTokens: entry.maxContextTokens,
        maxInputTokens: entry.maxInputTokens, maxOutputTokens: entry.maxOutputTokens, props };
      expect(entry.maxContextTokens).toBe(1_000_000);
      expect(entry.maxInputTokens).toBe(1_000_000);
      expect(entry.maxOutputTokens).toBe(MAX_OUTPUT_TOKENS);
      expect(Object.keys(props).sort(), `${model.value} schema keys`).toEqual(["thinking_display", "thinking_enabled"]);
      expect(props.thinking_enabled!.default, `${model.value} toggle default`).toBe(false);
      expect(props.thinking_display!.default, `${model.value} display default`).toBe(model.displayDefault);
      expect(props.thinking_display!.enum).toEqual(["omitted", "summarized"]);
    }
    harness.recordCase("C55-E2E-001", details);
  }, 120_000);

  const toolTurnCases: Array<{ id: string; model: ModelExpectation; thinking: boolean }> = [
    { id: "C55-E2E-002", model: SONNET_5_5, thinking: false },
    { id: "C55-E2E-003", model: SONNET_5_5, thinking: true },
    { id: "C55-E2E-004", model: HAIKU_5_5, thinking: false },
    { id: "C55-E2E-005", model: HAIKU_5_5, thinking: true },
  ];
  for (const testCase of toolTurnCases) {
    const expectedThinking = testCase.thinking ? testCase.model.onShape : testCase.model.offShape;
    it(`${testCase.id}: ${testCase.model.value} thinking ${testCase.thinking ? "On" : "Off"} tool turn sends ${JSON.stringify(expectedThinking)} and replays thinking unchanged`, async () => {
      const files: Record<string, string> = {};
      for (let n = 1; n <= FILE_COUNT; n += 1) {
        const lines = Array.from({ length: 12 }, (_, i) =>
          `Section ${i + 1}: component C${(n * 7 + i) % 11} depends on C${(n * 5 + i * 3) % 11}.`);
        files[`deps-${n}.txt`] = [`CODE: Q${n}-${(n * 37) % 101}`, ...lines].join("\n");
      }
      const workspace = await harness.makeWorkspace(files);
      const llmConfig = appLlmConfig(testCase.model.value, testCase.thinking);
      const session = await harness.startRun(auditDefinitionId, row(testCase.model.value).modelIdentifier, llmConfig, workspace);
      const { error } = await harness.runTurn(session, testCase.id, [
        `Audit the dependency files ${Object.keys(files).join(", ")} in that order, reading each one with read_file.`,
        "After each file, carefully check whether any component depends on itself directly or through components seen in",
        "earlier files, and keep a running list of such cycles. At the end, reply with the CODE values of all files and",
        "the number of cycles you found.",
      ].join(" "));
      const phaseCalls = harness.callsOf(testCase.id);
      const parsedCalls = await Promise.all(phaseCalls.map((call) => parsed(call)));

      // Every thinking block returned with a tool_use must come back unchanged in the next request's assistant turn.
      const replays: Json[] = [];
      for (let i = 0; i < phaseCalls.length; i += 1) {
        const response = parsedCalls[i]!;
        const toolUseIds = response.blocks.filter((block) => block.type === "tool_use").map((block) => block.id);
        const returnedThinking = response.blocks.filter((block) => block.type === "thinking" || block.type === "redacted_thinking");
        if (toolUseIds.length === 0 || returnedThinking.length === 0) continue;
        const next = phaseCalls[i + 1];
        expect(next, `call ${phaseCalls[i]!.index} with thinking + tool_use has a continuation`).toBeDefined();
        const messages = Array.isArray(next!.body.messages) ? next!.body.messages as Json[] : [];
        const assistant = messages.find((message) => message.role === "assistant" && Array.isArray(message.content)
          && (message.content as Json[]).some((block) => block.type === "tool_use" && block.id === toolUseIds[0]));
        expect(assistant, `continuation of call ${phaseCalls[i]!.index} holds the assistant tool_use turn`).toBeDefined();
        const sentThinking = (assistant!.content as Json[]).filter((block) => block.type === "thinking" || block.type === "redacted_thinking")
          .map((block) => block.type === "thinking"
            ? { type: block.type, thinking: block.thinking, signature: block.signature }
            : { type: block.type, data: block.data });
        const expectedReplay = returnedThinking.map((block) => block.type === "thinking"
          ? { type: block.type, thinking: block.thinking, signature: block.signature }
          : { type: block.type, data: block.data });
        replays.push({ fromCall: phaseCalls[i]!.index, toCall: next!.index, blocks: expectedReplay.length,
          signedBlocks: expectedReplay.filter((block) => typeof block.signature === "string" && block.signature.length > 0).length,
          thinkingChars: expectedReplay.reduce((sum, block) => sum + String(block.thinking ?? "").length, 0) });
        expect(JSON.stringify(sentThinking), `thinking from call ${phaseCalls[i]!.index} replayed byte-identically`).toBe(JSON.stringify(expectedReplay));
      }

      const toolResults = phaseCalls.flatMap((call) => requestMessages(call.body).flatMap((message) => message.toolResults));
      harness.recordCase(testCase.id, {
        model: testCase.model.value, llmConfig, error: error?.payload ?? null,
        calls: phaseCalls.map((call, i) => ({ ...harness.summarize(call), thinkingSent: call.body.thinking ?? null,
          responseBlockTypes: parsedCalls[i]!.blocks.map((block) => block.type), usage: parsedCalls[i]!.usage })),
        replays,
      });

      expect(error, `ERROR frame: ${JSON.stringify(error?.payload)}`).toBeNull();
      harness.assertAccepted(phaseCalls, testCase.id);
      for (const call of phaseCalls) {
        expect(call.host).toBe("api.anthropic.com");
        expect(call.body.model).toBe(testCase.model.value);
        expect(call.stream, `call ${call.index} streamed`).toBe(true);
        harness.assertLimit(call, "max_tokens", MAX_OUTPUT_TOKENS, testCase.id);
        expect(call.body.thinking, `call ${call.index} thinking`).toEqual(expectedThinking);
        for (const key of SAMPLING_KEYS) expect(Object.hasOwn(call.body, key), `call ${call.index} has no ${key}`).toBe(false);
      }
      expect(phaseCalls.length, "tool_use → tool_result continuations").toBeGreaterThanOrEqual(FILE_COUNT + 1);
      for (let n = 1; n <= FILE_COUNT; n += 1) {
        expect(toolResults.some((result) => result.includes(`CODE: Q${n}-`)), `deps-${n}.txt read through read_file`).toBe(true);
      }
      expect(phaseCalls.at(-1)!.stopSignals, "final call ends the turn").toContain("end_turn");
      expect(phaseCalls.at(-1)!.responseHasVisibleText, "final answer streamed").toBe(true);
      await harness.stopRun(session);
    }, STEP_TIMEOUT_MS + 120_000);
  }

  it("C55-E2E-006: Haiku 5.5 Token Meter prices each call at its prompt-size tier (≤100K and >100K gross input)", async () => {
    const lines = Array.from({ length: 7_000 }, (_, i) =>
      `Row ${String(i + 1).padStart(5, "0")}: sensor S${(i * 7) % 97} at station north-${(i * 3) % 41} read ${(i * 7919) % 10_007} units, status ${["nominal", "degraded", "offline"][i % 3]}.`);
    const workspace = await harness.makeWorkspace({ "sensors.txt": ["CODE: H55-TIER", ...lines].join("\n") });
    const definitionId = await harness.createDefinition("claude-5-5-e2e-reader", [
      "You are a concise assistant. When asked, read the named file once with read_file and answer exactly what is asked.",
    ].join("\n"), ["read_file"]);
    const session = await harness.startRun(definitionId, row(HAIKU_5_5.value).modelIdentifier, appLlmConfig(HAIKU_5_5.value, false), workspace);
    const { error } = await harness.runTurn(session, "C55-006", "Read sensors.txt with read_file, then reply with only the CODE value from its first line.");
    const phaseCalls = harness.callsOf("C55-006");
    harness.assertAccepted(phaseCalls, "C55-006");
    const usages = await Promise.all(phaseCalls.map(async (call) => (await parsed(call)).usage));
    const perCall = usages.map((usage) => {
      const tierId = gross(usage) <= 100_000 ? "prompt_le_100k" : "prompt_gt_100k";
      const price = HAIKU_TIERS[tierId];
      const cost = (usage.input * price.input + usage.read * price.read + usage.write5m * price.write5m
        + usage.write1h * price.write1h + usage.output * price.output) / 1_000_000;
      return { usage, gross: gross(usage), tierId, cost };
    });
    const expectedCost = perCall.reduce((sum, entry) => sum + entry.cost, 0);
    const lowTierOnlyCost = usages.reduce((sum, usage) => sum + (usage.input * HAIKU_TIERS.prompt_le_100k.input
      + usage.read * HAIKU_TIERS.prompt_le_100k.read + usage.write5m * HAIKU_TIERS.prompt_le_100k.write5m
      + usage.write1h * HAIKU_TIERS.prompt_le_100k.write1h + usage.output * HAIKU_TIERS.prompt_le_100k.output) / 1_000_000, 0);

    type Summary = { usageReportCount: number; standardInputTokens: number; cacheReadInputTokens: number; cacheCreationInputTokens: number;
      cacheCreation5mInputTokens: number; cacheCreation1hInputTokens: number; outputTokens: number; grossInputTokens: number;
      estimatedApiTotalCost: number | null; apiCostStatus: string; currency: string | null };
    const query = `query($id: String!) { getAgentRunTokenUsageSummary(runId: $id) { usageReportCount standardInputTokens cacheReadInputTokens
      cacheCreationInputTokens cacheCreation5mInputTokens cacheCreation1hInputTokens outputTokens grossInputTokens estimatedApiTotalCost
      apiCostStatus currency } }`;
    let summary: Summary | null = null;
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      summary = (await harness.gql<{ getAgentRunTokenUsageSummary: Summary }>(query, { id: session.runId })).getAgentRunTokenUsageSummary;
      if (summary.usageReportCount >= phaseCalls.length) break;
      await wait(1_000);
    }
    harness.recordCase("C55-E2E-006", { error: error?.payload ?? null, perCall, expectedCost, lowTierOnlyCost, summary,
      calls: phaseCalls.map((call) => harness.summarize(call)) });

    expect(error, `ERROR frame: ${JSON.stringify(error?.payload)}`).toBeNull();
    expect(perCall.some((entry) => entry.tierId === "prompt_le_100k"), "one call at ≤100K gross input").toBe(true);
    expect(perCall.some((entry) => entry.tierId === "prompt_gt_100k"), "one call at >100K gross input").toBe(true);
    expect(summary!.usageReportCount).toBe(phaseCalls.length);
    expect(summary!.standardInputTokens).toBe(usages.reduce((sum, usage) => sum + usage.input, 0));
    expect(summary!.cacheReadInputTokens).toBe(usages.reduce((sum, usage) => sum + usage.read, 0));
    expect(summary!.cacheCreationInputTokens).toBe(usages.reduce((sum, usage) => sum + usage.creation, 0));
    expect(summary!.outputTokens).toBe(usages.reduce((sum, usage) => sum + usage.output, 0));
    expect(summary!.apiCostStatus).toBe("estimated");
    expect(summary!.estimatedApiTotalCost!).toBeCloseTo(expectedCost, 6);
    expect(Math.abs(summary!.estimatedApiTotalCost! - lowTierOnlyCost), "the >100K call is not priced at the ≤100K tier").toBeGreaterThan(1e-4);
    await harness.stopRun(session);
  }, STEP_TIMEOUT_MS + 120_000);
});
