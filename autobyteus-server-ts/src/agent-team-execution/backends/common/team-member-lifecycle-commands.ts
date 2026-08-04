import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import {
  selectorFromMemberRouteKey,
  selectorToRouteKey,
  type TeamMemberSelector,
} from "../../domain/team-run-member-identity.js";

export type SettledMemberContext = {
  memberName: string;
  memberRouteKey: string;
  memberRunId: string;
};

type TerminableMemberRun = {
  isActive(): boolean;
  terminate(): Promise<AgentOperationResult>;
};

type InterruptibleMemberRun = {
  isActive(): boolean;
  interrupt(): Promise<AgentOperationResult>;
};

const buildRunNotFoundResult = (teamRunId: string): AgentOperationResult => ({
  accepted: false,
  code: "RUN_NOT_FOUND",
  message: `Run '${teamRunId}' is not active.`,
});

const buildTargetMemberNotFoundResult = (target: string): AgentOperationResult => ({
  accepted: false,
  code: "TARGET_MEMBER_NOT_FOUND",
  message: `Team member '${target}' was not found.`,
});

const buildTargetMemberRouteNotFoundResult = (target: string): AgentOperationResult => ({
  accepted: false,
  code: "TARGET_MEMBER_NOT_FOUND",
  message: `Team member route key '${target}' was not found.`,
});

const buildTargetMemberRunMismatchResult = (
  targetMemberRouteKey: string,
  targetMemberRunId: string,
): AgentOperationResult => ({
  accepted: false,
  code: "TARGET_MEMBER_RUN_MISMATCH",
  message: `Team member route key '${targetMemberRouteKey}' does not match member run '${targetMemberRunId}'.`,
});

const buildTargetMemberRunInactiveResult = (
  targetMemberRouteKey: string,
): AgentOperationResult => ({
  accepted: false,
  code: "RUN_NOT_FOUND",
  message: `Team member route key '${targetMemberRouteKey}' is not active.`,
});

export const interruptServerManagedTeamMember = async (input: {
  teamContextActive: boolean;
  targetMemberRouteKey: string;
  targetMemberRunId?: string | null;
  findMemberContextByRouteKey: (routeKey: string) => SettledMemberContext | null;
  getMemberRun: (routeKey: string) => InterruptibleMemberRun | null;
}): Promise<AgentOperationResult> => {
  if (!input.teamContextActive) {
    return buildRunNotFoundResult("unknown");
  }
  const routeKey = input.targetMemberRouteKey.trim();
  const memberContext = input.findMemberContextByRouteKey(routeKey);
  if (!memberContext) {
    return buildTargetMemberNotFoundResult(routeKey);
  }
  const requestedRunId = input.targetMemberRunId?.trim();
  if (requestedRunId && requestedRunId !== memberContext.memberRunId) {
    return buildTargetMemberRunMismatchResult(routeKey, requestedRunId);
  }
  const memberRun = input.getMemberRun(memberContext.memberRouteKey);
  if (!memberRun?.isActive()) {
    return buildTargetMemberRunInactiveResult(routeKey);
  }
  const result = await memberRun.interrupt();
  if (result.accepted) {
  }
  return result;
};

export const settleServerManagedTeamMember = async (input: {
  teamContextActive: boolean;
  targetMemberRouteKey: string;
  targetMemberRunId?: string | null;
  findMemberContextByRouteKey: (routeKey: string) => SettledMemberContext | null;
  getMemberRun: (routeKey: string) => TerminableMemberRun | null;
  clearMemberRun: (routeKey: string) => void;
}): Promise<AgentOperationResult> => {
  if (!input.teamContextActive) {
    return buildRunNotFoundResult("unknown");
  }
  const routeKey = input.targetMemberRouteKey.trim();
  const memberContext = input.findMemberContextByRouteKey(routeKey);
  if (!memberContext) {
    return buildTargetMemberNotFoundResult(routeKey);
  }
  const requestedRunId = input.targetMemberRunId?.trim();
  if (requestedRunId && requestedRunId !== memberContext.memberRunId) {
    return buildTargetMemberRunMismatchResult(routeKey, requestedRunId);
  }

  const memberRun = input.getMemberRun(memberContext.memberRouteKey);
  if (!memberRun?.isActive()) {
    input.clearMemberRun(memberContext.memberRouteKey);
    return {
      accepted: true,
      memberRunId: memberContext.memberRunId,
      memberName: memberContext.memberName,
    };
  }

  const result = await memberRun.terminate();
  if (result.accepted) {
    input.clearMemberRun(memberContext.memberRouteKey);
  }
  return {
    ...result,
    memberRunId: memberContext.memberRunId,
    memberName: memberContext.memberName,
  };
};

const isOperationResult = (
  value: SettledMemberContext | AgentOperationResult,
): value is AgentOperationResult => "accepted" in value;

export const settleRegistryTeamMember = async (input: {
  teamContextActive: boolean;
  targetMemberRouteKey: string;
  targetMemberRunId?: string | null;
  resolveContext: (selector: TeamMemberSelector) => SettledMemberContext | AgentOperationResult;
  getMemberRun: (routeKey: string) => TerminableMemberRun | null;
  removeMember: (routeKey: string) => void;
}): Promise<AgentOperationResult> => {
  if (!input.teamContextActive) {
    return buildRunNotFoundResult("unknown");
  }
  const routeKey = input.targetMemberRouteKey.trim();
  if (!routeKey) {
    return {
      accepted: false,
      code: "TARGET_MEMBER_REQUIRED",
      message: "target member selector is required.",
    };
  }
  const selector = selectorFromMemberRouteKey(routeKey);
  const canonicalRouteKey = selectorToRouteKey(selector);
  const memberContext = input.resolveContext(selector);
  if (isOperationResult(memberContext)) {
    return memberContext.code === "TARGET_MEMBER_NOT_FOUND"
      ? buildTargetMemberRouteNotFoundResult(canonicalRouteKey)
      : memberContext;
  }
  const requestedRunId = input.targetMemberRunId?.trim();
  if (
    requestedRunId &&
    memberContext.memberRouteKey === canonicalRouteKey &&
    requestedRunId !== memberContext.memberRunId
  ) {
    return buildTargetMemberRunMismatchResult(canonicalRouteKey, requestedRunId);
  }

  const memberRun = input.getMemberRun(memberContext.memberRouteKey);
  if (!memberRun?.isActive()) {
    input.removeMember(memberContext.memberRouteKey);
    return {
      accepted: true,
      memberRunId: memberContext.memberRunId,
      memberName: memberContext.memberName,
    };
  }
  const result = await memberRun.terminate();
  if (result.accepted) {
    input.removeMember(memberContext.memberRouteKey);
  }
  return {
    ...result,
    memberRunId: memberContext.memberRunId,
    memberName: memberContext.memberName,
  };
};
