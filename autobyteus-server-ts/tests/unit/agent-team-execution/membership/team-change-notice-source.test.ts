import { describe, expect, it } from "vitest";
import type { AgentTeamAddress } from "../../../../src/agent-collaboration/domain/agent-team-address.js";
import type { CollaborationHandoff } from "../../../../src/agent-collaboration/domain/collaboration-handoff.js";
import type { AgentRun } from "../../../../src/agent-execution/domain/agent-run.js";
import { TEAM_CHANGE_NOTICE_SENDER_ID } from "../../../../src/agent-execution/domain/system-task-notification-senders.js";
import { TeamChangeNoticeSource, teamChangeNoticeText } from "../../../../src/agent-team-execution/membership/team-change-notice-source.js";
import type { TeamMemberRef, TeamMembershipChange } from "../../../../src/agent-team-execution/membership/team-membership-change.js";

const run = (runId: string) => ({ runId }) as AgentRun;
const ref = (agentRunId: string, address: string): TeamMemberRef => ({ agentRunId, address: address as AgentTeamAddress });
const member = (agentRunId: string, address: string) => ({ agentRunId, address });

const change = (input: {
  members: Array<[string, string]>;
  joined?: TeamMemberRef[];
  left?: TeamMemberRef[];
  handoffs?: CollaborationHandoff[];
  handoffsBefore?: CollaborationHandoff[];
}): TeamMembershipChange => ({
  tree: { handoffs: input.handoffs ?? [], rootTeam: { members: input.members.map(([id, address]) => member(id, address)) } } as never,
  joined: input.joined ?? [],
  left: input.left ?? [],
  handoffsBefore: input.handoffsBefore ?? input.handoffs ?? [],
});

describe("teamChangeNoticeText (design § Exact Texts)", () => {
  it("has the exact lines, only those that apply", () => {
    expect(teamChangeNoticeText({ joined: [ref("r", "/reviewer")], left: [ref("w", "/writer")], rulesChanged: true })).toBe([
      "Your team changed: its definition was updated.",
      "Joined: reviewer at /reviewer.",
      "Left: writer (/writer); messages to it are no longer delivered.",
      "Your handoff rules changed; call get_handoff_rules to read them.",
    ].join("\n"));
    expect(teamChangeNoticeText({ joined: [], left: [], rulesChanged: false })).toBe(
      "Your team changed: its definition was updated.\nYour handoff rules are unchanged.");
  });
});

describe("TeamChangeNoticeSource (DEC-004, DS-006, N-2)", () => {
  it("tells each remaining member at its next input, with the team's change and whether its own rules changed; not the joined member", async () => {
    const source = new TeamChangeNoticeSource();
    source.recordChange(change({
      members: [["lead_1", "/lead"], ["writer_1", "/writer"], ["reviewer_1", "/reviewer"]],
      joined: [ref("reviewer_1", "/reviewer")],
      handoffsBefore: [],
      handoffs: [{ from: "/lead", to: "/reviewer", rules: ["Review."] }],
    }));
    const lead = await source.takePreface(run("lead_1"));
    expect(lead?.text).toBe("Your team changed: its definition was updated.\nJoined: reviewer at /reviewer.\nYour handoff rules changed; call get_handoff_rules to read them.");
    expect(lead?.presentation).toEqual({ senderId: TEAM_CHANGE_NOTICE_SENDER_ID, content: lead?.text });
    expect((await source.takePreface(run("writer_1")))?.text).toBe("Your team changed: its definition was updated.\nJoined: reviewer at /reviewer.\nYour handoff rules are unchanged.");
    expect(await source.takePreface(run("reviewer_1"))).toBeNull();
  });

  it("names a member that joined and left again before delivery in neither line; drops a notice with nothing to say", async () => {
    const source = new TeamChangeNoticeSource();
    source.recordChange(change({ members: [["lead_1", "/lead"], ["x_1", "/x"]], joined: [ref("x_1", "/x")] }));
    source.recordChange(change({ members: [["lead_1", "/lead"]], left: [ref("x_1", "/x")] }));
    expect(await source.takePreface(run("lead_1"))).toBeNull();
    expect(await source.takePreface(run("lead_1"))).toBeNull();
  });

  it("states rules as changed only against the last delivered notice (a change and its revert say unchanged)", async () => {
    const source = new TeamChangeNoticeSource();
    const before = [{ from: "/lead", to: "/writer", rules: ["A."] }];
    const after = [{ from: "/lead", to: "/writer", rules: ["B."] }];
    source.recordChange(change({ members: [["lead_1", "/lead"], ["writer_1", "/writer"]], handoffsBefore: before, handoffs: after }));
    source.recordChange(change({ members: [["lead_1", "/lead"], ["writer_1", "/writer"]], handoffsBefore: after, handoffs: before }));
    expect(await source.takePreface(run("lead_1"))).toBeNull();
  });

  it("settles only what was sent: a change while the notice is on its way stays pending; a returned notice is sent again", async () => {
    const source = new TeamChangeNoticeSource();
    source.recordChange(change({ members: [["lead_1", "/lead"]], left: [ref("w_1", "/writer")] }));
    const first = (await source.takePreface(run("lead_1")))!;
    expect(await source.takePreface(run("lead_1"))).toBeNull();
    source.prefaceReturned(run("lead_1"), first);
    const again = (await source.takePreface(run("lead_1")))!;
    expect(again.text).toBe(first.text);
    source.recordChange(change({ members: [["lead_1", "/lead"], ["w_1", "/writer"]], joined: [ref("w_1", "/writer")] }));
    source.prefaceDelivered(run("lead_1"), again);
    expect((await source.takePreface(run("lead_1")))?.text).toBe(
      "Your team changed: its definition was updated.\nJoined: writer at /writer.\nYour handoff rules are unchanged.");
  });
});
