export type TokenUsageApiCostStatus = 'estimated' | 'price_missing' | 'partial_price_missing' | 'mixed';

export interface TokenUsageUpdatedPayload {
  usage_event_id: string;
  idempotency_key: string;
  observed_at?: string;
  run_id: string;
  turn_id?: string | null;
  llm_call_id?: string | null;
  root_team_run_id?: string | null;
  member_agent_run_id?: string | null;
  member_path?: string[] | null;
  member_route_key?: string | null;
  agent_definition_id?: string | null;
  workspace_id?: string | null;
  runtime_kind?: string | null;
  model_provider?: string | null;
  model_identifier?: string | null;
  model_value?: string | null;
  usage_scope?: 'per_call' | 'per_turn' | 'cumulative_snapshot' | string;
  reported_input_tokens?: number | null;
  reported_output_tokens?: number | null;
  reported_total_tokens?: number | null;
  accounting_input_tokens?: number | null;
  accounting_output_tokens?: number | null;
  accounting_total_tokens?: number | null;
  meter_delta_input_tokens?: number | null;
  meter_delta_output_tokens?: number | null;
  meter_delta_total_tokens?: number | null;
  estimated_api_input_cost?: number | null;
  estimated_api_output_cost?: number | null;
  estimated_api_total_cost?: number | null;
  currency?: string | null;
  api_cost_status?: TokenUsageApiCostStatus | string;
  latest_context_input_tokens?: number | null;
  effective_context_budget_tokens?: number | null;
  context_pressure_percent?: number | null;
  quality_flags?: string[];
}

export interface TokenUsageRunSummary {
  runId: string;
  rootTeamRunId: string | null;
  teamRunPath: string[] | null;
  memberAgentRunId: string | null;
  memberPath: string[] | null;
  memberRouteKey: string | null;
  agentDefinitionId: string | null;
  workspaceId: string | null;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedApiInputCost: number | null;
  estimatedApiOutputCost: number | null;
  estimatedApiTotalCost: number | null;
  currency: string | null;
  apiCostStatus: TokenUsageApiCostStatus;
  latestContextInputTokens: number | null;
  effectiveContextBudgetTokens: number | null;
  contextPressurePercent: number | null;
  latestModelProvider: string | null;
  latestModelIdentifier: string | null;
  latestRuntimeKind: string | null;
  eventCount: number;
  updatedAt: string | null;
}
