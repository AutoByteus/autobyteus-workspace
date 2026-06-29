import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import TokenUsageTaskStatisticsTable from '../TokenUsageTaskStatisticsTable.vue';
import type { TokenUsageCostSummaryAggregate, TokenUsageTaskStatisticsRow } from '~/types/tokenUsageStatistics';

const messages: Record<string, string> = {
  'settings.components.settings.TokenUsageStatistics.createdTime': 'Created Time',
  'settings.components.settings.TokenUsageStatistics.taskRun': 'Task / Run',
  'settings.components.settings.TokenUsageStatistics.type': 'Type',
  'settings.components.settings.TokenUsageStatistics.runtime': 'Runtime',
  'settings.components.settings.TokenUsageStatistics.models': 'Model(s)',
  'settings.components.settings.TokenUsageStatistics.input': 'Input',
  'settings.components.settings.TokenUsageStatistics.output': 'Output',
  'settings.components.settings.TokenUsageStatistics.inputCost': 'Input Cost',
  'settings.components.settings.TokenUsageStatistics.outputCost': 'Output Cost',
  'settings.components.settings.TokenUsageStatistics.total_cost': 'Total Cost',
  'settings.components.settings.TokenUsageStatistics.status': 'Status',
  'settings.components.settings.TokenUsageStatistics.firstUsageObserved': 'First usage observed',
  'settings.components.settings.TokenUsageStatistics.collapseTeam': 'Collapse team',
  'settings.components.settings.TokenUsageStatistics.expandTeam': 'Expand team',
  'settings.components.settings.TokenUsageStatistics.team': 'Team',
  'settings.components.settings.TokenUsageStatistics.agent': 'Agent',
  'settings.components.settings.TokenUsageStatistics.member': 'Member',
  'settings.components.settings.TokenUsageStatistics.teamIdSuffix': 'team {id}',
  'settings.components.settings.TokenUsageStatistics.runIdSuffix': 'run {id}',
  'settings.components.settings.TokenUsageStatistics.memberRunIdSuffix': 'member run {id}',
  'settings.components.settings.TokenUsageStatistics.unknown': 'Unknown',
  'settings.components.settings.TokenUsageStatistics.mixedWithValues': 'Mixed: {values}',
  'settings.components.settings.TokenUsageStatistics.cacheHitWithCached': 'cache hit {percent} · {cached} cached',
  'settings.components.settings.TokenUsageStatistics.noCacheData': 'no cache data',
  'settings.components.settings.TokenUsageStatistics.thinkingIncluded': '{tokens} thinking included',
  'settings.components.settings.TokenUsageStatistics.costBreakdown': 'Cost breakdown',
  'settings.components.settings.TokenUsageStatistics.usageReports': '{count} usage reports',
  'settings.components.settings.TokenUsageStatistics.inputBreakdown': 'Input breakdown',
  'settings.components.settings.TokenUsageStatistics.tokens': 'Tokens',
  'settings.components.settings.TokenUsageStatistics.cost': 'Cost',
  'settings.components.settings.TokenUsageStatistics.outputBreakdown': 'Output breakdown',
  'settings.components.settings.TokenUsageStatistics.outputTokens': 'Output tokens',
  'settings.components.settings.TokenUsageStatistics.thinkingIncludedPlain': 'Thinking tokens included in output',
  'settings.components.settings.TokenUsageStatistics.included': 'included',
  'settings.components.settings.TokenUsageStatistics.estimatedApiCost': 'Estimated API cost',
  'settings.components.settings.TokenUsageStatistics.missingPriceDimensions': 'Missing price dimensions',
  'shell.tokenUsage.unknown': 'unknown',
  'shell.tokenUsage.unpriced': 'price missing',
  'shell.tokenUsage.partialEstimateSuffix': 'partial est.',
  'shell.tokenUsage.mixedEstimateSuffix': 'mixed est.',
  'shell.tokenUsage.priceStatusComplete': 'Complete',
  'shell.tokenUsage.priceStatusPartial': 'Partial',
  'shell.tokenUsage.priceStatusMissing': 'Missing',
  'shell.tokenUsage.priceStatusLocal': 'Local',
  'shell.tokenUsage.priceStatusMixed': 'Mixed',
  'shell.tokenUsage.cacheUnsupportedLocal': 'Local runtime; no provider cache bill',
  'shell.tokenUsage.uncachedInput': 'Uncached input',
  'shell.tokenUsage.cacheHits': 'Cache hits',
  'shell.tokenUsage.cacheWrites': 'Cache writes',
  'shell.tokenUsage.totalInputCost': 'Total input cost',
};

