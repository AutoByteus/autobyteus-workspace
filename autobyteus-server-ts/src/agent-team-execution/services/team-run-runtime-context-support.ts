import {
  MixedAgentMemberContext,
  MixedSubTeamMemberContext,
  MixedTeamRunContext,
} from "../backends/mixed/mixed-team-run-context.js";
import type { TeamMemberRuntimeContext } from "../domain/team-run-context.js";
import type { TeamRunMetadata, TeamRunMemberMetadata } from "../../run-history/store/team-run-metadata-types.js";

const buildMixedRuntimeContextFromMetadata = (input: {
  coordinatorMemberRouteKey: string | null;
  memberTree: readonly TeamRunMemberMetadata[];
}): MixedTeamRunContext =>
  new MixedTeamRunContext({
    coordinatorMemberRouteKey: input.coordinatorMemberRouteKey,
    memberContexts: input.memberTree.map((member) => {
      if (member.memberKind === "agent") {
        return new MixedAgentMemberContext({
          memberName: member.memberName,
          memberPath: member.memberPath,
          memberRouteKey: member.memberRouteKey,
          memberRunId: member.memberRunId,
          runtimeKind: member.runtimeKind,
          platformAgentRunId: member.platformAgentRunId,
        });
      }
      return new MixedSubTeamMemberContext({
        memberName: member.memberName,
        memberPath: member.memberPath,
        memberRouteKey: member.memberRouteKey,
        memberRunId: member.memberRunId,
        teamDefinitionId: member.teamDefinitionId,
        childTeamRunId: member.teamRunId,
        childRuntimeContext: buildMixedRuntimeContextFromMetadata({
          coordinatorMemberRouteKey: member.coordinatorMemberRouteKey,
          memberTree: member.memberTree,
        }),
      });
    }),
  });

export const buildRestoreTeamRunRuntimeContext = (
  metadata: TeamRunMetadata,
): MixedTeamRunContext => buildMixedRuntimeContextFromMetadata({
  coordinatorMemberRouteKey: metadata.coordinatorMemberRouteKey,
  memberTree: metadata.memberTree,
});

export const getRuntimeMemberContexts = (
  runtimeContext: unknown,
): TeamMemberRuntimeContext[] => {
  if (!runtimeContext || typeof runtimeContext !== "object") {
    return [];
  }
  if (!("memberContexts" in runtimeContext)) {
    return [];
  }
  const memberContexts = (runtimeContext as { memberContexts?: unknown[] }).memberContexts;
  if (!Array.isArray(memberContexts)) {
    return [];
  }
  return memberContexts.filter(isTeamMemberRuntimeContext);
};

const isTeamMemberRuntimeContext = (
  value: unknown,
): value is TeamMemberRuntimeContext => {
  return (
    !!value &&
    typeof value === "object" &&
    ((value as { memberKind?: unknown }).memberKind === "agent" ||
      (value as { memberKind?: unknown }).memberKind === "agent_team") &&
    typeof (value as { memberName?: unknown }).memberName === "string" &&
    Array.isArray((value as { memberPath?: unknown }).memberPath) &&
    typeof (value as { memberRouteKey?: unknown }).memberRouteKey === "string" &&
    typeof (value as { memberRunId?: unknown }).memberRunId === "string" &&
    typeof (value as { getPlatformAgentRunId?: unknown }).getPlatformAgentRunId === "function"
  );
};
