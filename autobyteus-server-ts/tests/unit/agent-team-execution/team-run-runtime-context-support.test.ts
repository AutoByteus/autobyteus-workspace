import { describe, expect, it } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { buildRestoreTeamRunRuntimeContext } from "../../../src/agent-team-execution/services/team-run-runtime-context-support.js";
import { MixedTeamRunContext } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

const createMetadata = (runtimeKind: RuntimeKind, platformAgentRunId: string) => ({
  teamRunId: "team-restore-42",
  teamDefinitionId: "brief-studio-team",
  teamDefinitionName: "Brief Studio Team",
  coordinatorMemberRouteKey: "researcher",
  createdAt: "2026-04-23T00:00:00.000Z",
  updatedAt: "2026-04-23T00:00:00.000Z",
  memberTree: [{
    memberKind: "agent" as const,
    memberRouteKey: "researcher",
    memberPath: ["Researcher"],
    memberName: "Researcher",
    memberRunId: "researcher_member_run",
    runtimeKind,
    platformAgentRunId,
    agentDefinitionId: "agent-researcher",
    llmModelIdentifier: "gpt-5.4",
    autoExecuteTools: true,
    skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
    llmConfig: { reasoning_effort: "medium" },
    workspaceRootPath: "/tmp/brief-workspace",
    applicationExecutionContext: null,
  }],
});

describe("buildRestoreTeamRunRuntimeContext", () => {
  it.each([
    [RuntimeKind.AUTOBYTEUS, "native_researcher_1"],
    [RuntimeKind.CODEX_APP_SERVER, "thread_researcher_1"],
    [RuntimeKind.CLAUDE_AGENT_SDK, "session_researcher_1"],
  ] as const)("normalizes historical %s restore metadata to MixedTeamRunContext", (runtimeKind, platformAgentRunId) => {
    const runtimeContext = buildRestoreTeamRunRuntimeContext(
      createMetadata(runtimeKind, platformAgentRunId),
    );
    const memberContext = runtimeContext.memberContexts[0];

    expect(runtimeContext).toBeInstanceOf(MixedTeamRunContext);
    expect(memberContext).toEqual(expect.objectContaining({
      memberKind: "agent",
      memberRunId: "researcher_member_run",
      runtimeKind,
      platformAgentRunId,
    }));
  });
});
