import type { JsonValue } from "@autobyteus/team-stream-contracts";
import type { AgentRunStatusHint } from "../../agent-execution/domain/agent-run-event.js";
import type { TeamMemberExecutionIdentity } from "./team-member-execution-identity.js";
import type { TeamAgentStatusDetails } from "./team-agent-status.js";
import type { AgentSegmentType } from "../../agent-execution/domain/agent-segment.js";
import type {
  AgentRunFileChangeArtifactType,
  AgentRunFileChangeSourceTool,
  AgentRunFileChangeStatus,
} from "../../agent-execution/domain/agent-run-file-change.js";

type Correlated<T extends string, D> = Readonly<{
  eventType: T;
  details: Readonly<D>;
  statusHint: AgentRunStatusHint;
}>;

type TeamAgentErrorEvidence =
  | Readonly<{ errorScope: "turn"; errorEffect: "diagnostic" | "terminal"; turnId: string }>
  | Readonly<{ errorScope: "runtime"; errorEffect: "terminal"; turnId: null }>
  | Readonly<{ errorScope: null; errorEffect: null; turnId: null }>;

type TeamAgentErrorDetails = Readonly<{ code: string; message: string }> & TeamAgentErrorEvidence;

export type TeamTokenUsageDetails = Readonly<{
  usageEventId: string;
  idempotencyKey: string;
  observedAt: string;
  turnId: string | null;
  llmCallId: string | null;
  modelProvider: string | null;
  modelIdentifier: string | null;
  modelValue: string | null;
  usageScope: "per_call" | "per_turn" | "cumulative_snapshot";
  inputTokenSemantic: "gross_includes_cache" | "base_excludes_cache" | "unknown";
  standardInputTokens: number | null;
  cacheMissInputTokens: number | null;
  cacheReadInputTokens: number | null;
  cacheCreationInputTokens: number | null;
  cacheCreation5mInputTokens: number | null;
  cacheCreation1hInputTokens: number | null;
  cacheState: "positive" | "zero_reported" | "not_reported" | "unsupported_or_local" | "unknown";
  reasoningOutputTokens: number | null;
  billableOutputTokens: number | null;
  meterDeltaInputTokens: number | null;
  meterDeltaOutputTokens: number | null;
  meterDeltaTotalTokens: number | null;
  inputPricePerMillion: number | null;
  outputPricePerMillion: number | null;
  cachedInputReadPricePerMillion: number | null;
  cachedInputWritePricePerMillion: number | null;
  cachedInputWrite5mPricePerMillion: number | null;
  cachedInputWrite1hPricePerMillion: number | null;
  estimatedApiInputCost: number | null;
  estimatedApiStandardInputCost: number | null;
  estimatedApiCacheReadInputCost: number | null;
  estimatedApiCacheCreationInputCost: number | null;
  estimatedApiCacheCreation5mInputCost: number | null;
  estimatedApiCacheCreation1hInputCost: number | null;
  estimatedApiOutputCost: number | null;
  estimatedApiReasoningOutputCost: number | null;
  estimatedApiTotalCost: number | null;
  currency: string | null;
  apiCostStatus: "estimated" | "price_missing" | "partial_price_missing" | "mixed" | "local_no_api_bill";
  missingPriceDimensions: readonly string[];
  pricingPolicyKey: string | null;
  selectedPricingTierId: string | null;
  latestPromptTokens: number | null;
  effectiveContextWindowTokens: number | null;
  contextWindowUsagePercent: number | null;
  qualityFlags: readonly string[];
}>;

