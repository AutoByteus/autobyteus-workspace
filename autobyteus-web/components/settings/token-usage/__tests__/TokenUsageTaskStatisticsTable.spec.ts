import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import TokenUsageTaskStatisticsTable from '../TokenUsageTaskStatisticsTable.vue';
import type { TokenUsageCostSummaryAggregate, TokenUsageTaskStatisticsRow } from '~/types/tokenUsageStatistics';

const { translate } = vi.hoisted(() => {
  const messages: Record<string, string> = {
    'settings.components.settings.TokenUsageStatistics.createdTime': 'Created Time',
    'settings.components.settings.TokenUsageStatistics.taskRun': 'Task / Run',
    'settings.components.settings.TokenUsageStatistics.runtime': 'Runtime',
    'settings.components.settings.TokenUsageStatistics.models': 'Model(s)',
    'settings.components.settings.TokenUsageStatistics.input': 'Input',
    'settings.components.settings.TokenUsageStatistics.output': 'Output',
    'settings.components.settings.TokenUsageStatistics.inputCost': 'Input Cost',
    'settings.components.settings.TokenUsageStatistics.outputCost': 'Output Cost',
    'settings.components.settings.TokenUsageStatistics.total_cost': 'Total Cost',
    'settings.components.settings.TokenUsageStatistics.sortByColumnAscending': 'Sort {column} ascending',
    'settings.components.settings.TokenUsageStatistics.sortByColumnDescending': 'Sort {column} descending',
    'settings.components.settings.TokenUsageStatistics.showCostDetailsForRow': 'Show cost details for {row}, total cost {cost}',
    'settings.components.settings.TokenUsageStatistics.hideCostDetailsForRow': 'Hide cost details for {row}, total cost {cost}',
    'settings.components.settings.TokenUsageStatistics.firstUsageObserved': 'First usage observed',
    'settings.components.settings.TokenUsageStatistics.collapseTeam': 'Collapse team',
    'settings.components.settings.TokenUsageStatistics.expandTeam': 'Expand team',
    'settings.components.settings.TokenUsageStatistics.teamIdSuffix': 'team {id}',
    'settings.components.settings.TokenUsageStatistics.runIdSuffix': 'run {id}',
    'settings.components.settings.TokenUsageStatistics.memberRunIdSuffix': 'member run {id}',
    'settings.components.settings.TokenUsageStatistics.taskTeamRunIdSuffix': 'task team {id}',
    'settings.components.settings.TokenUsageStatistics.taskAgentRunIdSuffix': 'task agent {id}',
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

  return { translate };
});

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
  memberRouteKey: null,
  memberAgentRunId: null,
  taskAgentRunId: null,
  taskTeamRunId: null,
  taskId: null,
  executionAddress: null,
  displayName: 'Standalone Agent',
  summary: 'prototype settings statistics UI',
  createdAt: '2041-07-01T10:30:00.000Z',
  createdTimeSource: 'FIRST_USAGE_OBSERVED',
  models: ['gpt-shared'],
  modelDisplayNames: ['gpt-shared'],
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
  children: [],
}, {
  rowId: 'team:team-run',
  rowKind: 'TEAM_RUN',
  runId: null,
  rootTeamRunId: 'team-run-987654321',
  memberRouteKey: null,
  memberAgentRunId: null,
  taskAgentRunId: null,
  taskTeamRunId: null,
  taskId: null,
  executionAddress: null,
  displayName: 'Software Engineering Team',
  summary: 'investigate token costs',
  createdAt: '2041-07-01T11:00:00.000Z',
  createdTimeSource: 'RUN_HISTORY',
  models: ['gpt-shared', 'deepseek-v4-flash'],
  modelDisplayNames: ['gpt-shared', 'DeepSeek:deepseek-v4-flash'],
  runtimeKinds: ['codex_app_server', 'autobyteus'],
  aggregate: buildAggregate(),
  children: [{
    rowId: 'team:team-run:member:solution_designer',
    memberRouteKey: 'solution_designer',
    memberAgentRunId: 'member-run-123456789',
    rowKind: 'MEMBER_RUN',
    runId: 'member-run-123456789',
    rootTeamRunId: 'team-run-987654321',
    taskAgentRunId: null,
    taskTeamRunId: null,
    taskId: null,
    executionAddress: { segments: [{ kind: 'member', memberRouteKey: 'solution_designer' }] },
    displayName: 'solution_designer',
    summary: null,
    createdAt: '2041-07-01T11:01:00.000Z',
    createdTimeSource: 'FIRST_USAGE_OBSERVED',
    models: ['gpt-shared'],
    modelDisplayNames: ['gpt-shared'],
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
    children: [],
  }, {
    rowId: 'team:team-run:member:implementation_engineer',
    memberRouteKey: 'implementation_engineer',
    memberAgentRunId: 'member-run-223456789',
    rowKind: 'MEMBER_RUN',
    runId: 'member-run-223456789',
    rootTeamRunId: 'team-run-987654321',
    taskAgentRunId: null,
    taskTeamRunId: null,
    taskId: null,
    executionAddress: { segments: [{ kind: 'member', memberRouteKey: 'implementation_engineer' }] },
    displayName: 'implementation_engineer',
    summary: null,
    createdAt: '2041-07-01T11:02:00.000Z',
    createdTimeSource: 'FIRST_USAGE_OBSERVED',
    models: ['deepseek-v4-flash'],
    modelDisplayNames: ['DeepSeek:deepseek-v4-flash'],
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
    children: [],
  }],
}];

