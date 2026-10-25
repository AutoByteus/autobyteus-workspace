import { describe, expect, it, vi } from "vitest";
import {
  createRootExecutionPhysicalScope,
  createTeamRootExecutionIdentity,
} from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import type { TeamRunAgentNode, TeamRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import {
  FlatAgentExecutionContext,
  FlatTeamExecutionContext,
} from "../../../src/agent-team-execution/local/flat-team-execution-context.js";
import { MemberExecutionContextBuilder } from "../../../src/agent-team-execution/services/member-team-context-builder.js";
import {
  testAgentNode,
  testMemberTaskCapability,
  testTeamRunConfig,
} from "../../fixtures/current-team-run-fixtures.js";

const buildBuilder = (definitions: Record<string, { name?: string; instructions?: string }> = {}) =>
  new MemberExecutionContextBuilder({
    getDefinitionById: vi.fn(async (id: string) => definitions[id] ?? null),
  } as never);

const buildContext = (config: TeamRunConfig, agents: readonly TeamRunAgentNode[]) => new TeamRunContext({
  teamKind: "configured",
  physicalScope: createRootExecutionPhysicalScope({
    root: createTeamRootExecutionIdentity(config.rootTeam.teamRunId),
    ancestorTeamRunIds: [],
  }),
  teamRunId: config.rootTeam.teamRunId,
  teamBackendKind: TeamBackendKind.MIXED,
  teamNode: config.rootTeam,
  handoffs: config.handoffs,
  runtimeContext: new FlatTeamExecutionContext({
    configuredMemberActivationMode: "fresh",
    memberContexts: agents.map((agent) => new FlatAgentExecutionContext({
      address: agent.address,
      agentRunId: agent.agentRunId,
      runtimeKind: agent.runtimeKind,
      platformAgentRunId: agent.platformAgentRunId,
    })),
  }),
});

const acceptedDelivery = vi.fn(async () => ({ accepted: true }));

describe("MemberExecutionContextBuilder", () => {
  it("builds one tagged Team-root identity and preserves filtered handoff order", async () => {
    const coordinator = testAgentNode("/coordinator", { agentRunId: "run-coordinator" });
    const reviewer = testAgentNode("/reviewer", { agentRunId: "run-reviewer" });
    const handoffs = [
      { from: "/coordinator", to: "/reviewer", rules: ["First rule.", "Second rule."] },
      { from: "/reviewer", to: "/coordinator", rules: ["Return when ready."] },
    ];
    const config = testTeamRunConfig({
      rootTeamRunId: "team-1",
      rootTeamDefinitionId: "team-def-1",
      coordinatorAddress: coordinator.address,
      children: [coordinator, reviewer],
      handoffs,
    });
    const taskCapability = testMemberTaskCapability("team-1");
    const result = await buildBuilder({
      "team-def-1": { name: "Product Team", instructions: "Coordinate carefully." },
    }).build({
      teamContext: buildContext(config, [coordinator, reviewer]),
      agentNode: coordinator,
      deliverInterAgentMessage: acceptedDelivery,
      taskCapability,
    });

    expect(result.authoredEnclosingScopeInstruction).toBe("Coordinate carefully.");
    expect(result.identity).toEqual({
      root: { rootSubjectKind: "agent_team", rootRunId: "team-1" },
      memberAddress: "/coordinator",
      agentRunId: "run-coordinator",
    });
    expect(result.collaboration.outgoingHandoffs).toEqual([handoffs[0]]);
    expect(result.tasks.root).toEqual({ rootSubjectKind: "agent_team", rootRunId: "team-1" });
    expect(Object.keys(result.identity).sort()).toEqual(["agentRunId", "memberAddress", "root"]);
    expect(Object.isFrozen(result.identity)).toBe(true);
    expect(Object.isFrozen(result.collaboration.outgoingHandoffs)).toBe(true);
  });

  it("delivers through the Team-private adapter with the exact sender identity", async () => {
    const coordinator = testAgentNode("/coordinator", { agentRunId: "run-coordinator" });
    const reviewer = testAgentNode("/reviewer", { agentRunId: "run-reviewer" });
    const config = testTeamRunConfig({
      rootTeamRunId: "team-1",
      coordinatorAddress: coordinator.address,
      children: [coordinator, reviewer],
    });
    const deliver = vi.fn(async () => ({ accepted: true }));
    const result = await buildBuilder().build({
      teamContext: buildContext(config, [coordinator, reviewer]),
      agentNode: coordinator,
      deliverInterAgentMessage: deliver,
      taskCapability: testMemberTaskCapability("team-1"),
    });

    await expect(result.collaboration.deliverLogicalMessage({
      recipientAddress: "/reviewer",
      content: " Please review. ",
      referenceFiles: ["/tmp/context.md"],
    })).resolves.toEqual({ accepted: true });
    expect(deliver).toHaveBeenCalledWith({
      rootTeamRunId: "team-1",
      recipientAddress: "/reviewer",
      sender: {
        participant: {
          kind: "agent",
          identity: result.identity,
          displayName: "coordinator",
        },
      },
      content: "Please review.",
      messageType: null,
      referenceFiles: ["/tmp/context.md"],
    });
  });

  it("keeps delivery enabled when no outgoing handoff is configured", async () => {
    const solo = testAgentNode("/solo", { agentRunId: "run-solo" });
    const config = testTeamRunConfig({
      rootTeamRunId: "team-solo",
      coordinatorAddress: solo.address,
      children: [solo],
    });
    const deliver = vi.fn(async () => ({ accepted: true }));
    const result = await buildBuilder().build({
      teamContext: buildContext(config, [solo]),
      agentNode: solo,
      deliverInterAgentMessage: deliver,
      taskCapability: testMemberTaskCapability("team-solo"),
    });

    expect(result.collaboration.outgoingHandoffs).toEqual([]);
    await result.collaboration.deliverLogicalMessage({ recipientAddress: "/solo", content: "Continue." });
    expect(deliver).toHaveBeenCalledOnce();
  });

  it("rejects missing or differently rooted task command capabilities", async () => {
    const solo = testAgentNode("/solo", { agentRunId: "run-solo" });
    const config = testTeamRunConfig({
      rootTeamRunId: "team-solo",
      coordinatorAddress: solo.address,
      children: [solo],
    });
    const input = {
      teamContext: buildContext(config, [solo]),
      agentNode: solo,
      deliverInterAgentMessage: acceptedDelivery,
    };

    await expect(buildBuilder().build({ ...input, taskCapability: undefined as never }))
      .rejects.toThrow("MemberTaskCapability is required");
    await expect(buildBuilder().build({
      ...input,
      taskCapability: testMemberTaskCapability("other-team"),
    })).rejects.toThrow("same root");
  });
});
