import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import path from 'node:path';

const UNIT_PRICE_FIELDS = [
  'standard_input',
  'cache_read_input',
  'cache_creation_input',
  'cache_creation_5m_input',
  'cache_creation_1h_input',
  'output',
  'reasoning_output',
];

const single = (value) => ({ status: 'single', value });
const unknown = () => ({ status: 'unknown' });
const dayStart = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
const addDays = (date, days) => new Date(date.getTime() + days * 86_400_000);
const tuple = (values) => values.map((value) => {
  if (value == null) return 'N;';
  return `S${Buffer.byteLength(value, 'utf8')}:${value};`;
}).join('');
const opaqueKey = (subject, values) => `v1:${createHash('sha256')
  .update(`token-usage-analytics:${subject}:v1;${tuple(values)}`)
  .digest('hex')}`;

const pricingSummary = ({ status, currency, missing = [] }) => ({
  currencies: currency ? single(currency) : unknown(),
  apiCostStatuses: single(status),
  pricingPolicyKeys: status === 'estimated' ? single(`e2e-${currency.toLowerCase()}-policy`) : unknown(),
  selectedPricingTierIds: unknown(),
  missingPriceDimensions: missing,
  unitPrices: Object.fromEntries(UNIT_PRICE_FIELDS.map((field) => [field, {
    status: status === 'local_no_api_bill'
      ? 'local_no_api_bill'
      : missing.includes(field)
        ? 'missing'
        : status === 'estimated'
          ? 'single'
          : 'not_applicable',
    price_per_million: status === 'estimated' && !missing.includes(field) ? 1 : null,
  }])),
});

const identitySummary = ({ runtimeKind, modelProvider, providerName, modelIdentifier, rootTeamRunId = null }) => ({
  runtimeKinds: single(runtimeKind),
  modelProviders: modelProvider ? single(modelProvider) : unknown(),
  providerNames: providerName ? single(providerName) : unknown(),
  modelIdentifiers: modelIdentifier ? single(modelIdentifier) : unknown(),
  modelValues: unknown(),
  rootTeamRunIds: rootTeamRunId ? single(rootTeamRunId) : unknown(),
});

const tokenFields = ({ input, output, standard, cacheRead = 0, cacheWrite = 0, reasoning = 0 }) => ({
  accountingInputTokens: BigInt(input),
  accountingOutputTokens: BigInt(output),
  accountingTotalTokens: BigInt(input + output),
  standardInputTokens: BigInt(standard),
  cacheMissInputTokens: BigInt(standard),
  cacheReadInputTokens: BigInt(cacheRead),
  cacheCreationInputTokens: BigInt(cacheWrite),
  cacheCreation5mInputTokens: 0n,
  cacheCreation1hInputTokens: 0n,
  reasoningOutputTokens: BigInt(reasoning),
  billableInputTokens: BigInt(input),
  billableOutputTokens: BigInt(output),
});

const costFields = ({ inputCost, outputCost, totalCost }) => ({
  estimatedApiInputCost: inputCost,
  estimatedApiStandardInputCost: inputCost,
  estimatedApiCacheReadInputCost: inputCost == null ? null : 0,
  estimatedApiCacheCreationInputCost: inputCost == null ? null : 0,
  estimatedApiCacheCreation5mInputCost: inputCost == null ? null : 0,
  estimatedApiCacheCreation1hInputCost: inputCost == null ? null : 0,
  estimatedApiOutputCost: outputCost,
  estimatedApiReasoningOutputCost: outputCost == null ? null : 0,
  estimatedApiTotalCost: totalCost,
});

const facetData = ({
  bucketStart,
  identity,
  input,
  output,
  standard,
  cacheRead = 0,
  cacheWrite = 0,
  reasoning = 0,
  cacheState,
  status,
  currency,
  inputCost,
  outputCost,
  totalCost,
  missing = [],
}) => ({
  bucketStart,
  facetKey: opaqueKey('fixture-facet', [identity.key, cacheState, status, currency, missing.join(',')]),
  identityKey: opaqueKey('identity', [identity.runtimeKind, identity.modelProvider, identity.providerName, identity.modelIdentifier, null]),
  providerKey: opaqueKey('provider', [identity.modelProvider, identity.providerName]),
  modelKey: opaqueKey('model', [identity.modelIdentifier, null]),
  runtimeKind: identity.runtimeKind,
  modelProvider: identity.modelProvider,
  providerName: identity.providerName,
  modelIdentifier: identity.modelIdentifier,
  modelValue: null,
  cacheState,
  pricingSummaryJson: JSON.stringify(pricingSummary({ status, currency, missing })),
  ...tokenFields({ input, output, standard, cacheRead, cacheWrite, reasoning }),
  ...costFields({ inputCost, outputCost, totalCost }),
  usageReportCount: 1n,
  latestObservedAt: new Date(bucketStart.getTime() + 12 * 3_600_000),
});