const normalizedText = (text: string): string => text.replace(/\s+/g, ' ').trim();

const topLevelRowTexts = (wrapper: ReturnType<typeof mount>) => wrapper.findAll('tbody > tr')
  .map((row) => row.text())
  .filter((text) => !text.includes('↳') && !text.includes('Cost breakdown'));

describe('TokenUsageTaskStatisticsTable', () => {
  it('renders exact primary token counts while keeping explanatory sublines compact', () => {
    const largeRows: TokenUsageTaskStatisticsRow[] = [{
      ...rows[0]!,
      aggregate: buildAggregate({
        grossInputTokens: 3_136_827_911,
        cacheReadInputTokens: 3_136_827_911,
        outputTokens: 3_136_827_941,
        reasoningOutputTokens: 3_136_827_911,
        totalTokens: 6_273_655_852,
        cacheReadInputTokenRate: 1,
      }),
    }];
    const wrapper = mount(TokenUsageTaskStatisticsTable, { props: { rows: largeRows } });

    const tokenCells = wrapper.find('tbody > tr').findAll('td');
    const inputCellText = normalizedText(tokenCells[3]!.text());
    const outputCellText = normalizedText(tokenCells[4]!.text());
    const inputPrimaryText = normalizedText(tokenCells[3]!.find('div').text());
    const outputPrimaryText = normalizedText(tokenCells[4]!.find('div').text());
    const inputSublineText = normalizedText(tokenCells[3]!.findAll('div')[1]!.text());
    const outputSublineText = normalizedText(tokenCells[4]!.findAll('div')[1]!.text());

    expect(inputPrimaryText.replace(/[^0-9]/g, '')).toBe('3136827911');
    expect(outputPrimaryText.replace(/[^0-9]/g, '')).toBe('3136827941');
    expect(inputSublineText).toContain('cached');
    expect(inputSublineText.replace(/[^0-9]/g, '')).not.toContain('3136827911');
    expect(outputSublineText).toContain('thinking included');
    expect(outputSublineText.replace(/[^0-9]/g, '')).not.toContain('3136827911');
    expect(inputCellText).toContain(inputPrimaryText);
    expect(outputCellText).toContain(outputPrimaryText);
  });

  it('sorts task rows by created time by default and labels fallback timestamps', () => {
    const wrapper = mount(TokenUsageTaskStatisticsTable, { props: { rows } });

    const headerCells = wrapper.findAll('thead th');
    const headers = headerCells.map((header) => header.text());
    expect(headers).toHaveLength(9);
    expect(headers[0]).toMatch(/task.*run/i);
    expect(headers[1]).toMatch(/runtime/i);
    expect(headers[2]).toMatch(/models?/i);
    expect(headers[3]).toMatch(/input/i);
    expect(headers[4]).toMatch(/output/i);
    expect(headers[5]).toMatch(/input cost/i);
    expect(headers[6]).toMatch(/output cost/i);
    expect(headers[7]).toMatch(/total cost/i);
    expect(headers[8]).toMatch(/created time/i);
    expect(headers).not.toContain('Type');
    expect(headers).not.toContain('Status');
    expect(headerCells[0]!.attributes('aria-sort')).toBe('none');
    expect(headerCells[8]!.attributes('aria-sort')).toBe('descending');
    expect(headerCells[2]!.find('button').exists()).toBe(false);
    expect(headerCells[5]!.find('button').exists()).toBe(false);
    expect(headerCells[6]!.find('button').exists()).toBe(false);
    expect(wrapper.findAll('thead button')).toHaveLength(6);
    expect(wrapper.findAll('[data-sort-indicator]')).toHaveLength(6);
    expect(headerCells[8]!.find('button').attributes('aria-label')).toMatch(/ascending/i);

    const firstDataCells = wrapper.findAll('tbody > tr')[0]!.findAll('td');
    expect(firstDataCells).toHaveLength(9);
    expect(firstDataCells[1]!.text()).toContain('Mixed: Codex, Autobyteus');
    const bodyButtons = wrapper.findAll('tbody button');
    expect(bodyButtons).toHaveLength(3);
    expect(bodyButtons.filter((button) => button.attributes('aria-label')?.includes('cost details'))).toHaveLength(2);

    const topRows = topLevelRowTexts(wrapper);
    expect(topRows[0]).toContain('Software Engineering Team');
    expect(topRows[1]).toContain('Standalone Agent');
    expect(wrapper.text()).toContain('First usage observed');
    expect(wrapper.text()).toContain('Mixed: Codex, Autobyteus');
    expect(wrapper.text()).toContain('Mixed: gpt-shared, DeepSeek:deepseek-v4-flash');
    expect(wrapper.text()).toContain('cache hit 25.0%');
    expect(wrapper.text()).toContain('5 thinking included');
    expect(wrapper.text()).toContain('partial est.');
    expect(wrapper.text()).not.toContain('Complete');
  });

  it('expands team members, keeps members attached after total-cost sorting, and shows cost details', async () => {
    const wrapper = mount(TokenUsageTaskStatisticsTable, { props: { rows } });

    await wrapper.findAll('button').find((button) => button.text() === '▸')!.trigger('click');
    expect(wrapper.text()).toContain('↳ solution_designer');
    expect(wrapper.text()).toContain('↳ implementation_engineer');
    expect(wrapper.text()).not.toContain('↳ architecture_reviewer');
    expect(wrapper.text()).not.toContain('No usage in period');
    expect(wrapper.text()).not.toContain('Team roster');
    expect(topLevelRowTexts(wrapper)).toHaveLength(2);

    await wrapper.findAll('thead button').find((button) => button.text().toLowerCase().includes('total cost'))!.trigger('click');
    await nextTick();
    const tableText = wrapper.text();
    const agentIndex = tableText.indexOf('Standalone Agent');
    const teamIndex = tableText.indexOf('Software Engineering Team');
    const memberIndex = tableText.indexOf('↳ solution_designer');
    expect(agentIndex).toBeGreaterThanOrEqual(0);
    expect(teamIndex).toBeGreaterThan(agentIndex);
    expect(memberIndex).toBeGreaterThan(teamIndex);

    const detailButton = wrapper.findAll('tbody button')
      .find((button) => button.attributes('aria-label')?.startsWith('Show cost details for Standalone Agent'))!;
    const visibleCost = normalizedText(detailButton.text());
    const detailLabel = detailButton.attributes('aria-label')!;
    expect(visibleCost).toMatch(/2\.20|2\.2/);
    expect(visibleCost).toContain('partial est.');
    expect(detailLabel).toContain(visibleCost);
    expect(detailLabel).toContain('partial est.');
    expect(detailButton.find('[data-cost-detail-indicator]').exists()).toBe(true);
    expect(detailButton.attributes('aria-expanded')).toBe('false');

    await detailButton.trigger('click');
    await nextTick();
    const expandedDetailButton = wrapper.findAll('tbody button')
      .find((button) => button.attributes('aria-label')?.startsWith('Hide cost details for Standalone Agent'))!;
    const expandedVisibleCost = normalizedText(expandedDetailButton.text());
    const expandedDetailLabel = expandedDetailButton.attributes('aria-label')!;
    expect(expandedDetailLabel).toContain(expandedVisibleCost);
    expect(expandedDetailLabel).toContain('partial est.');
    expect(expandedDetailButton.find('[data-cost-detail-indicator]').exists()).toBe(true);
    expect(expandedDetailButton.attributes('aria-expanded')).toBe('true');
    const detailRow = wrapper.find('tbody tr[id^="token-usage-cost-details"]');
    expect(detailRow.exists()).toBe(true);
    expect(detailRow.find('td').attributes('colspan')).toBe('9');
    expect(wrapper.text()).toContain('Cost breakdown');
    expect(wrapper.text()).toContain('Uncached input');
    expect(wrapper.text()).toContain('Cache hits');
    expect(wrapper.text()).toContain('Cache writes');
    expect(wrapper.text()).toMatch(/Thinking tokens included in output|Thinking included plain/);
    expect(wrapper.text()).toContain('included');
    expect(wrapper.text()).toContain('Missing price dimensions: cache_creation_price');
  });
});
