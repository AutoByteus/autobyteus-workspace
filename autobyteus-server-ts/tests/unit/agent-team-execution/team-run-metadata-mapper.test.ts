import { describe, expect, it, vi } from "vitest";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRun } from "../../../src/agent-team-execution/domain/team-run.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { createTeamExecutionAddress } from "../../../src/agent-team-execution/domain/team-execution-address.js";
import {
  MixedAgentMemberContext,
  MixedSubTeamMemberContext,
  MixedTeamRunContext,
} from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamRunMetadataMapper } from "../../../src/agent-team-execution/services/team-run-metadata-mapper.js";
import type { TeamRunMetadata } from "../../../src/run-history/store/team-run-metadata-types.js";
import { testAgentNode, testAgentTeamNode, testTeamRunConfig } from "../../fixtures/current-team-run-fixtures.js";

const buildMapper = (definitionLookup = vi.fn(async () => ({ name: "Root Team" }))) =>
  new TeamRunMetadataMapper({
    teamDefinitionService: { getDefinitionById: definitionLookup } as never,
    workspaceManager: {
      ensureWorkspaceByRootPath: vi.fn(),
      getWorkspaceById: vi.fn(),
    } as never,
    memoryLocationService: { getTeamAgentRunLocation: vi.fn() } as never,
  });

const backend = {
  isActive: () => true,
  getRuntimeContext: () => null,
  subscribeToEvents: () => () => undefined,
  getLeafAgentStatusSnapshots: () => [],
  hasOpenExecutionWork: () => false,
} as never;

const buildNestedFixture = () => {
  const reviewer = testAgentNode("/ReviewTeam/Reviewer", {
    agentRunId: "reviewer-opaque-run",
    runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  });
  const reviewTeam = testAgentTeamNode({
    address: "/ReviewTeam",
    coordinatorAddress: reviewer.address,
    teamDefinitionId: "review-team",
    teamRunId: "child-review-team-1",
    children: [reviewer],
  });
  const lead = testAgentNode("/Lead", { agentRunId: "lead-run" });
  const config = testTeamRunConfig({
    rootTeamRunId: "team-1",
    rootTeamDefinitionId: "root-team",
    coordinatorAddress: lead.address,
    children: [lead, reviewTeam],
    handoffs: [{ from: lead.address, to: reviewTeam.address, rules: ["When review is required."] }],
  });
  const childRuntimeContext = new MixedTeamRunContext({
    memberContexts: [new MixedAgentMemberContext({
      address: reviewer.address,
      agentRunId: reviewer.agentRunId,
      runtimeKind: reviewer.runtimeKind,
      platformAgentRunId: "thread-reviewer-1",
    })],
    teamExecutionAddress: createTeamExecutionAddress({
      rootTeamRunId: "team-1",
      memberAddress: reviewTeam.address,
    }),
  });
  const runtimeContext = new MixedTeamRunContext({
    memberContexts: [
      new MixedAgentMemberContext({
        address: lead.address,
        agentRunId: lead.agentRunId,
        runtimeKind: lead.runtimeKind,
        platformAgentRunId: "platform-lead",
      }),
      new MixedSubTeamMemberContext({
        address: reviewTeam.address,
        teamDefinitionId: reviewTeam.teamDefinitionId,
        teamRunId: reviewTeam.teamRunId,
        childRuntimeContext,
      }),
    ],
    teamExecutionAddress: createTeamExecutionAddress({
      rootTeamRunId: "team-1",
      memberAddress: lead.address,
    }),
  });
  const context = new TeamRunContext({
    teamRunId: "team-1",
    teamAddress: "/",
    teamBackendKind: TeamBackendKind.MIXED,
    config,
    runtimeContext,
  });
  return { config, context, lead, reviewer, reviewTeam, runtimeContext };
};