const translate = (key: string, params?: Record<string, string | number>) => {
  const template = messages[key] ?? key;
  return Object.entries(params ?? {}).reduce(
    (text, [name, value]) => text.replace(`{${name}}`, String(value)).replace(`{{${name}}}`, String(value)),
    template,
  );
};

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({ t: translate }),
}));

const buildAggregate = (overrides: Partial<TokenUsageCostSummaryAggregate> = {}): TokenUsageCostSummaryAggregate => ({
  grossInputTokens: 160,
  standardInputTokens: 120,
  cacheMissInputTokens: 120,
  cacheReadInputTokens: 40,
  cacheCreationInputTokens: 0,
  cacheCreation5mInputTokens: 0,
  cacheCreation1hInputTokens: 0,
  outputTokens: 18,
  reasoningOutputTokens: 5,
  billableOutputTokens: 18,
  totalTokens: 178,
  cacheReadInputTokenRate: 0.25,
  standardInputTokenRate: 0.75,
  cacheCreationInputTokenRate: 0,
  cacheState: 'positive',
  estimatedApiInputCost: 1.6,
  estimatedApiStandardInputCost: 1.2,
  estimatedApiCacheReadInputCost: 0.4,
  estimatedApiCacheCreationInputCost: 0,
  estimatedApiCacheCreation5mInputCost: 0,
  estimatedApiCacheCreation1hInputCost: 0,
  estimatedApiOutputCost: 0.18,
  estimatedApiReasoningOutputCost: 0.05,
  estimatedApiTotalCost: 1.78,
  currency: 'USD',
  apiCostStatus: 'estimated',
  missingPriceDimensions: [],
  pricingPolicyKey: 'catalog:test:gpt-shared',
  selectedPricingTierId: null,
  usageReportCount: 2,
  updatedAt: '2041-07-01T11:05:00.000Z',
  observedRuntimeKinds: ['autobyteus', 'codex_app_server'],
  observedModelIdentifiers: ['gpt-shared'],
  observedModelProviders: ['OPENAI'],
  ...overrides,
});

const rows: TokenUsageTaskStatisticsRow[] = [{
  rowId: 'agent:standalone-run',
  rowKind: 'AGENT_RUN',
  runId: 'standalone-run-123456789',
  rootTeamRunId: null,
  displayName: 'Standalone Agent',
  summary: 'prototype settings statistics UI',
  workspaceName: 'autobyteus-workspace-superrepo',
  workspaceRootPath: '/workspaces/autobyteus-workspace-superrepo',
  createdAt: '2041-07-01T10:30:00.000Z',
  createdTimeSource: 'FIRST_USAGE_OBSERVED',
  models: ['gpt-shared'],
  runtimeKinds: ['codex_app_server'],
  aggregate: buildAggregate({
    grossInputTokens: 200,
    standardInputTokens: 140,
    cacheReadInputTokens: 60,
    outputTokens: 20,
    reasoningOutputTokens: 4,
    totalTokens: 220,
    cacheReadInputTokenRate: 0.3,
    estimatedApiInputCost: 2.0,
    estimatedApiStandardInputCost: 1.4,
    estimatedApiCacheReadInputCost: 0.6,
    estimatedApiOutputCost: 0.2,
    estimatedApiReasoningOutputCost: 0.04,
    estimatedApiTotalCost: 2.2,
    apiCostStatus: 'partial_price_missing',
    missingPriceDimensions: ['cache_creation_price'],
    usageReportCount: 1,
  }),
  members: [],
}, {
  rowId: 'team:team-run',
  rowKind: 'TEAM_RUN',
  runId: null,
  rootTeamRunId: 'team-run-987654321',
  displayName: 'Software Engineering Team',
  summary: 'investigate token costs',
  workspaceName: 'autobyteus-workspace-superrepo',
  workspaceRootPath: '/workspaces/autobyteus-workspace-superrepo',
  createdAt: '2041-07-01T11:00:00.000Z',
  createdTimeSource: 'RUN_HISTORY',
  models: ['gpt-shared', 'deepseek-v4-flash'],
  runtimeKinds: ['codex_app_server', 'autobyteus'],
  aggregate: buildAggregate(),
  members: [{
    rowId: 'team:team-run:member:solution_designer',
    memberRouteKey: 'solution_designer',
    memberAgentRunId: 'member-run-123456789',
    memberName: 'solution_designer',
    memberPath: ['solution_designer'],
    agentDefinitionId: 'solution-designer',
    createdAt: '2041-07-01T11:00:00.000Z',
    createdTimeSource: 'FIRST_USAGE_OBSERVED',
    models: ['gpt-shared'],
    runtimeKinds: ['codex_app_server'],
    aggregate: buildAggregate({
      grossInputTokens: 100,
      standardInputTokens: 60,
      cacheReadInputTokens: 40,
      outputTokens: 10,
      reasoningOutputTokens: 2,
      totalTokens: 110,
      estimatedApiInputCost: 1.0,
      estimatedApiStandardInputCost: 0.8,
      estimatedApiCacheReadInputCost: 0.2,
      estimatedApiOutputCost: 0.1,
      estimatedApiReasoningOutputCost: 0.02,
      estimatedApiTotalCost: 1.1,
      usageReportCount: 1,
    }),
  }, {
    rowId: 'team:team-run:member:implementation_engineer',
    memberRouteKey: 'implementation_engineer',
    memberAgentRunId: 'member-run-223456789',
    memberName: 'implementation_engineer',
    memberPath: ['implementation_engineer'],
    agentDefinitionId: 'implementation-engineer',
    createdAt: '2041-07-01T11:05:00.000Z',
    createdTimeSource: 'RUN_HISTORY',
    models: ['deepseek-v4-flash'],
    runtimeKinds: ['autobyteus'],
    aggregate: buildAggregate({
      grossInputTokens: 60,
      standardInputTokens: 60,
      cacheReadInputTokens: 0,
      outputTokens: 8,
      reasoningOutputTokens: 3,
      totalTokens: 68,
      cacheReadInputTokenRate: 0,
      estimatedApiInputCost: 0.6,
      estimatedApiStandardInputCost: 0.6,
      estimatedApiCacheReadInputCost: 0,
      estimatedApiOutputCost: 0.08,
      estimatedApiReasoningOutputCost: 0.03,
      estimatedApiTotalCost: 0.68,
      usageReportCount: 1,
    }),
  }],
}];

