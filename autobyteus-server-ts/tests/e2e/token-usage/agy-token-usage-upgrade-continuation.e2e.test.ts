import "reflect-metadata";
import { createRequire } from "node:module";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { initializePrisma, rootPrismaClient, shutdownPrisma } from "repository_prisma";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { AgyStreamEventConverter } from "../../../src/agent-execution/backends/antigravity/stream/agy-stream-event-converter.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import type { TokenUsageUpdatedPayload } from "../../../src/agent-execution/domain/agent-run-token-usage.js";
import { TokenUsageEventEnrichmentTransformer } from "../../../src/agent-execution/events/processors/token-usage/token-usage-event-enrichment-transformer.js";
import { TokenUsageRunPersistenceTransformer } from "../../../src/agent-execution/events/processors/token-usage/token-usage-run-persistence-transformer.js";
import { configureTokenUsageCapability } from "../../../src/token-usage/providers/token-usage-capability.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

// Fix-forward for AGY usage (gemini-native-cache-hit REQ-005/AC-007, adapted for token-meter-accuracy D-5/AF-16).
// An AGY conversation whose run record was written from the cumulative `result` usage under the old semantic
// (`gross_includes_cache`) continues after the upgrade, when AGY usage comes per DONE `agent_response` step
// (`per_call`, `base_excludes_cache`) and the result is no longer mapped. Pre-fix observations are the payload the
// old converter emitted; post-upgrade observations run through the production AGY converter. All of them pass the
// server's token usage enrichment and persistence transformers and the SQL store, and are read back through
// GraphQL. The stored record must be read unchanged; the stored AGY snapshot series is no longer read, and each
// post-upgrade step adds its own per-call usage without a regression flag. Two stored shapes occur in real use:
// - A: the first snapshot already had more cache reads than uncached input, so the old basis stored
//   miss = standard = 0. Those stored values stay; gross keeps lacking the earlier cache reads.
// - B: cache reads later grew faster than input, so the old basis' standard input fell and the old fold
//   rejected those snapshots as regressed: their increments never reached the totals and stay lost.

type Summary = {
  grossInputTokens: number; standardInputTokens: number; cacheMissInputTokens: number; cacheReadInputTokens: number;
  usageReportCount: number;
};
type Turn = { turn: number; input: number; output: number; cacheRead: number };
/** Recorded AGY 1.2.16 cumulative usage, turns 1-3 (tests/fixtures/agy-compaction). */
const recordedTurns: Turn[] = [
  { turn: 1, input: 91_684, output: 4, cacheRead: 0 },
  { turn: 2, input: 173_199, output: 8, cacheRead: 90_059 },
  { turn: 3, input: 256_802, output: 12, cacheRead: 257_920 },
];
/** Live AGY 1.3.2 probe (investigation notes): call 1 (cumulative = per call), then call 2 alone (2,100 + 311,085). */
const cacheHeavyTurns: Turn[] = [
  { turn: 1, input: 6_110, output: 1, cacheRead: 307_003 },
  { turn: 2, input: 2_100, output: 1, cacheRead: 311_085 },
];
/** The turn-3 model call of the recorded conversation: the cumulative increment from turn 2 to turn 3. */
const recordedTurn3Call: Turn = { turn: 3, input: 256_802 - 173_199, output: 4, cacheRead: 257_920 - 90_059 };

