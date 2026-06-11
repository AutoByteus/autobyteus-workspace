import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { describe, expect, it, vi } from "vitest";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunLaunchIdentityAssignment } from "../../../src/agent-team-execution/services/team-run-launch-identity-assignment.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

const agentMember = (input: { memberName: string; memberRunId?: string | null }) => ({
  memberKind: "agent" as const,
  memberName: input.memberName,
  memberRouteKey: input.memberName.toLowerCase(),
  memberRunId: input.memberRunId,
  agentDefinitionId: `agent-${input.memberName.toLowerCase()}`,
  llmModelIdentifier: "gpt-test",
  autoExecuteTools: false,
  skillAccessMode: SkillAccessMode.PRELOADED_ONLY,
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
});

describe("TeamRunLaunchIdentityAssignment", () => {
  it("prevalidates the full member tree before allocating any agent or child-team IDs", async () => {
    const teamDefinitionService = {
      getDefinitionById: vi.fn().mockResolvedValue({ name: "Child Team" }),
    };
    const agentRunIdentityAllocator = {
      allocateForAgentDefinition: vi.fn().mockResolvedValue("worker_00000000000000000000000000000001"),
    };
    const assignment = new TeamRunLaunchIdentityAssignment({
      teamDefinitionService: teamDefinitionService as any,
      agentRunIdentityAllocator,
    });
    const config = new TeamRunConfig({
      teamDefinitionId: "team-def-1",
      teamBackendKind: TeamBackendKind.MIXED,
      memberTree: [
        agentMember({ memberName: "Coordinator" }),
        {
          memberKind: "agent_team" as const,
          memberName: "ReviewTeam",
          memberRouteKey: "reviewteam",
          teamDefinitionId: "child-team-def",
          coordinatorMemberRouteKey: null,
          childTeamRunId: "manual-child-team-run-id",
          memberConfigs: [agentMember({ memberName: "Reviewer" })],
        },
      ],
    });

    await expect(assignment.assignRunIdsForLaunch(config, "team-run-1")).rejects.toThrow(
      "Public team launch cannot supply childTeamRunId",
    );

    expect(agentRunIdentityAllocator.allocateForAgentDefinition).not.toHaveBeenCalled();
    expect(teamDefinitionService.getDefinitionById).not.toHaveBeenCalled();
  });
});
