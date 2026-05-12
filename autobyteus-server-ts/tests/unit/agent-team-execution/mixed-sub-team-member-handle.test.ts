import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { TeamMemberMemoryLayout } from "../../../src/agent-memory/store/team-member-memory-layout.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { MixedTeamRunBackendFactory } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.js";
import { MixedSubTeamRunFactory } from "../../../src/agent-team-execution/backends/mixed/mixed-sub-team-run-factory.js";
import { MixedSubTeamMemberHandle } from "../../../src/agent-team-execution/backends/mixed/members/mixed-sub-team-member-handle.js";
import {
  MixedSubTeamMemberContext,
  MixedTeamRunContext,
} from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamRunConfig, type TeamSubTeamMemberRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";

const buildChildAgent = (memberName: string, routeKey: string) => ({
  memberKind: "agent" as const,
  memberName,
  memberPath: ["ReviewTeam", memberName],
  memberRouteKey: routeKey,
  memberRunId: `parent-1/${routeKey}`,
  agentDefinitionId: `agent-${memberName.toLowerCase()}`,
  llmModelIdentifier: "gpt-test",
  autoExecuteTools: false,
  skillAccessMode: SkillAccessMode.NONE,
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
});

describe("MixedSubTeamMemberHandle", () => {
  it("routes parent-to-subteam messages to the configured child coordinator in multi-member child teams", async () => {
    const childPostMessage = vi.fn(async () => ({ accepted: true }));
    const contextBuilder = new MixedTeamRunBackendFactory({
      memberLayout: new TeamMemberMemoryLayout("/tmp/mixed-subteam-handle-test-memory"),
    });
    const subTeamRunFactory = new MixedSubTeamRunFactory({
      buildContext: (config, teamRunId, restoreRuntimeContext) =>
        contextBuilder.buildTeamRunContext(config, teamRunId, restoreRuntimeContext ?? null),
      createTeamManager: () => ({
        hasActiveMembers: () => true,
        postMessage: childPostMessage,
        deliverInterAgentMessage: vi.fn(async () => ({ accepted: true })),
        approveToolInvocation: vi.fn(async () => ({ accepted: true })),
        interrupt: vi.fn(async () => ({ accepted: true })),
        terminate: vi.fn(async () => ({ accepted: true })),
        subscribeToEvents: vi.fn(() => () => undefined),
      }),
    });
    const parentContext = new TeamRunContext({
      runId: "parent-1",
      teamBackendKind: TeamBackendKind.MIXED,
      coordinatorMemberRouteKey: "Lead",
      config: new TeamRunConfig({
        teamDefinitionId: "parent-team",
        teamBackendKind: TeamBackendKind.MIXED,
        coordinatorMemberRouteKey: "Lead",
        memberTree: [],
      }),
      runtimeContext: new MixedTeamRunContext({
        coordinatorMemberRouteKey: "Lead",
        memberContexts: [],
      }),
    });
    const context = new MixedSubTeamMemberContext({
      memberName: "ReviewTeam",
      memberPath: ["ReviewTeam"],
      memberRouteKey: "ReviewTeam",
      memberRunId: "parent-1/ReviewTeam",
      teamDefinitionId: "review-team",
      childTeamRunId: "child-review-1",
    });
    const config: TeamSubTeamMemberRunConfig = {
      memberKind: "agent_team",
      memberName: "ReviewTeam",
      memberPath: ["ReviewTeam"],
      memberRouteKey: "ReviewTeam",
      memberRunId: "parent-1/ReviewTeam",
      teamDefinitionId: "review-team",
      childTeamRunId: "child-review-1",
      coordinatorMemberRouteKey: "ReviewTeam/Reviewer",
      memberConfigs: [
        buildChildAgent("Reviewer", "ReviewTeam/Reviewer"),
        buildChildAgent("Observer", "ReviewTeam/Observer"),
      ],
    };
    const handle = new MixedSubTeamMemberHandle({
      parentContext,
      context,
      config,
      subTeamRunFactory,
      publish: vi.fn(),
      notifyStatusChange: vi.fn(),
    });

    const result = await handle.postMessage(new AgentInputUserMessage("please review"));

    expect(result.accepted).toBe(true);
    expect(childPostMessage).toHaveBeenCalledWith(
      expect.any(AgentInputUserMessage),
      { kind: "route_key", memberRouteKey: "Reviewer" },
    );
  });
});
