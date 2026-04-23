import { describe, expect, it } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { TeamMemberMemoryLayout } from "../../../src/agent-memory/store/team-member-memory-layout.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { buildRestoreTeamRunRuntimeContext } from "../../../src/agent-team-execution/services/team-run-runtime-context-support.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

describe("buildRestoreTeamRunRuntimeContext", () => {
  it("preserves Codex team-member durable memory bindings on restore", () => {
    const metadata = {
      teamRunId: "team-codex-restore-42",
      teamDefinitionId: "brief-studio-team",
      teamDefinitionName: "Brief Studio Team",
      coordinatorMemberRouteKey: "researcher",
      runVersion: 1,
      createdAt: "2026-04-23T00:00:00.000Z",
      updatedAt: "2026-04-23T00:00:00.000Z",
      memberMetadata: [
        {
          memberRouteKey: "researcher",
          memberName: "Researcher",
          memberRunId: "researcher_member_run",
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          platformAgentRunId: "thread_researcher_1",
          agentDefinitionId: "agent-researcher",
          llmModelIdentifier: "gpt-5.4",
          autoExecuteTools: true,
          skillAccessMode: SkillAccessMode.WORKSPACE,
          llmConfig: { reasoning_effort: "medium" },
          workspaceRootPath: "/tmp/brief-workspace",
          applicationExecutionContext: null,
        },
      ],
    } as const;

    const runtimeContext = buildRestoreTeamRunRuntimeContext(
      metadata,
      RuntimeKind.CODEX_APP_SERVER,
    );
    const memberContext = runtimeContext.memberContexts[0];
    const expectedMemoryDir = new TeamMemberMemoryLayout(
      appConfigProvider.config.getMemoryDir(),
    ).getMemberDirPath(metadata.teamRunId, metadata.memberMetadata[0].memberRunId);

    expect(memberContext.memberRunId).toBe("researcher_member_run");
    expect(memberContext.threadId).toBe("thread_researcher_1");
    expect(memberContext.agentRunConfig.memoryDir).toBe(expectedMemoryDir);
    expect(memberContext.agentRunConfig.workspaceId).toBeNull();
  });
});
