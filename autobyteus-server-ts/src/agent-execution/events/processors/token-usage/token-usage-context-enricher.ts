import type { AgentRunContext, RuntimeAgentRunContext } from "../../../domain/agent-run-context.js";
import type { TokenUsageUpdatedPayload } from "../../../domain/agent-run-token-usage.js";

export class TokenUsageContextEnricher {
  enrich(input: {
    runContext: AgentRunContext<RuntimeAgentRunContext>;
    payload: TokenUsageUpdatedPayload;
  }): TokenUsageUpdatedPayload {
    const { runContext } = input;
    const payload = input.payload;
    const config = runContext.config;
    const memberContext = config.memberTeamContext;
    const qualityFlags = new Set(payload.quality_flags);

    if (payload.runtime_kind && payload.runtime_kind !== config.runtimeKind) {
      qualityFlags.add("runtime_kind_overridden_by_run_context");
    }
    if (payload.model_identifier && payload.model_identifier !== config.llmModelIdentifier) {
      qualityFlags.add("model_identifier_differs_from_run_context");
    }
    if (!config.agentDefinitionId) {
      qualityFlags.add("agent_definition_id_missing");
    }

    const taskAgentInstance = memberContext?.taskAgentInstance ?? null;
    const taskTeamInstance = memberContext?.taskTeamInstance ?? null;
    return {
      ...payload,
      run_id: runContext.runId,
      agent_definition_id: config.agentDefinitionId ?? payload.agent_definition_id,
      workspace_id: config.workspaceId ?? payload.workspace_id,
      runtime_kind: config.runtimeKind,
      model_identifier: payload.model_identifier ?? config.llmModelIdentifier,
      root_team_run_id: memberContext?.executionAddress.rootTeamRunId ?? payload.root_team_run_id,
      execution_address: memberContext?.executionAddress ?? payload.execution_address,
      member_agent_run_id: memberContext?.agentRunId ?? payload.member_agent_run_id,
      task_agent_instance_id: taskAgentInstance?.taskAgentInstanceId ?? payload.task_agent_instance_id,
      task_agent_run_id: taskAgentInstance?.taskAgentRunId ?? payload.task_agent_run_id,
      task_id: taskAgentInstance?.taskId ?? taskTeamInstance?.taskId ?? payload.task_id,
      quality_flags: Array.from(qualityFlags),
    };
  }
}
