import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
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
  'shell.tokenUsage.latestPrompt': 'Latest prompt',
  'shell.tokenUsage.latestPromptTooltip': 'Latest provider prompt/current context; not a run total.',
  'shell.tokenUsage.runTotalMetricTooltip': 'Cumulative for this Autobyteus run.',
  'shell.tokenUsage.cacheHitTooltip': 'Run-total cached input divided by run-total gross input.',
  'shell.tokenUsage.runTotalEstimateTooltip': 'Cumulative token total and estimated API cost for this Autobyteus run.',
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
  'shell.tokenUsage.calculationDetails': 'Calculation details',
  'shell.tokenUsage.calculationDetailsHelp': 'Estimated API cost is calculated from server-accounted token components.',
  'shell.tokenUsage.calculationFormula': 'Formula: tokens ÷ 1,000,000 × unit price.',
  'shell.tokenUsage.component': 'Component',
  'shell.tokenUsage.unitPrice': 'Unit price',
  'shell.tokenUsage.pricePerMillionTokens': '{price} / 1M tokens',
  'shell.tokenUsage.sameAsOutputPrice': 'same as output',
  'shell.tokenUsage.includedInOutputCost': 'included in output cost',
  'shell.tokenUsage.variesByCall': 'varies by call',
  'shell.tokenUsage.partiallyMissingUnitPrice': 'partially missing',
  'shell.tokenUsage.mixedCalculationDetails': 'Calculation varies by model/provider call. A single unit price is not available for this aggregate.',
  'shell.tokenUsage.localNoUnitPrices': 'Local runtime: no provider API unit prices apply.',
  'shell.tokenUsage.roundingNote': 'Displayed costs are rounded; exact internal values may differ slightly.',
  'shell.tokenUsage.cacheWrite5m': 'Cache write 5m',
  'shell.tokenUsage.cacheWrite1h': 'Cache write 1h',
  'shell.tokenUsage.thinkingReasoning': 'Thinking / reasoning',
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
  executionAddress: null,
  memberAgentRunId: null,
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
  unitPrices: {
    standardInput: { status: 'single', pricePerMillion: 2 },
    cacheReadInput: { status: 'single', pricePerMillion: 2 },
    cacheCreationInput: { status: 'not_applicable', pricePerMillion: null },
    cacheCreation5mInput: { status: 'not_applicable', pricePerMillion: null },
    cacheCreation1hInput: { status: 'not_applicable', pricePerMillion: null },
    output: { status: 'single', pricePerMillion: 10 },
    reasoningOutput: { status: 'single', pricePerMillion: 10 },
  },
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

    expect(primaryText).toContain('Latest prompt');
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
    expect(wrapper.find('[title="Latest provider prompt/current context; not a run total."]').exists()).toBe(true);
    expect(wrapper.find('[title="Run-total cached input divided by run-total gross input."]').exists()).toBe(true);
    const calculationToggle = wrapper.get('[data-test="calculation-details-toggle"]');
    const calculationChevron = calculationToggle.get('[data-test="calculation-details-chevron"]');
    expect(calculationToggle.text()).toContain('Calculation details');
    expect(calculationToggle.classes()).not.toContain('hover:bg-blue-50');
    expect(calculationToggle.classes()).not.toContain('hover:text-blue-800');
    expect(calculationToggle.classes()).not.toContain('focus:ring-blue-500');
    expect(calculationToggle.classes()).not.toContain('focus-visible:ring-slate-300');
    expect(calculationToggle.classes()).toContain('hover:bg-gray-50');
    expect(calculationToggle.classes()).toContain('active:bg-gray-100');
    expect(calculationToggle.classes()).toContain('focus-visible:outline-gray-300');
    expect(calculationChevron.classes()).toContain('-rotate-90');
    expect((calculationToggle.element.firstElementChild as Element | null)?.getAttribute('data-test')).toBe('calculation-details-chevron');
    expect(wrapper.find('[data-test="calculation-details-panel"]').exists()).toBe(false);
  });

  it('expands calculation details with server-provided unit prices and thinking included copy', async () => {
    const agentContextsStore = useAgentContextsStore();
    const selectionStore = useAgentSelectionStore();
    const meterStore = useTokenUsageMeterStore();
    agentContextsStore.runs.set('run-1', buildAgentContext('run-1', 'Story Agent'));
    meterStore.upsertSummary(buildSummary());
    selectionStore.setRunSelection('run-1', 'agent');

    const wrapper = mountPanel();
    await wrapper.get('[data-test="calculation-details-toggle"]').trigger('click');

    const panel = wrapper.get('[data-test="calculation-details-panel"]');
    expect(wrapper.get('[data-test="calculation-details-toggle"]').attributes('aria-expanded')).toBe('true');
    expect(wrapper.get('[data-test="calculation-details-chevron"]').classes()).not.toContain('-rotate-90');
    expect(panel.text()).toContain('Estimated API cost is calculated from server-accounted token components.');
    expect(panel.text()).toContain('Formula: tokens ÷ 1,000,000 × unit price.');
    expect(panel.text()).toContain('Uncached input');
    expect(panel.text()).toContain('$2.00 / 1M tokens');
    expect(panel.text()).toContain('Cache hits');
    expect(panel.text()).toContain('Output');
    expect(panel.text()).toContain('$10.00 / 1M tokens');
    expect(panel.text()).toContain('Thinking / reasoning');
    expect(panel.text()).toContain('same as output');
    expect(panel.text()).toContain('included in output cost');
    expect(panel.text()).toContain('Input cost');
    expect(panel.text()).toContain('Output cost');
    expect(panel.text()).toContain('Total estimate');
    expect(panel.text()).toContain('Displayed costs are rounded');
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

  it('shows varies-by-call calculation details for mixed pricing without a fake unit price', async () => {
    const agentContextsStore = useAgentContextsStore();
    const selectionStore = useAgentSelectionStore();
    const meterStore = useTokenUsageMeterStore();
    agentContextsStore.runs.set('run-1', buildAgentContext('run-1', 'Story Agent'));
    meterStore.upsertSummary(buildSummary({
      apiCostStatus: 'mixed',
      estimatedApiStandardInputCost: null,
      estimatedApiCacheReadInputCost: null,
      estimatedApiOutputCost: null,
      estimatedApiTotalCost: null,
      currency: null,
      unitPrices: {
        standardInput: { status: 'mixed', pricePerMillion: null },
        cacheReadInput: { status: 'mixed', pricePerMillion: null },
        cacheCreationInput: { status: 'not_applicable', pricePerMillion: null },
        cacheCreation5mInput: { status: 'not_applicable', pricePerMillion: null },
        cacheCreation1hInput: { status: 'not_applicable', pricePerMillion: null },
        output: { status: 'mixed', pricePerMillion: null },
        reasoningOutput: { status: 'mixed', pricePerMillion: null },
      },
    }));
    selectionStore.setRunSelection('run-1', 'agent');

    const wrapper = mountPanel();
    await wrapper.get('[data-test="calculation-details-toggle"]').trigger('click');

    const panel = wrapper.get('[data-test="calculation-details-panel"]');
    expect(panel.text()).toContain('Calculation varies by model/provider call.');
    expect(panel.text()).toContain('varies by call');
    expect(panel.text()).toContain('Mixed');
    expect(panel.text()).not.toContain('$2.00 / 1M tokens');
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
    meterStore.upsertLedgerBackedTeamSummary('team-1', buildSummary({
      runId: 'team-1',
      rootTeamRunId: 'team-1',
      grossInputTokens: 9000,
      outputTokens: 900,
      totalTokens: 9900,
      estimatedApiInputCost: 0.0800,
      estimatedApiOutputCost: 0.0190,
      estimatedApiTotalCost: 0.099,
    }));
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

  it('hydrates the team aggregate when only a partial live team summary exists', async () => {
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
    meterStore.applyTokenUsageUpdated({
      usage_event_id: 'partial-live-lead-event',
      idempotency_key: 'partial-live-lead-key',
      observed_at: '2026-06-25T00:00:00.000Z',
      run_id: 'lead-run',
      root_team_run_id: 'team-1',
      member_agent_run_id: 'lead-run',
      member_route_key: 'lead',
      runtime_kind: 'autobyteus',
      model_provider: 'OPENAI',
      model_identifier: 'gpt-test',
      standard_input_tokens: 1111,
      cache_miss_input_tokens: 1111,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_creation_5m_input_tokens: 0,
      cache_creation_1h_input_tokens: 0,
      cache_state: 'not_reported',
      reasoning_output_tokens: 0,
      billable_output_tokens: 11,
      meter_delta_input_tokens: 1111,
      meter_delta_output_tokens: 11,
      meter_delta_total_tokens: 1122,
      input_price_per_million: 2,
      output_price_per_million: 10,
      estimated_api_input_cost: 0.0100,
      estimated_api_standard_input_cost: 0.0100,
      estimated_api_cache_read_input_cost: null,
      estimated_api_cache_creation_input_cost: null,
      estimated_api_cache_creation_5m_input_cost: null,
      estimated_api_cache_creation_1h_input_cost: null,
      estimated_api_output_cost: null,
      estimated_api_reasoning_output_cost: null,
      estimated_api_total_cost: 0.0100,
      currency: 'USD',
      api_cost_status: 'partial_price_missing',
      missing_price_dimensions: [],
    } as any);
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
    const aggregateSummary = buildSummary({
      runId: 'backend-member-run-id',
      rootTeamRunId: 'team-1',
      grossInputTokens: 9000,
      outputTokens: 900,
      totalTokens: 9900,
      estimatedApiInputCost: 0.0800,
      estimatedApiOutputCost: 0.0190,
      estimatedApiTotalCost: 0.099,
    });
    const fetchTeamSummarySpy = vi.spyOn(meterStore, 'fetchTeamRunSummary')
      .mockImplementation(async (teamRunId: string) => (
        meterStore.upsertLedgerBackedTeamSummary(teamRunId, aggregateSummary)
      ));
    selectionStore.setRunSelection('team-1', 'team');

    const wrapper = mountPanel();
    await flushPromises();
    await nextTick();

    expect(fetchTeamSummarySpy).toHaveBeenCalledWith('team-1');
    expect(meterStore.hasLedgerBackedTeamSummary('team-1')).toBe(true);
    const teamTable = wrapper.get('[data-test="team-token-table"]');
    let totalCells = teamTable.get('[data-test="team-token-total-row"]').findAll('th, td');
    expect(totalCells[1].text()).toContain('9,000');
    expect(totalCells[1].text()).not.toContain('1,111');
    expect(totalCells[2].text()).toContain('900');
    expect(totalCells[3].text()).toContain('9,900');

    teamContextsStore.setFocusedMember('reviewer');
    await nextTick();

    expect(wrapper.get('[data-test="gross-input-card"]').text()).toContain('2,222');
    totalCells = teamTable.get('[data-test="team-token-total-row"]').findAll('th, td');
    expect(totalCells[1].text()).toContain('9,000');
    expect(totalCells[3].text()).toContain('9,900');
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
    meterStore.upsertLedgerBackedTeamSummary('team-1', buildSummary({ runId: 'team-1', rootTeamRunId: 'team-1', totalTokens: 9900 }));
    selectionStore.setRunSelection('team-1', 'team');

    const wrapper = mountPanel();

    expect(wrapper.find('[data-test="token-usage-primary"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('Select a leaf team member to view focused token usage.');
    expect(wrapper.get('[data-test="team-token-usage-summary"]').text()).toContain('Team total');
  });
});