const topLevelRowTexts = (wrapper: ReturnType<typeof mount>) => wrapper.findAll('tbody > tr')
  .map((row) => row.text())
  .filter((text) => !text.includes('↳') && !text.includes('Cost breakdown'));

describe('TokenUsageTaskStatisticsTable', () => {
  it('sorts task rows by created time by default and labels fallback timestamps', () => {
    const wrapper = mount(TokenUsageTaskStatisticsTable, { props: { rows } });

    const topRows = topLevelRowTexts(wrapper);
    expect(topRows[0]).toContain('Software Engineering Team');
    expect(topRows[1]).toContain('Standalone Agent');
    expect(wrapper.text()).toContain('First usage observed');
    expect(wrapper.text()).toContain('Mixed: Codex, Autobyteus');
    expect(wrapper.text()).toContain('Mixed: gpt-shared, deepseek-v4-flash');
    expect(wrapper.text()).toContain('cache hit 25.0%');
    expect(wrapper.text()).toContain('5 thinking included');
    expect(wrapper.text()).toContain('partial est.');
  });

  it('expands team members, keeps members attached after total-cost sorting, and shows cost details', async () => {
    const wrapper = mount(TokenUsageTaskStatisticsTable, { props: { rows } });

    await wrapper.findAll('button').find((button) => button.text() === '▸')!.trigger('click');
    expect(wrapper.text()).toContain('↳ solution_designer');
    expect(wrapper.text()).toContain('↳ implementation_engineer');
    expect(topLevelRowTexts(wrapper)).toHaveLength(2);

    await wrapper.findAll('button').find((button) => button.text().toLowerCase().includes('total cost'))!.trigger('click');
    await nextTick();
    const tableText = wrapper.text();
    const agentIndex = tableText.indexOf('Standalone Agent');
    const teamIndex = tableText.indexOf('Software Engineering Team');
    const memberIndex = tableText.indexOf('↳ solution_designer');
    expect(agentIndex).toBeGreaterThanOrEqual(0);
    expect(teamIndex).toBeGreaterThan(agentIndex);
    expect(memberIndex).toBeGreaterThan(teamIndex);

    await wrapper.findAll('button').find((button) => /2\.20|2\.2/.test(button.text()))!.trigger('click');
    expect(wrapper.text()).toContain('Cost breakdown');
    expect(wrapper.text()).toContain('Uncached input');
    expect(wrapper.text()).toContain('Cache hits');
    expect(wrapper.text()).toContain('Cache writes');
    expect(wrapper.text()).toMatch(/Thinking tokens included in output|Thinking included plain/);
    expect(wrapper.text()).toContain('included');
    expect(wrapper.text()).toContain('Missing price dimensions: cache_creation_price');
  });
});
