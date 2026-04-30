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
  MixedTeamMemberContext,
  MixedTeamRunContext,
} from "../backends/mixed/mixed-team-run-context.js";
import type { TeamMemberRuntimeContext } from "../domain/team-run-context.js";
import type { TeamRunMetadata } from "../../run-history/store/team-run-metadata-types.js";
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

const teamMemberMemoryLayout = new TeamMemberMemoryLayout(appConfigProvider.config.getMemoryDir());

export const buildRestoreTeamRunRuntimeContext = (
  metadata: TeamRunMetadata,
  teamBackendKind: TeamBackendKind,
) => {
  if (teamBackendKind === TeamBackendKind.CODEX_APP_SERVER) {
    return new CodexTeamRunContext({
      coordinatorMemberRouteKey: metadata.coordinatorMemberRouteKey,
      memberContexts: metadata.memberMetadata.map(
        (member) =>
          new CodexTeamMemberContext({
            memberName: member.memberName,
            memberRouteKey: member.memberRouteKey,
            memberRunId: member.memberRunId,
            agentRunConfig: new AgentRunConfig({
              runtimeKind: member.runtimeKind,
              agentDefinitionId: member.agentDefinitionId,
              llmModelIdentifier: member.llmModelIdentifier,
              autoExecuteTools: member.autoExecuteTools,
              workspaceId: null,
              memoryDir: teamMemberMemoryLayout.getMemberDirPath(metadata.teamRunId, member.memberRunId),
              llmConfig: member.llmConfig ?? null,
              skillAccessMode: member.skillAccessMode,
              applicationExecutionContext: member.applicationExecutionContext ?? null,
            }),
            threadId: member.platformAgentRunId,
          }),
      ),
    });
  }

  if (teamBackendKind === TeamBackendKind.CLAUDE_AGENT_SDK) {
    return new ClaudeTeamRunContext({
      coordinatorMemberRouteKey: metadata.coordinatorMemberRouteKey,
      memberContexts: metadata.memberMetadata.map(
        (member) =>
          new ClaudeTeamMemberContext({
            memberName: member.memberName,
            memberRouteKey: member.memberRouteKey,
            memberRunId: member.memberRunId,
            agentRunConfig: new AgentRunConfig({
              runtimeKind: member.runtimeKind,
              agentDefinitionId: member.agentDefinitionId,
              llmModelIdentifier: member.llmModelIdentifier,
              autoExecuteTools: member.autoExecuteTools,
              workspaceId: null,
              memoryDir: teamMemberMemoryLayout.getMemberDirPath(metadata.teamRunId, member.memberRunId),
              llmConfig: member.llmConfig ?? null,
              skillAccessMode: member.skillAccessMode,
              applicationExecutionContext: member.applicationExecutionContext ?? null,
            }),
            sessionId: member.platformAgentRunId,
          }),
      ),
    });
  }

  if (teamBackendKind === TeamBackendKind.MIXED) {
    return new MixedTeamRunContext({
      coordinatorMemberRouteKey: metadata.coordinatorMemberRouteKey,
      memberContexts: metadata.memberMetadata.map(
        (member) =>
          new MixedTeamMemberContext({
            memberName: member.memberName,
            memberRouteKey: member.memberRouteKey,
            memberRunId: member.memberRunId,
            runtimeKind: member.runtimeKind,
            platformAgentRunId: member.platformAgentRunId,
          }),
      ),
    });
  }

  return new AutoByteusTeamRunContext({
    coordinatorMemberRouteKey: metadata.coordinatorMemberRouteKey,
    memberContexts: metadata.memberMetadata.map(
      (member) =>
        new AutoByteusTeamMemberContext({
          memberName: member.memberName,
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
    typeof (value as { memberName?: unknown }).memberName === "string" &&
    typeof (value as { memberRouteKey?: unknown }).memberRouteKey === "string" &&
    typeof (value as { memberRunId?: unknown }).memberRunId === "string" &&
    typeof (value as { getPlatformAgentRunId?: unknown }).getPlatformAgentRunId === "function"
  );
};
