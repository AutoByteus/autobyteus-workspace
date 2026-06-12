import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { MemberTeamContext } from "../../agent-team-execution/domain/member-team-context.js";

export type AgentRunMessageSenderContext = {
  senderRunId: string;
  senderName: string;
  runtimeKind: RuntimeKind | string | null;
  memberTeamContext: MemberTeamContext | null;
};

const normalizeRequired = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

const normalizeOptional = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const buildAgentRunMessageSenderContext = (input: {
  senderRunId: string;
  senderName?: string | null;
  runtimeKind?: RuntimeKind | string | null;
  memberTeamContext?: MemberTeamContext | null;
}): AgentRunMessageSenderContext => {
  const senderRunId = normalizeRequired(input.senderRunId, "senderRunId");
  const memberTeamContext = input.memberTeamContext ?? null;
  return {
    senderRunId,
    senderName:
      normalizeOptional(input.senderName) ??
      normalizeOptional(memberTeamContext?.memberName) ??
      senderRunId,
    runtimeKind: input.runtimeKind ?? memberTeamContext?.teamBackendKind ?? null,
    memberTeamContext,
  };
};
