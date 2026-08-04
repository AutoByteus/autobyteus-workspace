import { describe, expect, it } from 'vitest';
import { SkillAccessMode } from 'autobyteus-ts/agent/context/skill-access-mode.js';
import { AgentRunConfig } from '../../../../src/agent-execution/domain/agent-run-config.js';
import { AgentRunContext } from '../../../../src/agent-execution/domain/agent-run-context.js';
import { AgentRunEventType } from '../../../../src/agent-execution/domain/agent-run-event.js';
import { TokenUsageEventEnrichmentTransformer } from '../../../../src/agent-execution/events/processors/token-usage/token-usage-event-enrichment-transformer.js';
import { TokenUsageContextEnricher } from '../../../../src/agent-execution/events/processors/token-usage/token-usage-context-enricher.js';
import { TokenUsageSnapshotDeltaNormalizer } from '../../../../src/token-usage/projections/token-usage-snapshot-delta-normalizer.js';
import { TokenUsageComponentBasisResolver } from '../../../../src/token-usage/projections/token-usage-component-basis-resolver.js';
import { TokenCostCalculator } from '../../../../src/token-usage/pricing/token-cost-calculator.js';
import { MemberTeamContext } from '../../../../src/agent-team-execution/domain/member-team-context.js';
import { TeamBackendKind } from '../../../../src/agent-team-execution/domain/team-backend-kind.js';
import { RuntimeKind } from '../../../../src/runtime-management/runtime-kind-enum.js';
import type { AgentRunEvent } from '../../../../src/agent-execution/domain/agent-run-event.js';
import type { TokenUsageUpdatedPayload } from '../../../../src/agent-execution/domain/agent-run-token-usage.js';
import type { TokenPriceConfigProvider } from '../../../../src/token-usage/pricing/token-price-config-provider.js';

const runContext = new AgentRunContext({
  runId: 'member-run-1',
  runtimeContext: null,
  config: new AgentRunConfig({
    agentDefinitionId: 'agent-def-1',
    llmModelIdentifier: 'gpt-5.4-mini',
    autoExecuteTools: true,
    workspaceId: 'workspace-1',
    skillAccessMode: SkillAccessMode.NONE,
    runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    memberTeamContext: new MemberTeamContext({
      teamRunId: 'team-run-1',
      teamDefinitionId: 'team-def-1',
      teamBackendKind: TeamBackendKind.MIXED,
      memberName: 'worker',
      memberPath: ['planner', 'worker'],
      memberRouteKey: 'planner.worker',
      memberRunId: 'member-run-1',
      collaboration: {
        addressing: {
          rootTeamRunId: 'team-run-1',
          memberAddress: '/planner/worker',
        },
      },
      tokenUsageExecutionScope: {
        rootTeamRunId: 'team-run-1',
        teamScopeAddress: { segments: [] },
        currentRunAddress: {
          segments: [
            { kind: 'member', memberRouteKey: 'planner.worker' },
            { kind: 'task_agent', taskAgentRunId: 'task-agent-run-1' },
          ],
        },
      },
      taskAgentInstance: {
        taskAgentInstanceId: 'task-agent-instance-1',
        taskAgentRunId: 'task-agent-run-1',
        teamRunId: 'team-run-1',
        taskId: 'task-1',
        logicalMember: {
          memberName: 'worker',
          memberPath: ['planner', 'worker'],
          memberRouteKey: 'planner.worker',
          templateMemberRunId: 'template-worker-run',
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        },
        createdAt: '2026-06-24T00:00:00.000Z',
      },
    }),
  }),
});

const trustedPriceProvider = {
  resolvePolicy: async () => ({
    pricing_policy_key: 'catalog:openai:gpt-5.4-mini',
    price_config_id: 'catalog:openai:gpt-5.4-mini',
    model_provider: 'OPENAI',
    model_identifier: 'gpt-5.4-mini',
    model_value: 'gpt-5.4-mini',
    canonical_name: 'gpt-5.4-mini',
    currency: 'USD',
    input_price_per_million: 1,
    output_price_per_million: 4,
    cached_input_read_price_per_million: null,
    cached_input_write_price_per_million: null,
    cached_input_write_5m_price_per_million: null,
    cached_input_write_1h_price_per_million: null,
    input_price_tiers: [],
    pricing_status: 'trusted',
    trusted_dimensions: {
      input: true,
      output: true,
      cached_input_read: false,
      cached_input_write: false,
      cached_input_write_5m: false,
      cached_input_write_1h: false,
    },
    missing_reason: null,
    source: 'autobyteus_model_catalog',
    effective_from: null,
    effective_to: null,
    version: null,
  }),
} as unknown as TokenPriceConfigProvider;

