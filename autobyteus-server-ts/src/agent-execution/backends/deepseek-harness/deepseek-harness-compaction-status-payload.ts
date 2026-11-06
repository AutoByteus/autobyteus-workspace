import { RuntimeKind } from "../../../runtime-management/runtime-kind-enum.js";
import type { AcpCompactionStatusInput } from "../acp/acp-agent-session-profile.js";

const asText = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const PROVIDER = "deepseek_harness";

/**
 * COMPACTION_STATUS payload for DeepSeek Harness, from what the provider relay saw of dsh's compaction call (dsh
 * reports none over ACP): only the completion rotates raw traces. dsh's own summary is not known here.
 */
export const buildDeepSeekHarnessCompactionStatusPayload = (input: AcpCompactionStatusInput): Record<string, unknown> => {
  const base = {
    kind: "provider_compaction_boundary",
    runtime_kind: RuntimeKind.DEEPSEEK_HARNESS,
    provider: PROVIDER,
    source_surface: `${PROVIDER}.relay_compaction_${input.phase}`,
    provider_session_id: input.sessionId,
    provider_event_id: input.operationId,
    provider_timestamp: null,
    turn_id: input.turnId,
    semantic_compaction: false,
  };
  const key = (kind: string) => [PROVIDER, input.sessionId, kind, input.operationId].join(":");
  if (input.phase === "started") {
    return { ...base, boundary_key: key("started"), status: "compacting", rotation_eligible: false, trigger: "auto" };
  }
  if (input.phase === "completed") {
    return {
      ...base, boundary_key: key("completed"), status: "compacted", rotation_eligible: true, trigger: input.trigger,
      pre_tokens: null, post_tokens: null, duration_ms: null,
    };
  }
  return {
    ...base,
    boundary_key: key("failed"),
    status: "failed",
    rotation_eligible: false,
    trigger: input.trigger,
    error_message: input.reason ?? asText(input.details.error_message) ?? "DeepSeek Harness's compaction call failed.",
  };
};