describe("AGY run record written before the semantic fix continues after it", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  const runIds = new Set<string>();

  /**
   * One AGY usage observation through the production server path. `preFix` is the cumulative `result` usage as the
   * converter emitted it before the fix; otherwise the turn's model call is one DONE `agent_response` step.
   */
  const ingest = async (runId: string, conversationId: string, turn: Turn, preFix: boolean): Promise<TokenUsageUpdatedPayload> => {
    runIds.add(runId);
    const runContext = new AgentRunContext({ runId, runtimeContext: null, config: new AgentRunConfig({
      agentDefinitionId: "agy-upgrade-agent", llmModelIdentifier: "gemini-3.8-flash-low", autoExecuteTools: true,
      workspaceId: null, runtimeKind: RuntimeKind.ANTIGRAVITY_CLI }) });
    const usage = { input_tokens: turn.input, output_tokens: turn.output, thinking_tokens: 0,
      cache_read_tokens: turn.cacheRead, total_tokens: turn.input + turn.output };
    const converter = new AgyStreamEventConverter(runId, conversationId, "gemini-3.8-flash-low");
    converter.startTurn(`turn-${turn.turn}`);
    const event = preFix
      ? { eventId: randomUUID(), eventType: AgentRunEventType.TOKEN_USAGE_UPDATED, runId, statusHint: null, payload: {
        turn_id: `turn-${turn.turn}`, idempotency_key: `agy:${conversationId}:${turn.turn}`,
        runtime_kind: "antigravity_cli", ingestion_kind: "agy_result",
        usage_scope: "cumulative_snapshot", snapshot_series_key: conversationId,
        // The pre-fix fold counted every observation as a usage report; this reproduces the stored count.
        reports_model_call: true,
        model_identifier: "gemini-3.8-flash-low", model_value: "gemini-3.8-flash-low", model_provider: "GEMINI",
        provider_name: "Antigravity CLI",
        reported_input_tokens: turn.input, reported_output_tokens: turn.output, reported_total_tokens: turn.input + turn.output,
        input_token_semantic: "gross_includes_cache",
        cache_read_input_tokens: turn.cacheRead, cache_state: turn.cacheRead > 0 ? "positive" : "zero_reported",
        reasoning_output_tokens: 0, raw_usage_json: usage, quality_flags: ["agy_provider_reported_cumulative_usage"],
      } }
      : converter.convert({ event: "step_update", step_update: { conversation_id: conversationId, step_index: turn.turn * 2,
        step_type: "agent_response", state: "DONE", usage } })
        .find((item) => item.eventType === AgentRunEventType.TOKEN_USAGE_UPDATED)!;
    const payload = { ...event.payload, observed_at: new Date(Date.UTC(2026, 9, 9, 10, turn.turn)).toISOString() };
    const enriched = await new TokenUsageEventEnrichmentTransformer().transform({ runContext,
      events: [{ ...event, payload } as typeof event] });
    const persisted = await new TokenUsageRunPersistenceTransformer().transform({ runContext, events: enriched });
    return persisted[0]!.payload as unknown as TokenUsageUpdatedPayload;
  };

  beforeAll(async () => {
    await shutdownPrisma();
    await initializePrisma({ datasourceUrl: process.env.DATABASE_URL });
    configureTokenUsageCapability({ kind: "READY" });
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    graphql = (await import(graphqlPath)).graphql as typeof graphqlFn;
  });

  afterAll(async () => {
    await rootPrismaClient.tokenUsageRunRecord.deleteMany({ where: { runId: { in: [...runIds] } } });
    await shutdownPrisma();
  });

  const summary = async (runId: string): Promise<Summary> => {
    const result = await graphql({ schema, variableValues: { runId }, source: `
      query($runId: String!) { getAgentRunTokenUsageSummary(runId: $runId) {
        grossInputTokens standardInputTokens cacheMissInputTokens cacheReadInputTokens usageReportCount } }` });
    if (result.errors?.length) throw result.errors[0];
    return (result.data as { getAgentRunTokenUsageSummary: Summary }).getAgentRunTokenUsageSummary;
  };
  const storedFlags = async (runId: string): Promise<string[]> =>
    JSON.parse((await rootPrismaClient.tokenUsageRunRecord.findUnique({ where: { runId } }))!.qualityFlagsJson);

  it("AE-005 shape A: a cache-heavy pre-fix record is read unchanged; the next step adds its own call", async () => {
    const runId = `agy-upgrade-a-${randomUUID()}`;
    const conversationId = randomUUID();
    await ingest(runId, conversationId, cacheHeavyTurns[0]!, true);
    // As recorded before the fix: gross = reported input; standard = miss = max(0, input - cache read) = 0.
    expect(await summary(runId)).toEqual({ grossInputTokens: 6_110, standardInputTokens: 0,
      cacheMissInputTokens: 0, cacheReadInputTokens: 307_003, usageReportCount: 1 });

    const continued = await ingest(runId, conversationId, cacheHeavyTurns[1]!, false);
    expect(continued).toMatchObject({ usage_scope: "per_call", input_token_semantic: "base_excludes_cache" });
    expect(continued.quality_flags).not.toContain("cumulative_snapshot_regressed");
    // Accepted fix-forward outcome: the step adds its own call (2,100 miss + 311,085 cache reads); the stored
    // pre-fix miss (0) is kept, and gross lacks the 307,003 cache reads recorded before the fix (true gross 626,298).
    expect(await summary(runId)).toEqual({ grossInputTokens: 319_295, standardInputTokens: 2_100,
      cacheMissInputTokens: 2_100, cacheReadInputTokens: 618_088, usageReportCount: 2 });
    expect(await storedFlags(runId)).not.toContain("cumulative_snapshot_regressed");
  });

  it("AE-005 shape B: after a pre-fix snapshot rejected as regressed, the next step adds its own call", async () => {
    const runId = `agy-upgrade-b-${randomUUID()}`;
    const conversationId = randomUUID();
    await ingest(runId, conversationId, recordedTurns[0]!, true);
    const rejected = await ingest(runId, conversationId, recordedTurns[1]!, true);
    // The old basis made standard input fall (173,199 - 90,059 = 83,140 < 91,684), so the old fold rejected it.
    expect(rejected.quality_flags).toContain("cumulative_snapshot_regressed");
    expect(await summary(runId)).toMatchObject({ grossInputTokens: 91_684, standardInputTokens: 91_684,
      cacheMissInputTokens: 91_684, cacheReadInputTokens: 0 });
    // The record keeps that pre-fix history as stored (no rewrite).
    expect(await storedFlags(runId)).toContain("cumulative_snapshot_regressed");

    const continued = await ingest(runId, conversationId, recordedTurn3Call, false);
    expect(continued.quality_flags).not.toContain("cumulative_snapshot_regressed");
    // The rejected pre-fix snapshot's increment (81,515 input and 90,059 cache reads) was lost before the fix and
    // stays lost. The post-upgrade step adds the turn-3 call (83,603 input + 167,861 cache reads) per call.
    expect(continued).toMatchObject({ accounting_input_tokens: 83_603 + 167_861, standard_input_tokens: 83_603,
      cache_read_input_tokens: 167_861 });
    expect(await summary(runId)).toEqual({ grossInputTokens: 91_684 + 83_603 + 167_861,
      standardInputTokens: 91_684 + 83_603, cacheMissInputTokens: 91_684 + 83_603, cacheReadInputTokens: 167_861,
      usageReportCount: 3 });
  });
});