describe("TeamRunMetadataMapper", () => {
  it("captures recursive TeamRun identity and nested platform AgentRun IDs in schema v3", async () => {
    const { config, context, reviewer } = buildNestedFixture();
    const metadata = await buildMapper().buildMetadata(new TeamRun({ context, backend }));

    expect(metadata).toMatchObject({
      schemaVersion: 3,
      teamDefinitionName: "Root Team",
      archivedAt: null,
      handoffs: config.handoffs,
      rootTeam: {
        address: "/",
        teamRunId: "team-1",
        children: [
          { address: "/Lead", platformAgentRunId: "platform-lead" },
          {
            kind: "agent_team",
            address: "/ReviewTeam",
            teamRunId: "child-review-team-1",
            children: [{
              address: reviewer.address,
              agentRunId: reviewer.agentRunId,
              platformAgentRunId: "thread-reviewer-1",
            }],
          },
        ],
      },
    });
  });

  it("restores exact recursive runtime identity from the current metadata snapshot", async () => {
    const { config } = buildNestedFixture();
    const metadata: TeamRunMetadata = {
      schemaVersion: 3,
      teamDefinitionName: "Root Team",
      createdAt: "2026-08-12T00:00:00.000Z",
      archivedAt: null,
      rootTeam: {
        ...config.rootTeam,
        children: [
          { ...config.rootTeam.children[0]!, platformAgentRunId: "platform-lead" },
          {
            ...(config.rootTeam.children[1] as Extract<typeof config.rootTeam.children[number], { kind: "agent_team" }>),
            children: [{
              ...((config.rootTeam.children[1] as Extract<typeof config.rootTeam.children[number], { kind: "agent_team" }>).children[0] as Extract<typeof config.rootTeam.children[number], { kind: "agent" }>),
              platformAgentRunId: "thread-reviewer-1",
            }],
          },
        ],
      },
      handoffs: config.handoffs,
    };

    const restored = await buildMapper().buildRestoreContext(metadata);
    const runtime = restored.runtimeContext as MixedTeamRunContext;
    const child = runtime.memberContexts[1];

    expect(restored.teamRunId).toBe("team-1");
    expect(restored.config.rootTeam).toEqual(metadata.rootTeam);
    expect(restored.config.handoffs).toEqual(metadata.handoffs);
    expect(runtime.memberContexts[0]).toMatchObject({
      kind: "agent",
      address: "/Lead",
      agentRunId: "lead-run",
      platformAgentRunId: "platform-lead",
    });
    expect(child).toBeInstanceOf(MixedSubTeamMemberContext);
    expect(child).toMatchObject({
      address: "/ReviewTeam",
      teamRunId: "child-review-team-1",
    });
    expect((child as MixedSubTeamMemberContext).childRuntimeContext?.memberContexts[0]).toMatchObject({
      address: "/ReviewTeam/Reviewer",
      agentRunId: "reviewer-opaque-run",
      platformAgentRunId: "thread-reviewer-1",
    });
  });

  it("restores the persisted handoff snapshot without consulting a mutated live definition", async () => {
    const definitionLookup = vi.fn(async () => ({
      name: "Mutated Team",
      handoffs: [{ from: "/reviewer", to: "/lead", rules: ["New live rule."] }],
    }));
    const lead = testAgentNode("/lead", { agentRunId: "lead-run" });
    const reviewer = testAgentNode("/reviewer", { agentRunId: "reviewer-run" });
    const config = testTeamRunConfig({
      rootTeamRunId: "snapshot-run-1",
      rootTeamDefinitionId: "root-team",
      coordinatorAddress: lead.address,
      children: [lead, reviewer],
    });
    const metadata: TeamRunMetadata = {
      schemaVersion: 3,
      teamDefinitionName: "Original Team",
      createdAt: "2026-08-03T00:00:00.000Z",
      archivedAt: null,
      rootTeam: config.rootTeam,
      handoffs: [{
        from: "/lead",
        to: "/reviewer",
        rules: ["Original launch rule one.", "Original launch rule two."],
      }],
    };

    const restored = await buildMapper(definitionLookup).buildRestoreContext(metadata);

    expect(definitionLookup).not.toHaveBeenCalled();
    expect(restored.config.handoffs).toEqual(metadata.handoffs);
    expect(restored.config.handoffs).not.toBe(metadata.handoffs);
    expect(Object.isFrozen(restored.config.handoffs)).toBe(true);
  });
});