const runRecordData = ({
  runId,
  rootTeamRunId = null,
  teamName = null,
  agentName,
  memberDisplayName = null,
  runSummary,
  createdAt,
  observedAt,
  runtimeKind,
  modelProvider,
  providerName,
  modelIdentifier,
  input,
  output,
  standard,
  cacheRead,
  reasoning,
  inputCost,
  outputCost,
  totalCost,
}) => ({
  runId,
  revision: 1n,
  persistedAt: observedAt,
  rootTeamRunId,
  rootAttributionStatus: rootTeamRunId ? 'single' : 'unknown',
  agentDefinitionId: null,
  workspaceId: 'e2e-workspace',
  taskId: null,
  teamName,
  agentName,
  runSummary,
  runCreatedAt: createdAt,
  memberDisplayName,
  firstObservedAt: createdAt ?? observedAt,
  latestObservedAt: observedAt,
  latestObservationGeneration: 0,
  latestObservationOrdinal: 1n,
  usageReportCount: 3n,
  ...tokenFields({ input, output, standard, cacheRead, reasoning }),
  ...costFields({ inputCost, outputCost, totalCost }),
  cacheState: cacheRead > 0 ? 'positive' : 'zero_reported',
  currency: 'USD',
  apiCostStatus: 'estimated',
  pricingSummaryJson: JSON.stringify(pricingSummary({ status: 'estimated', currency: 'USD' })),
  qualityFlagsJson: '[]',
  latestRuntimeKind: runtimeKind,
  latestModelProvider: modelProvider,
  latestProviderName: providerName,
  latestModelIdentifier: modelIdentifier,
  latestModelValue: null,
  identitySummaryJson: JSON.stringify(identitySummary({
    runtimeKind,
    modelProvider,
    providerName,
    modelIdentifier,
    rootTeamRunId,
  })),
  latestPromptTokens: 256n,
  effectiveContextWindowTokens: 128_000n,
  contextWindowUsagePercent: 0.2,
  snapshotSeriesStateJson: '[]',
  recentIdempotencyDigestsJson: '[]',
});

