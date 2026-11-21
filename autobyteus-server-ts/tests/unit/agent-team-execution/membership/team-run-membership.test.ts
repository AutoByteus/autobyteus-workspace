import { describe, expect, it } from "vitest";
import type { AgentTeamAddress } from "../../../../src/agent-collaboration/domain/agent-team-address.js";
import { resolveMessageRecipient } from "../../../../src/agent-collaboration/collaborators/message-recipient-resolution.js";
import { TeamRunMembership } from "../../../../src/agent-team-execution/domain/team-run-membership.js";
import type { TeamRunExecutionTreeSnapshot } from "../../../../src/agent-team-execution/domain/team-run-execution-tree.js";
import {
  newMemberKey,
  planTeamMembershipChange,
  type TeamDefinitionView,
} from "../../../../src/agent-team-execution/membership/team-membership-change.js";
import { TeamExecutionIndex } from "../../../../src/agent-team-execution/services/team-execution-index.js";
import { testAgentNode, testExecutionTree } from "../../../fixtures/current-team-run-fixtures.js";

const a = (value: string) => value as AgentTeamAddress;
const launch = { runtimeKind: "autobyteus", llmModelIdentifier: "test-model", llmConfig: null, autoExecuteTools: true, workspaceRootPath: null } as never;
const REFUSAL = "writer (/writer) is no longer a member of your team: it was removed from the team definition. Call get_handoff_rules for your current handoff rules.";

const start = (): TeamRunExecutionTreeSnapshot => ({
  ...testExecutionTree({
    rootTeamRunId: "team_1",
    coordinatorAddress: "/lead",
    children: [testAgentNode("/lead", { agentRunId: "lead_1" }), testAgentNode("/writer", { agentRunId: "writer_1" })],
  }),
  handoffs: [{ from: "/lead", to: "/writer", rules: ["Draft."] }],
});

const follow = (tree: TeamRunExecutionTreeSnapshot, members: Array<[string, string]>, newMembers: Array<[string, string, string]> = [],
  handoffs = tree.handoffs) => {
  const view: TeamDefinitionView = {
    teamDefinitionId: "team-root", coordinatorAddress: a("/lead"),
    members: members.map(([address, agentDefinitionId]) => ({ address: a(address), agentDefinitionId })),
    handoffs,
    newMembers: new Map(newMembers.map(([address, id, agentRunId]) => [newMemberKey(address, id), { agentRunId, launchConfiguration: launch }])),
  };
  return planTeamMembershipChange(tree, view)!.tree;
};

describe("TeamRunMembership (DS-004, DS-005)", () => {
  it("keeps a retained member's context object; a removed member is leaving until released", () => {
    const tree = start();
    const membership = TeamRunMembership.ofTree(tree);
    const leadContext = membership.memberContext("lead_1");
    const removed = follow(tree, [["/lead", "agent-lead"]]);
    membership.replace(removed);
    expect(membership.memberContext("lead_1")).toBe(leadContext);
    expect(membership.stateOf("writer_1")).toBe("leaving");
    expect(membership.agentNode("writer_1")?.address).toBe("/writer");
    expect(membership.memberContexts().map((context) => context.agentRunId)).toEqual(["lead_1", "writer_1"]);
    expect(membership.handoffsOf("lead_1")).toEqual([]);
    expect(membership.release("writer_1")).toBe(true);
    expect(membership.stateOf("writer_1")).toBeNull();
    expect(membership.memberContexts().map((context) => context.agentRunId)).toEqual(["lead_1"]);
    expect(membership.release("writer_1")).toBe(false);
  });

  it("a rejoin while leaving cancels the leave and keeps the context; a stopped former member's rejoin resumes it", () => {
    const tree = start();
    const membership = TeamRunMembership.ofTree(tree);
    const writerContext = membership.memberContext("writer_1");
    const removed = follow(tree, [["/lead", "agent-lead"]]);
    membership.replace(removed);
    const back = follow(removed, [["/lead", "agent-lead"], ["/writer", "agent-writer"]]);
    membership.replace(back);
    expect(membership.stateOf("writer_1")).toBe("current");
    expect(membership.memberContext("writer_1")).toBe(writerContext);
    expect(membership.wasRejoined("writer_1")).toBe(true);

    const stopped = TeamRunMembership.ofTree(removed);
    expect(stopped.stateOf("writer_1")).toBeNull();
    stopped.replace(back);
    expect(stopped.wasRejoined("writer_1")).toBe(true);
    expect(stopped.wasRejoined("lead_1")).toBe(false);
  });

  it("a same-address swap: the old run is leaving, the new one is current at the address, each with its own context", () => {
    const tree = start();
    const membership = TeamRunMembership.ofTree(tree);
    membership.replace(follow(tree, [["/lead", "agent-lead"], ["/writer", "agent-poet"]], [["/writer", "agent-poet", "poet_1"]]));
    expect(membership.stateOf("writer_1")).toBe("leaving");
    expect(membership.stateOf("poet_1")).toBe("current");
    expect(membership.memberContext("poet_1")).not.toBe(membership.memberContext("writer_1"));
    expect(membership.handoffsOf("lead_1")).toEqual([{ from: "/lead", to: "/writer", rules: ["Draft."] }]);
  });

  it("reads each member's live rules: a rule added for a current member shows at once", () => {
    const tree = start();
    const membership = TeamRunMembership.ofTree(tree);
    membership.replace(follow(tree, [["/lead", "agent-lead"], ["/writer", "agent-writer"]], [],
      [{ from: "/lead", to: "/writer", rules: ["Draft."] }, { from: "/writer", to: "/lead", rules: ["When done."] }]));
    expect(membership.handoffsOf("writer_1")).toEqual([{ from: "/writer", to: "/lead", rules: ["When done."] }]);
  });
});

describe("TeamExecutionIndex former members (REQ-009)", () => {
  const removed = () => follow(start(), [["/lead", "agent-lead"]]);

  it("refuses a message to a former member's address with the exact text and code", () => {
    const index = new TeamExecutionIndex(removed());
    expect(() => resolveMessageRecipient({ port: () => index, senderAgentRunId: "lead_1", address: a("/writer") }))
      .toThrow(expect.objectContaining({ code: "COLLABORATION_TARGET_NOT_FOUND", message: REFUSAL }));
  });

  it("a former member's address taken by a current member resolves to the current one", () => {
    const swapped = follow(start(), [["/lead", "agent-lead"], ["/writer", "agent-poet"]], [["/writer", "agent-poet", "poet_1"]]);
    const index = new TeamExecutionIndex(swapped);
    expect(index.formerMemberAt("/writer")).toBeNull();
    expect(index.formerMemberByRunId("writer_1")?.address).toBe("/writer");
    expect(resolveMessageRecipient({ port: () => index, senderAgentRunId: "lead_1", address: a("/writer") }).receiver.agentRunId).toBe("poet_1");
  });

  it("answers a leaving member's own commands only while it is leaving; never as a current agent", () => {
    let leaving = true;
    const index = new TeamExecutionIndex(removed(), (agentRunId) => leaving && agentRunId === "writer_1");
    expect(index.getAgent("writer_1")).toBeNull();
    expect(index.getAgentForOwnCommand("writer_1")?.address).toBe("/writer");
    leaving = false;
    expect(index.getAgentForOwnCommand("writer_1")).toBeNull();
    expect(index.listFormerAgentExecutions().map((agent) => agent.agentRunId)).toEqual(["writer_1"]);
  });
});
