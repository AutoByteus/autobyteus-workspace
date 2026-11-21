import { describe, expect, it } from "vitest";
import type { AgentTeamAddress } from "../../../../src/agent-collaboration/domain/agent-team-address.js";
import type { CollaborationHandoff } from "../../../../src/agent-collaboration/domain/collaboration-handoff.js";
import type { TeamRunExecutionTreeSnapshot } from "../../../../src/agent-team-execution/domain/team-run-execution-tree.js";
import {
  changesTheTeam,
  clearStoppedLeavingMarkers,
  leavingReleaseChange,
  newMemberKey,
  planTeamMembershipChange,
  TeamMembershipPlanError,
  type NewTeamMemberLaunch,
  type TeamDefinitionView,
} from "../../../../src/agent-team-execution/membership/team-membership-change.js";
import { followsTeamDefinition } from "../../../../src/agent-team-execution/membership/team-membership-planner.js";
import { testAgentNode, testExecutionTree } from "../../../fixtures/current-team-run-fixtures.js";

const a = (value: string) => value as AgentTeamAddress;
const launch = { runtimeKind: "autobyteus", llmModelIdentifier: "test-model", llmConfig: null, autoExecuteTools: true, workspaceRootPath: null } as never;
const rule = (from: string, to: string, text = `When ${to.slice(1)} is needed.`): CollaborationHandoff => ({ from, to, rules: [text] });

const baseTree = (handoffs: CollaborationHandoff[] = [rule("/lead", "/writer")]): TeamRunExecutionTreeSnapshot => ({
  ...testExecutionTree({
    rootTeamRunId: "team_1",
    coordinatorAddress: "/lead",
    children: [testAgentNode("/lead", { agentRunId: "lead_1" }), testAgentNode("/writer", { agentRunId: "writer_1" })],
  }),
  handoffs,
});

const view = (input: {
  members: Array<[string, string]>;
  coordinator?: string;
  handoffs?: CollaborationHandoff[];
  newMembers?: Array<[string, string, string]>;
}): TeamDefinitionView => ({
  teamDefinitionId: "team-root",
  coordinatorAddress: a(input.coordinator ?? "/lead"),
  members: input.members.map(([address, agentDefinitionId]) => ({ address: a(address), agentDefinitionId })),
  handoffs: input.handoffs ?? [rule("/lead", "/writer")],
  newMembers: new Map((input.newMembers ?? []).map(([address, agentDefinitionId, agentRunId]): [string, NewTeamMemberLaunch] =>
    [newMemberKey(address, agentDefinitionId), { agentRunId, launchConfiguration: launch, launchSource: { origin: "agent_default", fallbacks: [] } }])),
});

const same = [["/lead", "agent-lead"], ["/writer", "agent-writer"]] as Array<[string, string]>;

describe("planTeamMembershipChange (DS-003)", () => {
  it("is null when the definition matches the run (no write, no event)", () => {
    expect(planTeamMembershipChange(baseTree(), view({ members: same }))).toBeNull();
  });

  it("adds a new member with its view launch and the definition's rule to it", () => {
    const change = planTeamMembershipChange(baseTree(), view({
      members: [...same, ["/reviewer", "agent-reviewer"]],
      handoffs: [rule("/lead", "/writer"), rule("/lead", "/reviewer")],
      newMembers: [["/reviewer", "agent-reviewer", "reviewer_1"]],
    }))!;
    expect(change.joined).toEqual([{ agentRunId: "reviewer_1", address: "/reviewer" }]);
    expect(change.left).toEqual([]);
    expect(change.tree.rootTeam.members.map((member) => member.agentRunId)).toEqual(["lead_1", "writer_1", "reviewer_1"]);
    expect(change.tree.rootTeam.members[2]).toMatchObject({ launchConfiguration: launch, launchSource: { origin: "agent_default" }, platformAgentRunId: null });
    expect(change.tree.handoffs).toEqual([rule("/lead", "/writer"), rule("/lead", "/reviewer")]);
    expect(change.handoffsBefore).toEqual([rule("/lead", "/writer")]);
    expect(change.tree.rootTeam.formerMembers).toBeUndefined();
  });

  it("does not add a member the view has no launch for (it cannot be launched yet)", () => {
    expect(planTeamMembershipChange(baseTree(), view({ members: [...same, ["/reviewer", "agent-reviewer"]] }))).toBeNull();
  });

  it("removes a member: it becomes a former member and rules from or to it are left out (N-3)", () => {
    const change = planTeamMembershipChange(baseTree(), view({ members: [["/lead", "agent-lead"]] }))!;
    expect(change.left).toEqual([{ agentRunId: "writer_1", address: "/writer" }]);
    expect(change.tree.rootTeam.members.map((member) => member.agentRunId)).toEqual(["lead_1"]);
    expect(change.tree.rootTeam.formerMembers?.map((member) => member.agentRunId)).toEqual(["writer_1"]);
    expect(change.tree.handoffs).toEqual([]);
  });

  it("swaps a member whose address now has another agent (DEC-006): the old leaves, a new run ID joins at the same address", () => {
    const change = planTeamMembershipChange(baseTree(), view({
      members: [["/lead", "agent-lead"], ["/writer", "agent-poet"]],
      newMembers: [["/writer", "agent-poet", "poet_1"]],
    }))!;
    expect(change.left).toEqual([{ agentRunId: "writer_1", address: "/writer" }]);
    expect(change.joined).toEqual([{ agentRunId: "poet_1", address: "/writer" }]);
    expect(change.tree.rootTeam.members.map((member) => [member.address, member.agentRunId])).toEqual([["/lead", "lead_1"], ["/writer", "poet_1"]]);
    expect(change.tree.rootTeam.formerMembers?.map((member) => member.agentRunId)).toEqual(["writer_1"]);
  });

  it("brings a former member back with its run ID (DEC-007), the latest one at that address", () => {
    const removed = planTeamMembershipChange(baseTree(), view({ members: [["/lead", "agent-lead"]] }))!.tree;
    const twice = { ...removed, rootTeam: { ...removed.rootTeam,
      formerMembers: [...removed.rootTeam.formerMembers!, { ...removed.rootTeam.formerMembers![0]!, agentRunId: "writer_2" }] } };
    const change = planTeamMembershipChange(twice, view({ members: same, newMembers: [["/writer", "agent-writer", "unused"]] }))!;
    expect(change.joined).toEqual([{ agentRunId: "writer_2", address: "/writer" }]);
    expect(change.tree.rootTeam.members.map((member) => member.agentRunId)).toEqual(["lead_1", "writer_2"]);
    expect(change.tree.rootTeam.formerMembers?.map((member) => member.agentRunId)).toEqual(["writer_1"]);
  });

  it("follows a coordinator change and a rule-only change", () => {
    const coordinator = planTeamMembershipChange(baseTree(), view({ members: same, coordinator: "/writer" }))!;
    expect(coordinator.tree.rootTeam.coordinatorAddress).toBe("/writer");
    expect(coordinator.joined).toEqual([]);
    const rules = planTeamMembershipChange(baseTree(), view({ members: same, handoffs: [rule("/lead", "/writer", "Always.")] }))!;
    expect(rules.tree.handoffs).toEqual([rule("/lead", "/writer", "Always.")]);
  });

  it("keeps a rule to an address outside the team out of the run (N-3)", () => {
    const change = planTeamMembershipChange(baseTree(), view({ members: same, handoffs: [rule("/lead", "/writer"), rule("/lead", "/ceo")] }));
    expect(change).toBeNull();
  });

  it("refuses a definition whose coordinator cannot be added: the run stays as it is", () => {
    expect(() => planTeamMembershipChange(baseTree(), view({ members: [...same, ["/boss", "agent-boss"]], coordinator: "/boss" })))
      .toThrow(TeamMembershipPlanError);
  });
});

