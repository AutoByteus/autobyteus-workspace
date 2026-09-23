import type { AgentRunContext, RuntimeAgentRunContext } from "../../../domain/agent-run-context.js";
import type { TokenUsageUpdatedPayload } from "../../../domain/agent-run-token-usage.js";
import { isClaudeSdkResultIdentity } from "../../../domain/claude-sdk-usage.js";

export class TokenUsageContextEnricher {
  enrich(input: {
    runContext: AgentRunContext<RuntimeAgentRunContext>;
    payload: TokenUsageUpdatedPayload;
  }): TokenUsageUpdatedPayload {
    const { runContext } = input;
    const payload = input.payload;
    const config = runContext.config;
    const memberContext = config.memberExecutionContext;
    const qualityFlags = new Set(payload.quality_flags);

    if (payload.runtime_kind && payload.runtime_kind !== config.runtimeKind) {
      qualityFlags.add("runtime_kind_overridden_by_run_context");
    }
    const sdkResult = payload.runtime_kind === "claude_agent_sdk" && payload.ingestion_kind === "claude_sdk_result";
    const validatedSdkIdentity = sdkResult && isClaudeSdkResultIdentity(payload);
    if (sdkResult && !validatedSdkIdentity) qualityFlags.add("claude_sdk_identity_invalid_at_context");
    if (payload.model_identifier && payload.model_identifier !== config.llmModelIdentifier && !sdkResult) {
      qualityFlags.add("model_identifier_differs_from_run_context");
    }
    if (!config.agentDefinitionId) {
      qualityFlags.add("agent_definition_id_missing");
    }

    return {
      ...payload,
      run_id: runContext.runId,
      agent_definition_id: config.agentDefinitionId ?? payload.agent_definition_id,
      workspace_id: config.workspaceId ?? payload.workspace_id,
      runtime_kind: config.runtimeKind,
      model_identifier: sdkResult ? (validatedSdkIdentity ? payload.model_identifier : null)
        : payload.model_identifier ?? config.llmModelIdentifier,
      model_value: sdkResult ? (validatedSdkIdentity ? payload.model_value : null) : payload.model_value,
      root_team_run_id: memberContext?.identity.root.rootSubjectKind === "agent_team"
        ? memberContext.identity.root.rootRunId
        : payload.root_team_run_id,
      quality_flags: Array.from(qualityFlags),
    };
  }
}
