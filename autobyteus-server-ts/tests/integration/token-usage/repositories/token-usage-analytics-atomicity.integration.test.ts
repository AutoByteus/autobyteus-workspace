import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { initializePrisma, rootPrismaClient, shutdownPrisma } from "repository_prisma";
import { SqlTokenUsageAnalyticsRepository } from "../../../../src/token-usage/repositories/sql/token-usage-analytics-repository.js";
import { SqlTokenUsageRunRepository } from "../../../../src/token-usage/repositories/sql/token-usage-run-repository.js";
import { projectTokenUsageAnalyticsContribution } from "../../../../src/token-usage/projections/token-usage-analytics-contribution.js";
import { TokenUsageRunAccumulator } from "../../../../src/token-usage/services/token-usage-run-accumulator.js";
import { configureTokenUsageMigrationReadiness } from "../../../../src/token-usage/providers/token-usage-migration-readiness.js";
import {
  buildCurrentTokenUsagePayload,
  passthroughTokenCostCalculator,
} from "../../../helpers/token-usage-run-record-fixtures.js";

const PREFIX = "analytics-atomicity-";

const cleanup = async () => {
  await rootPrismaClient.tokenUsageRunRecord.deleteMany({ where: { runId: { startsWith: PREFIX } } });
  await rootPrismaClient.tokenUsageAnalyticsDailyFacet.deleteMany({
    where: { modelIdentifier: { startsWith: PREFIX } },
  });
};

beforeAll(async () => {
  await shutdownPrisma();
  await initializePrisma({ datasourceUrl: process.env.DATABASE_URL });
  configureTokenUsageMigrationReadiness({ kind: "READY" });
  await cleanup();
});

afterEach(cleanup);
afterAll(async () => {
  await cleanup();
  await shutdownPrisma();
});

const payload = (runId: string, event: number, observedAt = "2026-08-20T12:00:00.000Z") =>
  buildCurrentTokenUsagePayload({
    runId,
    eventId: `${runId}-event-${event}`,
    idempotencyKey: `${runId}-idem-${event}`,
    observedAt,
    inputTokens: 1,
    outputTokens: 1,
    modelIdentifier: `${PREFIX}shared-model`,
    totalCost: 0.002,
    inputCost: 0.001,
    outputCost: 0.001,
    apiCostStatus: "estimated",
    currency: "USD",
  });