describe("leaving markers (DS-004, SR-010)", () => {
  const removeWriter = view({ members: [["/lead", "agent-lead"]] });

  it("a removed member with a live execution is written leaving; one without is written former", () => {
    const live = planTeamMembershipChange(baseTree(), removeWriter, new Set(["writer_1"]))!;
    expect(live.leaving).toEqual(["writer_1"]);
    expect(live.tree.rootTeam.formerMembers).toEqual([expect.objectContaining({ agentRunId: "writer_1", leaving: true })]);
    const idle = planTeamMembershipChange(baseTree(), removeWriter, new Set(["lead_1"]))!;
    expect(idle.leaving).toEqual([]);
    expect(idle.tree.rootTeam.formerMembers![0]).not.toHaveProperty("leaving");
  });

  it("every plan clears a marker whose execution is no longer live (a failed release write is healed)", () => {
    const leaving = planTeamMembershipChange(baseTree(), removeWriter, new Set(["writer_1"]))!.tree;
    const healed = planTeamMembershipChange(leaving, removeWriter, new Set())!;
    expect(healed.released).toEqual(["writer_1"]);
    expect(healed.joined).toEqual([]);
    expect(healed.left).toEqual([]);
    expect(healed.tree.rootTeam.formerMembers![0]).not.toHaveProperty("leaving");
    expect(changesTheTeam(healed)).toBe(false);
    expect(planTeamMembershipChange(leaving, removeWriter, new Set(["writer_1"]))).toBeNull();
  });

  it("the release change clears only stale markers; null when there is none", () => {
    const leaving = planTeamMembershipChange(baseTree(), removeWriter, new Set(["writer_1"]))!.tree;
    expect(leavingReleaseChange(leaving, new Set(["writer_1"]))).toBeNull();
    const released = leavingReleaseChange(leaving, new Set())!;
    expect(released).toMatchObject({ joined: [], left: [], leaving: [], released: ["writer_1"] });
    expect(clearStoppedLeavingMarkers(released.tree, new Set())).toBeNull();
  });

  it("a leaving member that rejoins is current again without its marker (its leave is cancelled)", () => {
    const leaving = planTeamMembershipChange(baseTree(), removeWriter, new Set(["writer_1"]))!.tree;
    const back = planTeamMembershipChange(leaving, view({ members: same }), new Set(["writer_1"]))!;
    expect(back.joined).toEqual([{ agentRunId: "writer_1", address: "/writer" }]);
    expect(back.released).toEqual([]);
    expect(back.tree.rootTeam.members[1]).not.toHaveProperty("leaving");
    expect(back.tree.rootTeam.formerMembers).toBeUndefined();
  });
});

describe("followsTeamDefinition (D-SCOPE)", () => {
  it("follows a standalone run, a Team definition copy and an older copy without copiedFrom", () => {
    expect(followsTeamDefinition(baseTree())).toBe(true);
    expect(followsTeamDefinition({ ...baseTree(), copiedFrom: "team_definition" })).toBe(true);
    expect(followsTeamDefinition({ ...baseTree(), delegatedFrom: { delegatingRun: { kind: "agent_team", runId: "x" } } as never })).toBe(true);
  });

  it("does not follow a configured-placement copy or an application-bound run", () => {
    expect(followsTeamDefinition({ ...baseTree(), copiedFrom: "configured_placement" })).toBe(false);
    expect(followsTeamDefinition({ ...baseTree(), applicationBinding: {} as never })).toBe(false);
  });
});
