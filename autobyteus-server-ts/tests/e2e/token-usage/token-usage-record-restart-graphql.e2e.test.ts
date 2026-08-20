import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { initializePrisma, rootPrismaClient, shutdownPrisma } from 'repository_prisma';
import {
  executeGraphql,
  removeOwnedTestRuntime,
  resolveTestDatabaseLocation,
  startBuiltTestServer,
  testRuntimeRoot,
} from '../../../../test-support/live-e2e/test-runtime-bootstrap.mjs';
import {
  buildCurrentTokenUsagePayload,
  createCurrentTokenUsageTestHarness,
} from '../../helpers/token-usage-run-record-fixtures.js';

type RunningTestServer = Awaited<ReturnType<typeof startBuiltTestServer>>;

type Summary = {
  runId: string;
  rootTeamRunId: string | null;
  grossInputTokens: number;
  standardInputTokens: number;
  cacheReadInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  totalTokens: number;
  estimatedApiInputCost: number | null;
  estimatedApiOutputCost: number | null;
  estimatedApiReasoningOutputCost: number | null;
  estimatedApiTotalCost: number | null;
  currency: string | null;
  apiCostStatus: string;
  pricingPolicyKey: string | null;
  unitPrices: {
    standardInput: { status: string; pricePerMillion: number | null };
    output: { status: string; pricePerMillion: number | null };
  };
  latestPromptTokens: number | null;
  effectiveContextWindowTokens: number | null;
  contextWindowUsagePercent: number | null;
  latestModelProvider: string | null;
  latestModelIdentifier: string | null;
  latestRuntimeKind: string | null;
  usageReportCount: number;
  updatedAt: string | null;
};

const runningServers = new Set<RunningTestServer>();
const ownedTargets: Array<{
  runtimeRoot: string;
  database: ReturnType<typeof resolveTestDatabaseLocation>;
}> = [];

const summaryFields = `
  runId
  rootTeamRunId
  grossInputTokens
  standardInputTokens
  cacheReadInputTokens
  outputTokens
  reasoningOutputTokens
  totalTokens
  estimatedApiInputCost
  estimatedApiOutputCost
  estimatedApiReasoningOutputCost
  estimatedApiTotalCost
  currency
  apiCostStatus
  pricingPolicyKey
  unitPrices {
    standardInput { status pricePerMillion }
    output { status pricePerMillion }
  }
  latestPromptTokens
  effectiveContextWindowTokens
  contextWindowUsagePercent
  latestModelProvider
  latestModelIdentifier
  latestRuntimeKind
  usageReportCount
  updatedAt
`;

const querySummaries = async (serverUrl: string, input: {
  standaloneRunId: string;
  teamRunId: string;
  memberRunId: string;
  foreignTeamRunId: string;
}) => await executeGraphql<{
  standalone: Summary;
  member: Summary;
  team: Summary;
  wrongTeamMember: Summary;
}>(serverUrl, `
  query RestartedTokenUsage(
    $standaloneRunId: String!
    $teamRunId: String!
    $memberRunId: String!
    $foreignTeamRunId: String!
  ) {
    standalone: getAgentRunTokenUsageSummary(runId: $standaloneRunId) {
      ${summaryFields}
    }
    member: getTeamMemberTokenUsageSummary(
      teamRunId: $teamRunId
      agentRunId: $memberRunId
    ) {
      ${summaryFields}
    }
    team: getTeamRunTokenUsageSummary(teamRunId: $teamRunId) {
      ${summaryFields}
    }
    wrongTeamMember: getTeamMemberTokenUsageSummary(
      teamRunId: $foreignTeamRunId
      agentRunId: $memberRunId
    ) {
      ${summaryFields}
    }
  }
`, input);

afterEach(async () => {
  await shutdownPrisma();
  for (const server of runningServers) {
    if (server.child.exitCode === null) server.child.kill('SIGKILL');
  }
  runningServers.clear();
  for (const target of ownedTargets.splice(0)) {
    await removeOwnedTestRuntime(target.runtimeRoot, target.database);
  }
});

