import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import TokenUsageMeterPanel from '../TokenUsageMeterPanel.vue';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useTokenUsageMeterStore } from '~/stores/tokenUsageMeterStore';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import type { TokenUsageRunSummary } from '~/types/tokenUsageMeter';

const messages: Record<string, string> = {
  'shell.tokenUsage.title': 'Token Meter',
  'shell.tokenUsage.subtitle': 'Live server-accounted usage and estimated API price.',
  'shell.tokenUsage.currentPrompt': 'Current prompt',
  'shell.tokenUsage.contextTokens': 'context tokens',
  'shell.tokenUsage.grossInput': 'Gross input',
  'shell.tokenUsage.output': 'Output',
  'shell.tokenUsage.totalEstimate': 'Total estimate',
  'shell.tokenUsage.tokensLabel': 'Tokens',
  'shell.tokenUsage.tokenShortLabel': 'tok',
  'shell.tokenUsage.costLabel': 'Cost',
  'shell.tokenUsage.estimateLabel': 'Estimate',
  'shell.tokenUsage.thinkingTokensIncluded': 'Thinking {tokens} tokens',
  'shell.tokenUsage.thinkingTokensTooltip': 'Included in output tokens and estimated output cost.',
  'shell.tokenUsage.cacheHitRate': 'Cache hit {percent}',
  'shell.tokenUsage.cacheUnsupportedLocal': 'Local runtime; no provider cache bill',
  'shell.tokenUsage.cacheNotReported': 'Usage reports no cache details',
  'shell.tokenUsage.inputBreakdown': 'Input breakdown',
  'shell.tokenUsage.uncachedInput': 'Uncached input',
  'shell.tokenUsage.cacheHits': 'Cache hits',
  'shell.tokenUsage.cacheWrites': 'Cache writes',
  'shell.tokenUsage.totalInputCost': 'Total input cost',
  'shell.tokenUsage.pricingDetails': 'Pricing details',
  'shell.tokenUsage.priceStatus': 'Price status',
  'shell.tokenUsage.priceStatusComplete': 'Estimated',
  'shell.tokenUsage.priceStatusPartial': 'Partial estimate',
  'shell.tokenUsage.priceStatusMissing': 'Price missing',
  'shell.tokenUsage.priceStatusLocal': 'Local/no API bill',
  'shell.tokenUsage.priceStatusMixed': 'Mixed',
  'shell.tokenUsage.latestModel': 'Latest model:',
  'shell.tokenUsage.runtime': 'Runtime:',
  'shell.tokenUsage.usageReports': 'Usage reports',
  'shell.tokenUsage.usageReportsTooltip': 'Server usage reports received for this summary.',
  'shell.tokenUsage.usageReportsValue': '{count} reports',
  'shell.tokenUsage.missingPriceDimensions': 'Missing price dimensions',
  'shell.tokenUsage.unknown': 'unknown',
  'shell.tokenUsage.unpriced': 'price missing',
  'shell.tokenUsage.loading': 'Loading token usage for the focused run…',
  'shell.tokenUsage.unavailable': 'Token usage is temporarily unavailable for the focused run.',
  'shell.tokenUsage.focusUnavailable': 'Select a leaf team member to view focused token usage.',
  'shell.tokenUsage.teamHeading': 'Team',
  'shell.tokenUsage.teamSubtitle': 'Per-member tokens with estimated API costs. Total cost is input cost plus output cost. Focus a row for full detail above.',
  'shell.tokenUsage.teamMember': 'Member',
  'shell.tokenUsage.focusedBadge': 'Focused',
  'shell.tokenUsage.totalTokens': 'Total tokens',
  'shell.tokenUsage.totalMetric': 'Total',
  'shell.tokenUsage.teamTotal': 'Team total',
  'shell.tokenUsage.teamLoading': 'Loading token usage…',
  'shell.tokenUsage.teamUnavailable': 'Token usage unavailable.',
  'shell.tokenUsage.teamNoUsage': 'No usage reported yet.',
  'shell.tokenUsage.teamNoMembers': 'No leaf team members are available.',
  'shell.tokenUsage.teamTotalLoading': 'Loading team total…',
  'shell.tokenUsage.teamTotalUnavailable': 'Team total is temporarily unavailable.',
  'shell.tokenUsage.inputCost': 'Input cost',
  'shell.tokenUsage.inputCostShort': 'In',
  'shell.tokenUsage.outputCost': 'Output cost',
  'shell.tokenUsage.outputCostShort': 'Out',
  'shell.tokenUsage.empty': 'No token usage has been reported for the active run yet.',
};

const translate = (key: string, params?: Record<string, unknown>) => {
  const template = messages[key] ?? key;
  return Object.entries(params ?? {}).reduce(
    (text, [param, value]) => text.replace(`{${param}}`, String(value)).replace(`{{${param}}}`, String(value)),
    template,
  );
};

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: translate,
  }),
}));

