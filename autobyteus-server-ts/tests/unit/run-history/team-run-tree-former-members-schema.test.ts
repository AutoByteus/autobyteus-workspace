import { describe, expect, it } from "vitest";
import { validateTeamRunExecutionTreePayload } from "../../../src/run-history/store/team-run-execution-tree-schema.js";
import { testAgentNode, testExecutionTree } from "../../fixtures/current-team-run-fixtures.js";

/** Data transition "Directly Usable — No Migration": `formerMembers` and `copiedFrom` are optional, read and written exactly. */
const stored = () => JSON.parse(JSON.stringify(testExecutionTree({
  rootTeamRunId: "team_1", coordinatorAddress: "/lead",
  children: [testAgentNode("/lead", { agentRunId: "lead_1" }), testAgentNode("/writer", { agentRunId: "writer_1" })],
}))) as Record<string, any>;

describe("team run tree: formerMembers and copiedFrom", () => {
  it("reads a tree without them unchanged (no field added)", () => {
    const tree = validateTeamRunExecutionTreePayload(stored(), "team_1");
    expect("formerMembers" in tree.rootTeam).toBe(false);
    expect("copiedFrom" in tree).toBe(false);
  });

  it("reads and keeps former members and copiedFrom; a former member may share an address with a current member", () => {
    const payload = stored();
    const writer = payload.rootTeam.members[1];
    payload.rootTeam.members = [payload.rootTeam.members[0], { ...writer, agentRunId: "poet_1", agentDefinitionId: "agent-poet" }];
    payload.rootTeam.formerMembers = [writer];
    payload.copiedFrom = "team_definition";
    const tree = validateTeamRunExecutionTreePayload(payload, "team_1");
    expect(tree.rootTeam.formerMembers?.map((member) => member.agentRunId)).toEqual(["writer_1"]);
    expect(tree.copiedFrom).toBe("team_definition");
    expect(JSON.parse(JSON.stringify(tree))).toMatchObject({ copiedFrom: "team_definition", rootTeam: { formerMembers: [{ agentRunId: "writer_1" }] } });
  });

  it("reads and keeps a former member's leaving marker; refuses any value but true", () => {
    const payload = stored();
    payload.rootTeam.formerMembers = [{ ...payload.rootTeam.members[1], agentRunId: "old_1", address: "/old", leaving: true }];
    expect(validateTeamRunExecutionTreePayload(payload, "team_1").rootTeam.formerMembers![0]).toMatchObject({ agentRunId: "old_1", leaving: true });
    payload.rootTeam.formerMembers[0].leaving = false;
    expect(() => validateTeamRunExecutionTreePayload(payload, "team_1")).toThrow("rootTeam.formerMembers[0].leaving must be true when present.");
  });

  it("drops an empty formerMembers list on read (written exactly as absent)", () => {
    const payload = stored();
    payload.rootTeam.formerMembers = [];
    expect("formerMembers" in validateTeamRunExecutionTreePayload(payload, "team_1").rootTeam).toBe(false);
  });

  it("refuses a former member that repeats a run ID, is not a direct child, or a bad copiedFrom", () => {
    const duplicate = stored();
    duplicate.rootTeam.formerMembers = [{ ...duplicate.rootTeam.members[1], address: "/old" }];
    expect(() => validateTeamRunExecutionTreePayload(duplicate)).toThrow("Duplicate run ID 'writer_1'.");
    const nested = stored();
    nested.rootTeam.formerMembers = [{ ...nested.rootTeam.members[1], agentRunId: "x_1", address: "/team/x" }];
    expect(() => validateTeamRunExecutionTreePayload(nested)).toThrow("is not a direct Agent child of '/'");
    const badOrigin = stored();
    badOrigin.copiedFrom = "settings";
    expect(() => validateTeamRunExecutionTreePayload(badOrigin)).toThrow("copiedFrom must be 'team_definition' or 'configured_placement'.");
  });
});