describe('token usage current-record process restart', () => {
  it('reopens unchanged standalone and exact team-member records through built-server GraphQL', async () => {
    const suffix = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const runtimeRoot = path.join(testRuntimeRoot, `token-usage-restart-${suffix}`);
    const database = resolveTestDatabaseLocation(`file:./db/token-usage-restart-${suffix}.db`);
    ownedTargets.push({ runtimeRoot, database });

    const firstServer = await startBuiltTestServer({
      runtimeRoot,
      databaseUrlOverride: database.databaseUrl,
    });
    runningServers.add(firstServer);

    await shutdownPrisma();
    await initializePrisma({ datasourceUrl: database.databaseUrl });
    const { store } = createCurrentTokenUsageTestHarness(rootPrismaClient);

    const standaloneRunId = `standalone-${suffix}`;
    const teamRunId = `team-a-${suffix}`;
    const memberRunId = `member-a-${suffix}`;
    const foreignTeamRunId = `team-b-${suffix}`;
    const foreignMemberRunId = `member-b-${suffix}`;

    await store.recordObservation(buildCurrentTokenUsagePayload({
      runId: standaloneRunId,
      eventId: `standalone-1-${suffix}`,
      observedAt: '2026-08-20T10:00:00.000Z',
      inputTokens: 100,
      standardInputTokens: 70,
      cacheReadTokens: 30,
      outputTokens: 20,
      reasoningTokens: 4,
      inputCost: 0.001,
      outputCost: 0.002,
      reasoningCost: 0.0004,
      totalCost: 0.0034,
      inputPricePerMillion: 10,
      outputPricePerMillion: 100,
      currency: 'USD',
      pricingPolicyKey: 'catalog:openai:gpt-5.6-sol:standard',
      modelProvider: 'OPENAI',
      modelIdentifier: 'gpt-5.6-sol',
      runtimeKind: 'codex_app_server',
      latestPromptTokens: 80,
      effectiveContextWindowTokens: 200_000,
      contextWindowUsagePercent: 0.04,
    }));
    await store.recordObservation(buildCurrentTokenUsagePayload({
      runId: standaloneRunId,
      eventId: `standalone-2-${suffix}`,
      observedAt: '2026-08-20T10:05:00.000Z',
      inputTokens: 50,
      outputTokens: 5,
      reasoningTokens: 1,
      inputCost: 0.0005,
      outputCost: 0.0005,
      reasoningCost: 0.0001,
      totalCost: 0.0011,
      inputPricePerMillion: 10,
      outputPricePerMillion: 100,
      currency: 'USD',
      pricingPolicyKey: 'catalog:openai:gpt-5.6-sol:standard',
      modelProvider: 'OPENAI',
      modelIdentifier: 'gpt-5.6-sol',
      runtimeKind: 'codex_app_server',
      latestPromptTokens: 90,
      effectiveContextWindowTokens: 200_000,
      contextWindowUsagePercent: 0.045,
    }));

    await store.recordObservation(buildCurrentTokenUsagePayload({
      runId: memberRunId,
      rootTeamRunId: teamRunId,
      eventId: `member-a-1-${suffix}`,
      observedAt: '2026-08-20T10:01:00.000Z',
      inputTokens: 40,
      outputTokens: 10,
      inputCost: 0.0004,
      outputCost: 0.001,
      totalCost: 0.0014,
      inputPricePerMillion: 10,
      outputPricePerMillion: 100,
      currency: 'USD',
      pricingPolicyKey: 'catalog:openai:gpt-5.6-sol:standard',
      modelProvider: 'OPENAI',
      modelIdentifier: 'gpt-5.6-sol',
      runtimeKind: 'codex_app_server',
      latestPromptTokens: 35,
      effectiveContextWindowTokens: 200_000,
      contextWindowUsagePercent: 0.0175,
      teamName: 'Team A',
      memberDisplayName: 'Member A',
    }));
    await store.recordObservation(buildCurrentTokenUsagePayload({
      runId: memberRunId,
      rootTeamRunId: teamRunId,
      eventId: `member-a-2-${suffix}`,
      observedAt: '2026-08-20T10:06:00.000Z',
      inputTokens: 20,
      outputTokens: 5,
      inputCost: 0.0002,
      outputCost: 0.0005,
      totalCost: 0.0007,
      inputPricePerMillion: 10,
      outputPricePerMillion: 100,
      currency: 'USD',
      pricingPolicyKey: 'catalog:openai:gpt-5.6-sol:standard',
      modelProvider: 'OPENAI',
      modelIdentifier: 'gpt-5.6-sol',
      runtimeKind: 'codex_app_server',
      latestPromptTokens: 42,
      effectiveContextWindowTokens: 200_000,
      contextWindowUsagePercent: 0.021,
      teamName: 'Team A',
      memberDisplayName: 'Member A',
    }));
    await store.recordObservation(buildCurrentTokenUsagePayload({
      runId: foreignMemberRunId,
      rootTeamRunId: foreignTeamRunId,
      eventId: `member-b-1-${suffix}`,
      observedAt: '2026-08-20T10:02:00.000Z',
      inputTokens: 7,
      outputTokens: 3,
      totalCost: null,
      apiCostStatus: 'price_missing',
      modelProvider: 'OPENAI',
      modelIdentifier: 'unpriced-model',
      runtimeKind: 'codex_app_server',
      teamName: 'Team B',
      memberDisplayName: 'Member B',
    }));

    const variables = { standaloneRunId, teamRunId, memberRunId, foreignTeamRunId };
    const beforeRestart = await querySummaries(firstServer.serverUrl, variables);
    expect(beforeRestart.standalone).toMatchObject({
      runId: standaloneRunId,
      rootTeamRunId: null,
      grossInputTokens: 150,
      standardInputTokens: 120,
      cacheReadInputTokens: 30,
      outputTokens: 25,
      reasoningOutputTokens: 5,
      totalTokens: 175,
      estimatedApiInputCost: 0.0015,
      estimatedApiOutputCost: 0.0025,
      estimatedApiReasoningOutputCost: 0.0005,
      estimatedApiTotalCost: 0.0045,
      currency: 'USD',
      apiCostStatus: 'estimated',
      pricingPolicyKey: 'catalog:openai:gpt-5.6-sol:standard',
      latestPromptTokens: 90,
      effectiveContextWindowTokens: 200_000,
      contextWindowUsagePercent: 0.045,
      latestModelProvider: 'OPENAI',
      latestModelIdentifier: 'gpt-5.6-sol',
      latestRuntimeKind: 'codex_app_server',
      usageReportCount: 2,
      updatedAt: '2026-08-20T10:05:00.000Z',
    });
    expect(beforeRestart.standalone.unitPrices).toEqual({
      standardInput: { status: 'single', pricePerMillion: 10 },
      output: { status: 'single', pricePerMillion: 100 },
    });
    expect(beforeRestart.member).toMatchObject({
      runId: memberRunId,
      rootTeamRunId: teamRunId,
      grossInputTokens: 60,
      outputTokens: 15,
      totalTokens: 75,
      estimatedApiTotalCost: 0.0021,
      latestRuntimeKind: 'codex_app_server',
      usageReportCount: 2,
    });
    expect(beforeRestart.team).toMatchObject({
      runId: teamRunId,
      rootTeamRunId: teamRunId,
      grossInputTokens: 60,
      outputTokens: 15,
      totalTokens: 75,
      estimatedApiTotalCost: 0.0021,
      usageReportCount: 2,
    });
    expect(beforeRestart.wrongTeamMember).toMatchObject({
      runId: memberRunId,
      rootTeamRunId: null,
      grossInputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimatedApiTotalCost: null,
      usageReportCount: 0,
    });

    await shutdownPrisma();
    await firstServer.stop();
    runningServers.delete(firstServer);

    const restartedServer = await startBuiltTestServer({
      runtimeRoot,
      databaseUrlOverride: database.databaseUrl,
    });
    runningServers.add(restartedServer);
    const afterRestart = await querySummaries(restartedServer.serverUrl, variables);

    expect(afterRestart).toEqual(beforeRestart);
    expect(afterRestart.wrongTeamMember.totalTokens).toBe(0);
    expect(afterRestart.wrongTeamMember.rootTeamRunId).toBeNull();
    expect(afterRestart.member.rootTeamRunId).toBe(teamRunId);
    expect(afterRestart.team.rootTeamRunId).toBe(teamRunId);

    await restartedServer.stop();
    runningServers.delete(restartedServer);
    await initializePrisma({ datasourceUrl: database.databaseUrl });
    expect(await rootPrismaClient.tokenUsageRunRecord.count()).toBe(3);
    expect(await rootPrismaClient.tokenUsageRunRecord.count({
      where: { rootTeamRunId: teamRunId },
    })).toBe(1);
    expect(await rootPrismaClient.tokenUsageRunRecord.count({
      where: { rootTeamRunId: foreignTeamRunId },
    })).toBe(1);
  }, 240_000);
});