const buildSummary = (overrides: Partial<TokenUsageRunSummary> = {}): TokenUsageRunSummary => ({
  runId: 'run-1',
  rootTeamRunId: null,
  teamRunPath: null,
  memberAgentRunId: null,
  memberPath: null,
  memberRouteKey: null,
  agentDefinitionId: null,
  workspaceId: null,
  grossInputTokens: 1000,
  standardInputTokens: 700,
  cacheMissInputTokens: 700,
  cacheReadInputTokens: 300,
  cacheCreationInputTokens: 0,
  cacheCreation5mInputTokens: 0,
  cacheCreation1hInputTokens: 0,
  outputTokens: 120,
  billableOutputTokens: 153,
  totalTokens: 1153,
  cacheReadInputTokenRate: 0.3,
  standardInputTokenRate: 0.7,
  cacheCreationInputTokenRate: 0,
  cacheState: 'positive',
  reasoningOutputTokens: 33,
  estimatedApiInputCost: 0.002,
  estimatedApiStandardInputCost: 0.0014,
  estimatedApiCacheReadInputCost: 0.0006,
  estimatedApiCacheCreationInputCost: null,
  estimatedApiCacheCreation5mInputCost: null,
  estimatedApiCacheCreation1hInputCost: null,
  estimatedApiOutputCost: 0.0012,
  estimatedApiReasoningOutputCost: 0.00033,
  estimatedApiTotalCost: 0.0032,
  currency: 'USD',
  apiCostStatus: 'estimated',
  missingPriceDimensions: [],
  pricingPolicyKey: 'catalog:openai:gpt-test',
  selectedPricingTierId: null,
  latestPromptTokens: 1000,
  effectiveContextWindowTokens: 128000,
  contextWindowUsagePercent: 0.78125,
  latestModelProvider: 'OPENAI',
  latestModelIdentifier: 'gpt-test',
  latestRuntimeKind: 'autobyteus',
  usageReportCount: 1,
  updatedAt: '2026-06-25T00:00:00.000Z',
  ...overrides,
});

const buildAgentContext = (runId: string, name: string) => {
  const conversation = {
    id: runId,
    messages: [],
    createdAt: '2026-06-25T00:00:00.000Z',
    updatedAt: '2026-06-25T00:00:00.000Z',
    agentDefinitionId: `${name}-definition`,
    agentName: name,
  };
  const state = new AgentRunState(runId, conversation as any);
  state.currentStatus = AgentStatus.Idle;
  return new AgentContext({
    agentDefinitionId: `${name}-definition`,
    agentDefinitionName: name,
    runtimeKind: 'autobyteus',
    llmModelIdentifier: 'gpt-test',
    workspaceId: null,
    workspaceMetadata: null,
    autoExecuteTools: false,
    skillAccessMode: 'PRELOADED_ONLY',
    llmConfig: null,
    isLocked: true,
  } as any, state);
};

const buildAgentMemberNode = (memberRouteKey: string, displayName: string, memberRunId: string) => ({
  memberKind: 'agent',
  memberName: displayName,
  displayName,
  memberPath: [memberRouteKey],
  memberRouteKey,
  memberRunId,
  agentDefinitionId: `${displayName}-definition`,
});

const mountPanel = () => mount(TokenUsageMeterPanel, {
  global: {
    mocks: {
      $t: translate,
    },
  },
});