describe('TokenUsageEventEnrichmentTransformer', () => {
  it('replaces a raw token usage event with one enriched event carrying canonical team identity, deltas, and cost', async () => {
    const transformer = new TokenUsageEventEnrichmentTransformer(
      new TokenUsageContextEnricher(),
      new TokenUsageComponentBasisResolver(),
      new TokenUsageSnapshotDeltaNormalizer({
        getLatestCumulativeSnapshot: async () => null,
      } as never),
      new TokenCostCalculator(trustedPriceProvider),
    );
    const inputEvent: AgentRunEvent = {
      eventType: AgentRunEventType.TOKEN_USAGE_UPDATED,
      runId: 'payload-run-should-be-overridden',
      payload: {
        idempotency_key: 'codex:thread-1:turn-1:last',
        turn_id: 'turn-1',
        runtime_kind: 'wrong-runtime',
        ingestion_kind: 'codex_thread_token_usage',
        usage_scope: 'per_turn',
        input_token_semantic: 'gross_includes_cache',
        reported_input_tokens: 100,
        reported_output_tokens: 25,
        reported_total_tokens: 125,
        model_provider: 'OPENAI',
        provider_name: 'Codex snapshot should survive enrichment',
        model_identifier: 'gpt-5.4-mini',
        root_team_run_id: 'payload-team-should-be-overridden',
        member_route_key: 'payload-route-should-be-overridden',
      },
      statusHint: null,
    };

    const output = await transformer.transform({ runContext, events: [inputEvent] });

    expect(output).toHaveLength(1);
    expect(output[0]).toEqual(expect.objectContaining({
      eventType: AgentRunEventType.TOKEN_USAGE_UPDATED,
      runId: 'member-run-1',
    }));
    const payload = output[0]!.payload as unknown as TokenUsageUpdatedPayload;
    expect(payload.run_id).toBe('member-run-1');
    expect(payload.runtime_kind).toBe(RuntimeKind.CODEX_APP_SERVER);
    expect(payload.root_team_run_id).toBe('team-run-1');
    expect(payload.execution_address).toEqual({
      segments: [
        { kind: 'member', memberRouteKey: 'planner.worker' },
        { kind: 'task_agent', taskAgentRunId: 'task-agent-run-1' },
      ],
    });
    expect(payload.member_agent_run_id).toBe('member-run-1');
    expect(payload.member_route_key).toBe('planner.worker');
    expect(payload.agent_definition_id).toBe('agent-def-1');
    expect(payload.workspace_id).toBe('workspace-1');
    expect(payload.provider_name).toBe('Codex snapshot should survive enrichment');
    expect(payload.task_agent_instance_id).toBe('task-agent-instance-1');
    expect(payload.accounting_input_tokens).toBe(100);
    expect(payload.accounting_output_tokens).toBe(25);
    expect(payload.accounting_total_tokens).toBe(125);
    expect(payload.meter_delta_total_tokens).toBe(125);
    expect(payload.api_cost_status).toBe('estimated');
    expect(payload.estimated_api_input_cost).toBe(0.0001);
    expect(payload.estimated_api_output_cost).toBe(0.0001);
    expect(payload.estimated_api_total_cost).toBe(0.0002);
    expect(payload.quality_flags).toContain('runtime_kind_overridden_by_run_context');
  });

  it('converts cumulative snapshots into accounting deltas before pricing', async () => {
    const transformer = new TokenUsageEventEnrichmentTransformer(
      new TokenUsageContextEnricher(),
      new TokenUsageComponentBasisResolver(),
      new TokenUsageSnapshotDeltaNormalizer({
        getLatestCumulativeSnapshot: async () => ({
          usage_event_id: 'previous-snapshot-event',
          reported_input_tokens: 80,
          reported_output_tokens: 20,
          reported_total_tokens: 100,
          accounting_input_tokens: 80,
          accounting_output_tokens: 20,
          accounting_total_tokens: 100,
          standard_input_tokens: 80,
          billable_input_tokens: 80,
          billable_output_tokens: 20,
        }),
      } as never),
      new TokenCostCalculator(trustedPriceProvider),
    );

    const output = await transformer.transform({
      runContext,
      events: [{
        eventType: AgentRunEventType.TOKEN_USAGE_UPDATED,
        runId: 'member-run-1',
        payload: {
          idempotency_key: 'codex:thread-1:turn-2:total',
          turn_id: 'turn-2',
          runtime_kind: RuntimeKind.CODEX_APP_SERVER,
          ingestion_kind: 'codex_thread_token_usage',
          usage_scope: 'cumulative_snapshot',
          snapshot_series_key: 'codex_thread:thread-1',
          input_token_semantic: 'gross_includes_cache',
          reported_input_tokens: 140,
          reported_output_tokens: 50,
          reported_total_tokens: 190,
          model_provider: 'OPENAI',
          model_identifier: 'gpt-5.4-mini',
        },
        statusHint: null,
      }],
    });

    const payload = output[0]!.payload as unknown as TokenUsageUpdatedPayload;
    expect(payload.previous_snapshot_event_id).toBe('previous-snapshot-event');
    expect(payload.accounting_input_tokens).toBe(60);
    expect(payload.accounting_output_tokens).toBe(30);
    expect(payload.accounting_total_tokens).toBe(90);
    expect(payload.estimated_api_total_cost).toBe(0.00018);
  });
});