describe("token usage analytics real SQLite atomicity and contention", () => {
  it("rolls back both the run save and facet increment when the projection transaction fails", async () => {
    const runId = `${PREFIX}rollback`;
    const runRepository = new SqlTokenUsageRunRepository(rootPrismaClient);
    const analyticsRepository = new SqlTokenUsageAnalyticsRepository(rootPrismaClient);
    const analyticsWriter = {
      record: vi.fn(async (transaction, authoritativePayload) => {
        await analyticsRepository.incrementFacet(
          transaction,
          projectTokenUsageAnalyticsContribution(authoritativePayload),
        );
        throw new Error("INJECTED_ANALYTICS_FAILURE");
      }),
    };
    const accumulator = new TokenUsageRunAccumulator(
      runRepository,
      passthroughTokenCostCalculator as never,
      analyticsWriter as never,
    );

    await expect(accumulator.recordObservation(payload(runId, 1)))
      .rejects.toThrow("INJECTED_ANALYTICS_FAILURE");

    expect(analyticsWriter.record).toHaveBeenCalledTimes(1);
    expect(await rootPrismaClient.tokenUsageRunRecord.findUnique({ where: { runId } })).toBeNull();
    expect(await rootPrismaClient.tokenUsageAnalyticsDailyFacet.count({
      where: { modelIdentifier: `${PREFIX}shared-model` },
    })).toBe(0);
  });

  it("does not invoke the projection writer for an exact suppressed cumulative replay", async () => {
    const runId = `${PREFIX}suppressed`;
    const runRepository = new SqlTokenUsageRunRepository(rootPrismaClient);
    const analyticsRepository = new SqlTokenUsageAnalyticsRepository(rootPrismaClient);
    const analyticsWriter = {
      record: vi.fn(async (transaction, authoritativePayload) => analyticsRepository.incrementFacet(
        transaction,
        projectTokenUsageAnalyticsContribution(authoritativePayload),
      )),
    };
    const accumulator = new TokenUsageRunAccumulator(
      runRepository,
      passthroughTokenCostCalculator as never,
      analyticsWriter as never,
    );
    const cumulative = buildCurrentTokenUsagePayload({
      runId,
      eventId: `${runId}-snapshot`,
      idempotencyKey: `${runId}-snapshot-idem`,
      usageScope: "cumulative_snapshot",
      snapshotSeriesKey: `${runId}-series`,
      sourceInputTokens: 1,
      sourceOutputTokens: 1,
      modelIdentifier: `${PREFIX}shared-model`,
      totalCost: 0.002,
      inputCost: 0.001,
      outputCost: 0.001,
    });

    await accumulator.recordObservation(cumulative);
    await accumulator.recordObservation(cumulative);

    expect(analyticsWriter.record).toHaveBeenCalledTimes(1);
    const run = await rootPrismaClient.tokenUsageRunRecord.findUniqueOrThrow({ where: { runId } });
    const facet = await rootPrismaClient.tokenUsageAnalyticsDailyFacet.findFirstOrThrow({
      where: { modelIdentifier: `${PREFIX}shared-model` },
    });
    expect(run.usageReportCount).toBe(1n);
    expect(facet.usageReportCount).toBe(1n);
    expect(facet.accountingTotalTokens).toBe(15n);
  });

  it("keeps committed runs and the shared facet exact when SQLite surfaces bounded contention failures", async () => {
    const runCount = 12;
    const runRepository = new SqlTokenUsageRunRepository(rootPrismaClient);
    const accumulator = new TokenUsageRunAccumulator(
      runRepository,
      passthroughTokenCostCalculator as never,
    );

    const results = await Promise.allSettled(Array.from({ length: runCount }, (_, index) => accumulator.recordObservation(payload(
      `${PREFIX}concurrent-${index}`,
      index,
      new Date(Date.UTC(2026, 7, 20, 12, 0, index)).toISOString(),
    ))));
    const committed = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
    const rejected = results.flatMap((result) => result.status === "rejected" ? [result.reason] : []);

    const runs = await rootPrismaClient.tokenUsageRunRecord.findMany({
      where: { runId: { startsWith: `${PREFIX}concurrent-` } },
    });
    const facets = await rootPrismaClient.tokenUsageAnalyticsDailyFacet.findMany({
      where: { modelIdentifier: `${PREFIX}shared-model` },
    });
    expect(committed.length).toBeGreaterThanOrEqual(2);
    expect(committed.length + rejected.length).toBe(runCount);
    for (const reason of rejected) {
      expect(reason).toBeInstanceOf(Error);
      expect(reason).toMatchObject({ code: "P1008" });
    }
    expect(runs).toHaveLength(committed.length);
    expect(new Set(runs.map((run) => run.runId))).toEqual(new Set(committed.map((result) => result.run_id)));
    expect(runs.every((run) => run.accountingTotalTokens === 2n && run.usageReportCount === 1n)).toBe(true);
    expect(facets).toHaveLength(1);
    expect(facets[0]).toMatchObject({
      accountingInputTokens: BigInt(committed.length),
      accountingOutputTokens: BigInt(committed.length),
      accountingTotalTokens: BigInt(committed.length * 2),
      usageReportCount: BigInt(committed.length),
      latestObservedAt: new Date(Math.max(...committed.map((result) => Date.parse(result.observed_at)))),
    });
    expect(facets[0]!.estimatedApiTotalCost).toBeCloseTo(0.002 * committed.length, 12);
  }, 60_000);
});