export type TeamAgentEvent =
  | Correlated<"TURN_STARTED", { turnId: string | null }>
  | Correlated<"TURN_COMPLETED", { turnId: string | null; reason: string | null }>
  | Correlated<"TURN_INTERRUPTED", { turnId: string | null; reason: string | null }>
  | Correlated<"SEGMENT_START", { segmentId: string; turnId: string; segmentType: AgentSegmentType; metadata: JsonValue | null }>
  | Correlated<"SEGMENT_CONTENT", { segmentId: string; turnId: string; segmentType: AgentSegmentType; delta: string }>
  | Correlated<"SEGMENT_END", { segmentId: string; turnId: string; metadata: JsonValue | null; interrupted: boolean; reason: string | null; failed: boolean; error: string | null }>
  | Correlated<"AGENT_STATUS", TeamAgentStatusDetails>
  | Correlated<"COMPACTION_STATUS", {
      phase: string | null; kind: string | null; status: string | null; turnId: string | null;
      compactionOperationId: string | null; requestedTurnId: string | null; executionTurnId: string | null;
      selectedBlockCount: number | null; compactedBlockCount: number | null; rawTraceCount: number | null; semanticFactCount: number | null;
      compactionAgentDefinitionId: string | null; compactionAgentName: string | null; compactionRuntimeKind: string | null;
      compactionModelIdentifier: string | null; compactionRunId: string | null; compactionTaskId: string | null;
      errorMessage: string | null; provider: string | null; sourceSurface: string | null; boundaryKey: string | null;
      providerEventId: string | null; providerSessionId: string | null; providerThreadId: string | null;
      providerTimestamp: number | null; trigger: string | null; preTokens: number | null; rotationEligible: boolean | null;
    }>
  | Correlated<"TOKEN_USAGE_UPDATED", TeamTokenUsageDetails>
  | Correlated<"ASSISTANT_COMPLETE", { content: string | null; reasoning: string | null; usage: JsonValue | null; imageUrls: readonly string[]; audioUrls: readonly string[]; videoUrls: readonly string[] }>
  | Correlated<"TOOL_APPROVAL_REQUESTED", { invocationId: string; toolName: string; turnId: string | null; arguments: JsonValue }>
  | Correlated<"TOOL_APPROVED", { invocationId: string; toolName: string; turnId: string | null; reason: string | null }>
  | Correlated<"TOOL_DENIED", { invocationId: string; toolName: string; turnId: string | null; arguments: JsonValue | null; reason: string | null; error: string | null }>
  | Correlated<"TOOL_EXECUTION_STARTED", { invocationId: string; toolName: string; turnId: string | null; arguments: JsonValue | null }>
  | Correlated<"TOOL_EXECUTION_SUCCEEDED", { invocationId: string; toolName: string; turnId: string | null; arguments: JsonValue | null; result: JsonValue | null }>
  | Correlated<"TOOL_EXECUTION_FAILED", { invocationId: string; toolName: string; turnId: string | null; arguments: JsonValue | null; error: string }>
  | Correlated<"TOOL_EXECUTION_INTERRUPTED", { invocationId: string; toolName: string; turnId: string | null; arguments: JsonValue | null; reason: string }>
  | Correlated<"TOOL_LOG", { logEntry: string; toolInvocationId: string; toolName: string; turnId: string | null }>
  | Correlated<"TODO_LIST_UPDATE", { todos: readonly Readonly<{ todoId: string; description: string; status: "pending" | "in_progress" | "done" }>[] }>
  | Correlated<"SYSTEM_TASK_NOTIFICATION", { sender: Readonly<{ kind: "system" }> | Readonly<{ kind: "execution"; identity: TeamMemberExecutionIdentity }>; content: string }>
  | Correlated<"ARTIFACT_PERSISTED", { artifactId: string; path: string; artifactType: string; status: "available"; description: string | null; revisionId: string; createdAt: string; updatedAt: string }>
  | Correlated<"FILE_CHANGE", { fileChangeId: string; path: string; fileType: AgentRunFileChangeArtifactType; status: AgentRunFileChangeStatus; sourceTool: AgentRunFileChangeSourceTool; sourceInvocationId: string | null; content: string | null; createdAt: string; updatedAt: string }>
  | Correlated<"ERROR", TeamAgentErrorDetails>;
