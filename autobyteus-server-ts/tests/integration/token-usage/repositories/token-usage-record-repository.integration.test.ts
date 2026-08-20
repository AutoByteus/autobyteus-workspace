import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { initializePrisma, rootPrismaClient, shutdownPrisma } from "repository_prisma";
import {
  MAX_CUMULATIVE_SERIES_PER_RUN,
  MAX_RECENT_IDEMPOTENCY_DIGESTS,
  MAX_RECENT_IDEMPOTENCY_STATE_BYTES,
  MAX_SNAPSHOT_SERIES_STATE_BYTES,
} from "../../../../src/token-usage/domain/token-usage-snapshot-checkpoint.js";
import { configureTokenUsageMigrationReadiness } from "../../../../src/token-usage/providers/token-usage-migration-readiness.js";
import {
  buildCurrentTokenUsagePayload,
  createCurrentTokenUsageTestHarness,
} from "../../../helpers/token-usage-run-record-fixtures.js";

const runIds = new Set<string>();
const remember = (runId: string): string => {
  runIds.add(runId);
  return runId;
};

beforeAll(async () => {
  await shutdownPrisma();
  await initializePrisma({ datasourceUrl: process.env.DATABASE_URL });
  configureTokenUsageMigrationReadiness({ kind: "READY" });
});

afterEach(async () => {
  const ids = [...runIds];
  runIds.clear();
  if (ids.length > 0) await rootPrismaClient.tokenUsageRunRecord.deleteMany({ where: { runId: { in: ids } } });
});

afterAll(async () => {
  await shutdownPrisma();
});