describe('TokenUsageMeterPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders the approved Token Meter hierarchy with server-owned component values', () => {
    const agentContextsStore = useAgentContextsStore();
    const selectionStore = useAgentSelectionStore();
    const meterStore = useTokenUsageMeterStore();
    agentContextsStore.runs.set('run-1', buildAgentContext('run-1', 'Story Agent'));
    meterStore.upsertSummary(buildSummary());
    selectionStore.setRunSelection('run-1', 'agent');

    const wrapper = mountPanel();
    const primaryText = wrapper.get('[data-test="token-usage-primary"]').text();

    expect(primaryText).toContain('Current prompt');
    expect(primaryText).toContain('Gross input');
    expect(primaryText).toContain('Output');
    expect(primaryText).toContain('Total estimate');
    expect(primaryText).toContain('Input breakdown');
    expect(primaryText).toContain('Uncached input');
    expect(primaryText).toContain('Cache hits');
    expect(primaryText).toContain('Pricing details');
    expect(primaryText).toContain('Usage reports');
    expect(primaryText).toContain('Tokens');
    expect(primaryText).toContain('$0.0020');
    expect(primaryText).toContain('$0.0012');
    expect(primaryText).toContain('$0.0032');
    expect(primaryText).toContain('Thinking 33 tokens');
    expect(primaryText).toContain('Estimated');
    expect(primaryText).toContain('1 reports');
    expect(primaryText).not.toContain('Events');
    expect(wrapper.find('[title="Included in output tokens and estimated output cost."]').exists()).toBe(true);
  });

  it('omits the thinking-token subline when no reasoning tokens are present', () => {
    const agentContextsStore = useAgentContextsStore();
    const selectionStore = useAgentSelectionStore();
    const meterStore = useTokenUsageMeterStore();
    agentContextsStore.runs.set('run-1', buildAgentContext('run-1', 'Story Agent'));
    meterStore.upsertSummary(buildSummary({ reasoningOutputTokens: 0, estimatedApiReasoningOutputCost: null }));
    selectionStore.setRunSelection('run-1', 'agent');

    const wrapper = mountPanel();

    expect(wrapper.get('[data-test="token-usage-primary"]').text()).not.toContain('Thinking');
  });

  it('uses the focused team member as primary and keeps aggregate usage only in the Team section', async () => {
    const selectionStore = useAgentSelectionStore();
    const teamContextsStore = useAgentTeamContextsStore();
    const meterStore = useTokenUsageMeterStore();
    const leadNode = buildAgentMemberNode('lead', 'Lead', 'lead-run');
    const reviewerNode = buildAgentMemberNode('reviewer', 'Reviewer', 'reviewer-run');
    teamContextsStore.teams.set('team-1', {
      teamRunId: 'team-1',
      config: { teamDefinitionId: 'team-def', teamDefinitionName: 'Delivery Team' },
      memberTree: [leadNode, reviewerNode],
      memberNodesByRouteKey: new Map<string, any>([
        ['lead', leadNode],
        ['reviewer', reviewerNode],
      ]),
      leafAgentContextsByRouteKey: new Map<string, any>([
        ['lead', buildAgentContext('lead-run', 'Lead')],
        ['reviewer', buildAgentContext('reviewer-run', 'Reviewer')],
      ]),
      coordinatorMemberRouteKey: 'lead',
      historicalHydration: null,
      focusedMemberRouteKey: 'lead',
      currentStatus: AgentTeamStatus.Running,
      isSubscribed: false,
    } as any);
    meterStore.upsertSummary(buildSummary({
      runId: 'lead-run',
      rootTeamRunId: 'team-1',
      memberRouteKey: 'lead',
      grossInputTokens: 1111,
      outputTokens: 11,
      totalTokens: 1122,
      estimatedApiInputCost: 0.0100,
      estimatedApiOutputCost: null,
      estimatedApiTotalCost: 0.0100,
      apiCostStatus: 'partial_price_missing',
    }));
    meterStore.upsertSummary(buildSummary({
      runId: 'reviewer-run',
      rootTeamRunId: 'team-1',
      memberRouteKey: 'reviewer',
      grossInputTokens: 2222,
      outputTokens: 22,
      totalTokens: 2244,
      estimatedApiInputCost: 0.0200,
      estimatedApiOutputCost: 0.0022,
      estimatedApiTotalCost: 0.0222,
    }));
    meterStore.teamSummaries['team-1'] = buildSummary({
      runId: 'team-1',
      rootTeamRunId: 'team-1',
      grossInputTokens: 9000,
      outputTokens: 900,
      totalTokens: 9900,
      estimatedApiInputCost: 0.0800,
      estimatedApiOutputCost: 0.0190,
      estimatedApiTotalCost: 0.099,
    });
    selectionStore.setRunSelection('team-1', 'team');

    const wrapper = mountPanel();
    expect(wrapper.get('[data-test="gross-input-card"]').text()).toContain('1,111');
    expect(wrapper.get('[data-test="gross-input-card"]').text()).not.toContain('9,000');
    expect(wrapper.get('[data-test="team-token-usage-summary"]').text()).toContain('Team');
    expect(wrapper.get('[data-test="team-token-usage-summary"]').text()).toContain('Lead');
    expect(wrapper.get('[data-test="team-token-usage-summary"]').text()).toContain('Reviewer');
    expect(wrapper.get('[data-test="team-token-usage-summary"]').text()).toContain('Team total');
    const teamSummary = wrapper.get('[data-test="team-token-usage-summary"]');
    expect(teamSummary.text()).toContain('Per-member tokens with estimated API costs.');
    expect(teamSummary.text()).toContain('Total cost is input cost plus output cost.');
    const tableScroll = teamSummary.get('[data-test="team-token-table-scroll"]');
    const teamTable = teamSummary.get('[data-test="team-token-table"]');
    expect(tableScroll.attributes('tabindex')).toBe('0');
    expect(teamTable.findAll('thead th').map((heading) => heading.text())).toEqual([
      'Member',
      'Gross input',
      'Output',
      'Total',
    ]);
    expect(teamTable.findAll('thead th').some((heading) => heading.text() === 'Cost')).toBe(false);
    const initialTableRows = teamTable.find('tbody').findAll('tr');
    expect(initialTableRows[initialTableRows.length - 1].attributes('data-test')).toBe('team-token-total-row');
    expect(initialTableRows[initialTableRows.length - 1].text()).toContain('Team total');
    const totalCells = initialTableRows[initialTableRows.length - 1].findAll('th, td');
    expect(totalCells).toHaveLength(4);
    expect(totalCells[1].text()).toContain('9,000');
    expect(totalCells[1].text()).toContain('$0.0800');
    expect(totalCells[2].text()).toContain('900');
    expect(totalCells[2].text()).toContain('$0.0190');
    expect(totalCells[3].text()).toContain('9,900');
    expect(totalCells[3].text()).toContain('$0.0990');
    expect(totalCells[3].text()).not.toContain('Estimated');
    const leadRow = teamTable.findAll('[data-test="team-token-row"]').find((row) => row.attributes('data-member-route-key') === 'lead');
    expect(leadRow).toBeTruthy();
    expect(leadRow!.text()).toContain('Partial estimate');
    expect(leadRow!.text()).toContain('price missing');
    expect(wrapper.text()).not.toContain('Focused member');
    expect(wrapper.text()).not.toContain('Member tokens');
    expect(wrapper.text()).not.toContain('Member cost');

    teamContextsStore.setFocusedMember('reviewer');
    await nextTick();

    expect(wrapper.get('[data-test="gross-input-card"]').text()).toContain('2,222');
    expect(wrapper.get('[data-test="gross-input-card"]').text()).not.toContain('9,000');
    const rows = wrapper.findAll('[data-test="team-token-row"]');
    const reviewerRow = rows.find((row) => row.attributes('data-member-route-key') === 'reviewer');
    expect(reviewerRow).toBeTruthy();
    const reviewerCells = reviewerRow!.findAll('th, td');
    expect(reviewerRow?.attributes('data-focused')).toBe('true');
    expect(reviewerCells).toHaveLength(4);
    expect(reviewerCells[0].text()).toContain('Reviewer');
    expect(reviewerCells[1].text()).toContain('2,222');
    expect(reviewerCells[1].text()).toContain('$0.0200');
    expect(reviewerCells[2].text()).toContain('22');
    expect(reviewerCells[2].text()).toContain('$0.0022');
    expect(reviewerCells[3].text()).toContain('2,244');
    expect(reviewerCells[3].text()).toContain('$0.0222');
    expect(reviewerCells[3].text()).not.toContain('Estimated');
    expect(reviewerCells[3].get('.team-token-metric-cost-line').attributes('title')).toBe('$0.0222');
    expect(reviewerRow?.text()).not.toContain('Gross input');
    expect(reviewerRow?.text()).not.toContain('Total tokens');
    expect(reviewerRow?.text()).not.toContain('Cost');
    expect(reviewerRow?.text()).not.toContain('Estimated');
  });

  it('shows an unavailable focus state instead of falling back to the team aggregate when focus is not a leaf run', () => {
    const selectionStore = useAgentSelectionStore();
    const teamContextsStore = useAgentTeamContextsStore();
    const meterStore = useTokenUsageMeterStore();
    const subteamNode = {
      memberKind: 'agent_team',
      memberName: 'Planning Squad',
      displayName: 'Planning Squad',
      memberPath: ['planning'],
      memberRouteKey: 'planning',
      teamDefinitionId: 'planning-def',
      children: [],
    };
    const leadNode = buildAgentMemberNode('lead', 'Lead', 'lead-run');
    teamContextsStore.teams.set('team-1', {
      teamRunId: 'team-1',
      config: { teamDefinitionId: 'team-def', teamDefinitionName: 'Delivery Team' },
      memberTree: [subteamNode, leadNode],
      memberNodesByRouteKey: new Map<string, any>([
        ['planning', subteamNode],
        ['lead', leadNode],
      ]),
      leafAgentContextsByRouteKey: new Map<string, any>([
        ['lead', buildAgentContext('lead-run', 'Lead')],
      ]),
      coordinatorMemberRouteKey: 'lead',
      historicalHydration: null,
      focusedMemberRouteKey: 'planning',
      currentStatus: AgentTeamStatus.Running,
      isSubscribed: false,
    } as any);
    meterStore.teamSummaries['team-1'] = buildSummary({ runId: 'team-1', rootTeamRunId: 'team-1', totalTokens: 9900 });
    selectionStore.setRunSelection('team-1', 'team');

    const wrapper = mountPanel();

    expect(wrapper.find('[data-test="token-usage-primary"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('Select a leaf team member to view focused token usage.');
    expect(wrapper.get('[data-test="team-token-usage-summary"]').text()).toContain('Team total');
  });
});
