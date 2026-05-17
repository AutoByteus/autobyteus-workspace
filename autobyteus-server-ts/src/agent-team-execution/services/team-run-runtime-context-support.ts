import { AgentRunConfig } from "../../agent-execution/domain/agent-run-config.js";
import { TeamMemberMemoryLayout } from "../../agent-memory/store/team-member-memory-layout.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import {
  AutoByteusTeamMemberContext,
  AutoByteusTeamRunContext,
} from "../backends/autobyteus/autobyteus-team-run-context.js";
import {
  ClaudeTeamMemberContext,
  ClaudeTeamRunContext,
} from "../backends/claude/claude-team-run-context.js";
import {
  CodexTeamMemberContext,
  CodexTeamRunContext,
} from "../backends/codex/codex-team-run-context.js";
import {
  MixedAgentMemberContext,
  MixedSubTeamMemberContext,
  MixedTeamRunContext,
} from "../backends/mixed/mixed-team-run-context.js";
import type { TeamMemberRuntimeContext } from "../domain/team-run-context.js";
import type { TeamRunMetadata, TeamRunAgentMemberMetadata, TeamRunMemberMetadata } from "../../run-history/store/team-run-metadata-types.js";
import { getTeamRunLeafAgentMetadata } from "../../run-history/services/team-run-metadata-flattener.js";
import { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import {
  TeamBackendKind,
  resolveSingleRuntimeTeamBackendKind,
} from "../domain/team-backend-kind.js";

export const resolveTeamBackendKindFromMemberRuntimeKinds = (
  runtimeKinds: Iterable<RuntimeKind | null | undefined>,
): TeamBackendKind => {
  const normalizedRuntimeKinds = new Set<RuntimeKind>();
  for (const runtimeKind of runtimeKinds) {
    normalizedRuntimeKinds.add(runtimeKind ?? RuntimeKind.AUTOBYTEUS);
  }
  if (normalizedRuntimeKinds.size <= 1) {
    return resolveSingleRuntimeTeamBackendKind(
      normalizedRuntimeKinds.values().next().value ?? RuntimeKind.AUTOBYTEUS,
    );
  }
  return TeamBackendKind.MIXED;
};

export const resolveTeamBackendKindFromMetadata = (metadata: TeamRunMetadata): TeamBackendKind => {
  const hasSubTeam = (members: readonly TeamRunMemberMetadata[]): boolean =>
    members.some((member) => member.memberKind === "agent_team");
  if (hasSubTeam(metadata.memberTree)) {
    return TeamBackendKind.MIXED;
  }
  return resolveTeamBackendKindFromMemberRuntimeKinds(
    getTeamRunLeafAgentMetadata(metadata).map((member) => member.runtimeKind),
  );
};

const teamMemberMemoryLayout = new TeamMemberMemoryLayout(appConfigProvider.config.getMemoryDir());

const buildAgentRunConfig = (
  metadata: TeamRunMetadata,
  member: TeamRunAgentMemberMetadata,
): AgentRunConfig =>
  new AgentRunConfig({
    runtimeKind: member.runtimeKind,
    agentDefinitionId: member.agentDefinitionId,
    llmModelIdentifier: member.llmModelIdentifier,
    autoExecuteTools: member.autoExecuteTools,
    workspaceId: null,
    memoryDir: teamMemberMemoryLayout.getMemberDirPath(metadata.teamRunId, member.memberRunId),
    llmConfig: member.llmConfig ?? null,
    skillAccessMode: member.skillAccessMode,
    applicationExecutionContext: member.applicationExecutionContext ?? null,
  });

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
  teamBackendKind: TeamBackendKind,
) => {
  const leafMembers = getTeamRunLeafAgentMetadata(metadata);
  if (teamBackendKind === TeamBackendKind.CODEX_APP_SERVER) {
    return new CodexTeamRunContext({
      coordinatorMemberRouteKey: metadata.coordinatorMemberRouteKey,
      memberContexts: leafMembers.map(
        (member) =>
          new CodexTeamMemberContext({
            memberName: member.memberName,
            memberPath: member.memberPath,
            memberRouteKey: member.memberRouteKey,
            memberRunId: member.memberRunId,
            agentRunConfig: buildAgentRunConfig(metadata, member),
            threadId: member.platformAgentRunId,
          }),
      ),
    });
  }

  if (teamBackendKind === TeamBackendKind.CLAUDE_AGENT_SDK) {
    return new ClaudeTeamRunContext({
      coordinatorMemberRouteKey: metadata.coordinatorMemberRouteKey,
      memberContexts: leafMembers.map(
        (member) =>
          new ClaudeTeamMemberContext({
            memberName: member.memberName,
            memberPath: member.memberPath,
            memberRouteKey: member.memberRouteKey,
            memberRunId: member.memberRunId,
            agentRunConfig: buildAgentRunConfig(metadata, member),
            sessionId: member.platformAgentRunId,
          }),
      ),
    });
  }

  if (teamBackendKind === TeamBackendKind.MIXED) {
    return buildMixedRuntimeContextFromMetadata({
      coordinatorMemberRouteKey: metadata.coordinatorMemberRouteKey,
      memberTree: metadata.memberTree,
    });
  }

  return new AutoByteusTeamRunContext({
    coordinatorMemberRouteKey: metadata.coordinatorMemberRouteKey,
    memberContexts: leafMembers.map(
      (member) =>
        new AutoByteusTeamMemberContext({
          memberName: member.memberName,
          memberPath: member.memberPath,
          memberRouteKey: member.memberRouteKey,
          memberRunId: member.memberRunId,
          nativeAgentId: member.platformAgentRunId,
        }),
    ),
  });
};

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