describe("SqlTokenUsageRunRepository current-record integration", () => {
  it("serializes rapid same-time direct observations into one exact row using fold revision order", async () => {
    const runId = remember("current-repository-rapid-order");
    const { accumulator, repository } = createCurrentTokenUsageTestHarness(rootPrismaClient);

    await Promise.all(Array.from({ length: 25 }, (_, index) => accumulator.recordObservation(
      buildCurrentTokenUsagePayload({
        runId,
        eventId: `rapid-${index}`,
        idempotencyKey: `rapid-idem-${index}`,
        observedAt: "2026-08-19T12:00:00.000Z",
        inputTokens: 1,
        outputTokens: 1,
        latestPromptTokens: index,
        modelIdentifier: `model-${index}`,
      }),
    )));

    const record = await repository.getByRunId(runId);
    expect(record).not.toBeNull();
    expect(await rootPrismaClient.tokenUsageRunRecord.count({ where: { runId } })).toBe(1);
    expect(record!.revision).toBe(25n);
    expect(record!.usageReportCount).toBe(25n);
    expect(record!.tokenTotals.accounting_input_tokens).toBe(25n);
    expect(record!.tokenTotals.accounting_output_tokens).toBe(25n);
    expect(record!.latestPromptTokens).toBe(24n);
    expect(record!.latestModelIdentifier).toBe("model-24");
    expect(record!.latestObservation.ordinal).toBe(25n);
  });

  it("reconciles cumulative advancement, suppresses exact replay, and records non-subtracting regression", async () => {
    const runId = remember("current-repository-cumulative");
    const { accumulator, repository } = createCurrentTokenUsageTestHarness(rootPrismaClient);
    const observation = (eventId: string, sourceInputTokens: number) => buildCurrentTokenUsagePayload({
      runId,
      eventId,
      idempotencyKey: `idem-${eventId}`,
      usageScope: "cumulative_snapshot",
      snapshotSeriesKey: "codex-thread:one",
      runtimeKind: "codex_app_server",
      ingestionKind: "codex_thread_token_usage",
      inputTokens: sourceInputTokens,
      outputTokens: 0,
      sourceInputTokens,
      sourceOutputTokens: 0,
    });

    await accumulator.recordObservation(observation("cumulative-100", 100));
    await accumulator.recordObservation(observation("cumulative-150", 150));
    const finalPayload = observation("cumulative-210", 210);
    await accumulator.recordObservation(finalPayload);
    await accumulator.recordObservation(finalPayload);
    await accumulator.recordObservation(observation("cumulative-regression", 180));

    const record = await repository.getByRunId(runId);
    expect(record).not.toBeNull();
    expect(record!.tokenTotals.accounting_input_tokens).toBe(210n);
    expect(record!.snapshotSeriesState).toHaveLength(1);
    expect(record!.snapshotSeriesState[0]!.sourceTokens.accounting_input_tokens).toBe(210n);
    expect(record!.qualityFlags).toContain("cumulative_snapshot_regressed");
    expect(record!.usageReportCount).toBe(4n);
    expect(record!.revision).toBe(4n);
  });

  it("round-trips ninth-series eviction, evicted-series reappearance, later advancement, and both compact-state byte caps", async () => {
    const runId = remember("current-repository-bounded-state");
    const { accumulator, repository } = createCurrentTokenUsageTestHarness(rootPrismaClient);
    const cumulative = (series: number, event: string, source: number) => buildCurrentTokenUsagePayload({
      runId,
      eventId: `${event}-${series}`,
      idempotencyKey: `${event}-idem-${series}`,
      usageScope: "cumulative_snapshot",
      snapshotSeriesKey: `series-${series}`,
      runtimeKind: "codex_app_server",
      ingestionKind: "codex_thread_token_usage",
      inputTokens: source,
      outputTokens: 0,
      sourceInputTokens: source,
      sourceOutputTokens: 0,
    });

    for (let series = 0; series < MAX_CUMULATIVE_SERIES_PER_RUN; series += 1) {
      await accumulator.recordObservation(cumulative(series, "initial", 100 + series));
    }
    const beforeOverflow = await repository.getByRunId(runId);
    const beforeTotal = beforeOverflow!.tokenTotals.accounting_input_tokens;

    const ninthBaseline = await accumulator.recordObservation(cumulative(8, "baseline", 500));
    expect(ninthBaseline.accounting_input_tokens).toBeNull();
    expect(ninthBaseline.quality_flags).toContain("cumulative_series_checkpoint_evicted");
    await accumulator.recordObservation(cumulative(8, "advance", 525));

    const reappearingBaseline = await accumulator.recordObservation(cumulative(0, "reappear", 700));
    expect(reappearingBaseline.accounting_input_tokens).toBeNull();
    expect(reappearingBaseline.quality_flags).toContain("cumulative_series_checkpoint_evicted");
    await accumulator.recordObservation(cumulative(0, "reappear-advance", 711));

    for (let index = 0; index < 80; index += 1) {
      await accumulator.recordObservation(buildCurrentTokenUsagePayload({
        runId,
        eventId: `direct-${index}`,
        idempotencyKey: `direct-idem-${index}`,
        observedAt: new Date(Date.UTC(2026, 7, 19, 13, 0, index)).toISOString(),
        inputTokens: 1,
        outputTokens: 0,
      }));
    }

    const record = await repository.getByRunId(runId);
    const encoded = await rootPrismaClient.tokenUsageRunRecord.findUniqueOrThrow({ where: { runId } });
    expect(record!.snapshotSeriesState).toHaveLength(MAX_CUMULATIVE_SERIES_PER_RUN);
    expect(record!.recentIdempotencyDigests).toHaveLength(MAX_RECENT_IDEMPOTENCY_DIGESTS);
    expect(record!.tokenTotals.accounting_input_tokens).toBe(beforeTotal + 25n + 11n + 80n);
    expect(record!.qualityFlags).toContain("cumulative_series_checkpoint_evicted");
    expect(Buffer.byteLength(encoded.snapshotSeriesStateJson)).toBeLessThanOrEqual(MAX_SNAPSHOT_SERIES_STATE_BYTES);
    expect(Buffer.byteLength(encoded.recentIdempotencyDigestsJson)).toBeLessThanOrEqual(MAX_RECENT_IDEMPOTENCY_STATE_BYTES);
    expect(encoded.snapshotSeriesStateJson).not.toContain("series-0");
    expect(encoded.recentIdempotencyDigestsJson).not.toContain("direct-idem");
  });

  it("selects runs by creation time with first-observation fallback and returns the current record once", async () => {
    const inRangeCreated = remember("range-created");
    const fallbackCreated = remember("range-fallback");
    const outOfRange = remember("range-outside");
    const { accumulator, repository } = createCurrentTokenUsageTestHarness(rootPrismaClient);

    await accumulator.recordObservation(buildCurrentTokenUsagePayload({
      runId: inRangeCreated,
      runCreatedAt: "2026-08-10T00:00:00.000Z",
      observedAt: "2026-08-30T00:00:00.000Z",
    }));
    await accumulator.recordObservation(buildCurrentTokenUsagePayload({
      runId: fallbackCreated,
      runCreatedAt: null,
      observedAt: "2026-08-11T00:00:00.000Z",
    }));
    await accumulator.recordObservation(buildCurrentTokenUsagePayload({
      runId: outOfRange,
      runCreatedAt: "2026-07-01T00:00:00.000Z",
      observedAt: "2026-08-12T00:00:00.000Z",
    }));

    const records = await repository.listRunsCreatedInRange({
      startDate: new Date("2026-08-09T00:00:00.000Z"),
      endDate: new Date("2026-08-12T23:59:59.999Z"),
    });
    expect(records.map((record) => record.runId).sort()).toEqual([inRangeCreated, fallbackCreated].sort());
    expect(records.every((record) => record.usageReportCount === 1n)).toBe(true);
  });
});