export const seedTokenStatisticsFixture = async ({ serverDir, databaseUrl, now = new Date() }) => {
  const require = createRequire(path.join(serverDir, 'package.json'));
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const today = dayStart(now);
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const dayOfMonth = today.getUTCDate();
  const coverageDay = Math.min(11, Math.max(1, dayOfMonth - 1));
  const coverageStart = addDays(monthStart, coverageDay - 1);
  const fixtureDays = Math.max(1, dayOfMonth - coverageDay + 1);

  const identities = {
    complete: { key: 'complete', runtimeKind: 'autobyteus', modelProvider: 'OPENAI', providerName: 'OpenAI E2E', modelIdentifier: 'gpt-e2e-complete' },
    partial: { key: 'partial', runtimeKind: 'claude_agent_sdk', modelProvider: 'ANTHROPIC', providerName: 'Partial E2E', modelIdentifier: 'claude-e2e-partial' },
    eur: { key: 'eur', runtimeKind: 'autobyteus', modelProvider: 'OPENAI', providerName: 'Euro E2E', modelIdentifier: 'gpt-e2e-eur' },
    local: { key: 'local', runtimeKind: 'ollama', modelProvider: 'OLLAMA', providerName: 'Local E2E', modelIdentifier: 'local-e2e' },
    zero: { key: 'zero', runtimeKind: 'autobyteus', modelProvider: 'OPENAI', providerName: 'Zero Cache E2E', modelIdentifier: 'gpt-e2e-zero-cache' },
    notReported: { key: 'not-reported', runtimeKind: 'autobyteus', modelProvider: 'OPENAI', providerName: 'No Cache Report E2E', modelIdentifier: 'gpt-e2e-no-cache-report' },
    unknown: { key: 'unknown', runtimeKind: 'custom_runtime', modelProvider: 'CUSTOM', providerName: 'Unknown Cache E2E', modelIdentifier: 'custom-e2e-unknown-cache' },
  };

  try {
    await prisma.tokenUsageAnalyticsCoverage.create({ data: { id: 1, coverageStart } });
    for (let index = 0; index < fixtureDays; index += 1) {
      const bucketStart = addDays(coverageStart, index);
      await prisma.tokenUsageAnalyticsDailyFacet.create({ data: facetData({
        bucketStart,
        identity: identities.complete,
        input: 1_000 + index * 10,
        output: 250 + index,
        standard: 600 + index * 10,
        cacheRead: 400,
        reasoning: 50,
        cacheState: 'positive',
        status: 'estimated',
        currency: 'USD',
        inputCost: 0.01 + index * 0.001,
        outputCost: 0.02,
        totalCost: 0.03 + index * 0.001,
      }) });
    }

    const partialDays = [1, 2, 3].map((offset) => addDays(coverageStart, Math.min(offset, fixtureDays - 1)));
    for (const [index, bucketStart] of partialDays.entries()) {
      const priced = index !== 1;
      await prisma.tokenUsageAnalyticsDailyFacet.create({ data: facetData({
        bucketStart,
        identity: { ...identities.partial, key: `${identities.partial.key}-${index}` },
        input: 500,
        output: 100,
        standard: 500,
        cacheState: 'not_reported',
        status: priced ? 'estimated' : 'price_missing',
        currency: priced ? 'USD' : null,
        inputCost: priced ? 0.01 : null,
        outputCost: priced ? 0.02 : null,
        totalCost: priced ? 0.03 : null,
        missing: priced ? [] : ['standard_input', 'output'],
      }) });
    }

    const singleDay = addDays(coverageStart, Math.min(4, fixtureDays - 1));
    const additional = [
      facetData({ bucketStart: singleDay, identity: identities.eur, input: 300, output: 60, standard: 300, cacheState: 'not_reported', status: 'estimated', currency: 'EUR', inputCost: 0.02, outputCost: 0.01, totalCost: 0.03 }),
      facetData({ bucketStart: singleDay, identity: identities.local, input: 400, output: 80, standard: 400, cacheState: 'unsupported_or_local', status: 'local_no_api_bill', currency: null, inputCost: 0, outputCost: 0, totalCost: 0 }),
      facetData({ bucketStart: singleDay, identity: identities.zero, input: 500, output: 100, standard: 500, cacheState: 'zero_reported', status: 'estimated', currency: 'USD', inputCost: 0.01, outputCost: 0.01, totalCost: 0.02 }),
      facetData({ bucketStart: singleDay, identity: identities.notReported, input: 500, output: 100, standard: 500, cacheState: 'not_reported', status: 'estimated', currency: 'USD', inputCost: 0.01, outputCost: 0.01, totalCost: 0.02 }),
      facetData({ bucketStart: singleDay, identity: identities.unknown, input: 500, output: 100, standard: 500, cacheState: 'unknown', status: 'price_missing', currency: null, inputCost: null, outputCost: null, totalCost: null, missing: ['standard_input', 'output'] }),
    ];
    for (const data of additional) await prisma.tokenUsageAnalyticsDailyFacet.create({ data });

    const teamRunId = 'e2e-team-run-001';
    const createdAt = addDays(today, -4);
    const observedAt = addDays(today, -1);
    const runs = [
      runRecordData({ runId: 'e2e-team-member-a', rootTeamRunId: teamRunId, teamName: 'E2E Product Team', agentName: 'Researcher', memberDisplayName: '/researcher', runSummary: 'Evidence review', createdAt, observedAt, runtimeKind: 'codex_app_server', modelProvider: 'OPENAI', providerName: 'OpenAI E2E', modelIdentifier: 'gpt-e2e-complete', input: 900, output: 300, standard: 500, cacheRead: 400, reasoning: 80, inputCost: 0.20, outputCost: 0.30, totalCost: 0.50 }),
      runRecordData({ runId: 'e2e-team-member-b', rootTeamRunId: teamRunId, teamName: 'E2E Product Team', agentName: 'Writer', memberDisplayName: '/writer', runSummary: 'Validation report', createdAt, observedAt, runtimeKind: 'claude_agent_sdk', modelProvider: 'ANTHROPIC', providerName: 'Anthropic', modelIdentifier: 'claude-e2e-partial', input: 600, output: 200, standard: 500, cacheRead: 100, reasoning: 40, inputCost: 0.10, outputCost: 0.20, totalCost: 0.30 }),
      runRecordData({ runId: 'e2e-standalone', agentName: 'Standalone Assistant', runSummary: 'Fallback creation evidence', createdAt: null, observedAt: addDays(today, -5), runtimeKind: 'autobyteus', modelProvider: 'OPENAI', providerName: 'OpenAI E2E', modelIdentifier: 'gpt-e2e-complete', input: 300, output: 100, standard: 250, cacheRead: 50, reasoning: 20, inputCost: 0.05, outputCost: 0.05, totalCost: 0.10 }),
    ];
    for (const data of runs) await prisma.tokenUsageRunRecord.create({ data });

    return {
      now: today.toISOString(),
      monthStart: monthStart.toISOString(),
      dayOfMonth,
      coverageStart: coverageStart.toISOString(),
      fixtureDays,
      identities,
      runRange: { start: addDays(today, -7).toISOString().slice(0, 10), end: today.toISOString().slice(0, 10) },
      teamRunId,
    };
  } finally {
    await prisma.$disconnect();
  }
};
