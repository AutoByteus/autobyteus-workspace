import { describe, expect, it, vi } from "vitest";
import type { AgentTeamAddress } from "../../../../src/agent-collaboration/domain/agent-team-address.js";
import { createTeamRootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { TeamRunExecutionTreeSnapshot } from "../../../../src/agent-team-execution/domain/team-run-execution-tree.js";
import { TEAM_MEMBERSHIP_CHANGED_EVENT } from "../../../../src/agent-team-execution/domain/team-run-event.js";
import { TeamDefinitionChangeListener, followLiveTeamRun } from "../../../../src/agent-team-execution/membership/team-definition-change-listener.js";
import type { TeamDefinitionView } from "../../../../src/agent-team-execution/membership/team-membership-change.js";
import { TeamMembershipCommitter } from "../../../../src/agent-team-execution/membership/team-membership-committer.js";
import { testAgentNode, testExecutionTree } from "../../../fixtures/current-team-run-fixtures.js";

const a = (value: string) => value as AgentTeamAddress;
const tree = (): TeamRunExecutionTreeSnapshot => testExecutionTree({
  rootTeamRunId: "team_1", coordinatorAddress: "/lead",
  children: [testAgentNode("/lead", { agentRunId: "lead_1" }), testAgentNode("/writer", { agentRunId: "writer_1" })],
});
const removeWriter: TeamDefinitionView = {
  teamDefinitionId: "team-root", coordinatorAddress: a("/lead"),
  members: [{ address: a("/lead"), agentDefinitionId: "agent-lead" }], handoffs: [], newMembers: new Map(),
};

type WriteOutcome = "committed" | "not_committed";
const setup = (input: { outcomes?: WriteOutcome[]; replaceThrows?: boolean; live?: string[]; admitting?: boolean } = {}) => {
  const steps: string[] = [];
  let current = tree();
  const outcomes = [...input.outcomes ?? []];
  const live = new Set(input.live ?? []);
  let admitting = input.admitting ?? true;
  const persistence = {
    commitExecutionTreeMutation: vi.fn(async (plan: { prepareAgainstCurrent(): any }) => {
      steps.push("lock");
      const change = plan.prepareAgainstCurrent();
      if (!change.requiresWrite) { change.commitAfterDurability(); return { outcome: "committed" }; }
      steps.push("write");
      if ((outcomes.shift() ?? "committed") === "not_committed") { change.cancelBeforeDurability(); return { outcome: "not_committed", cause: new Error("disk") }; }
      change.commitAfterDurability();
      return { outcome: "committed" };
    }),
  };
  let stopped: ((agentRunId: string) => void) | null = null;
  const followers = {
    teamRun: {
      followMembership: vi.fn((ids: readonly string[], onStopped: (agentRunId: string) => void) => { steps.push(`stop:${ids.join(",")}`); stopped = onStopped; }),
      liveExecutionIds: vi.fn(() => { steps.push("live"); return new Set(live); }),
      removeStoppedHandle: vi.fn((agentRunId: string) => { steps.push(`removeHandle:${agentRunId}`); }),
    },
    notices: { recordChange: vi.fn(() => { steps.push("notices"); }) },
    runParts: { runPartsChanged: vi.fn(() => { steps.push("runParts"); }) },
    publish: vi.fn(() => { steps.push("publish"); }),
  };
  const enterLifecycleFailStop = vi.fn();
  const committer = new TeamMembershipCommitter({
    rootIdentity: createTeamRootExecutionIdentity("team_1"),
    persistence: persistence as never,
    getTree: () => current,
    assertAdmitting: () => { if (!admitting) throw new Error("not admitting"); },
    isAdmitting: () => admitting,
    replaceTree: (next) => {
      steps.push("replaceTree");
      if (input.replaceThrows) throw new Error("live apply failed");
      current = next;
    },
    enterLifecycleFailStop,
    followers,
  });
  return { committer, steps, followers, persistence, enterLifecycleFailStop, current: () => current, live,
    stop: (agentRunId: string) => { live.delete(agentRunId); stopped!(agentRunId); }, end: () => { admitting = false; } };
};

describe("TeamMembershipCommitter (DS-001)", () => {
  it("plans under the lock with the live executions, writes once, swaps the tree, then handles, notices, run parts and the view, in order", async () => {
    const { committer, steps, followers, current } = setup();
    const change = await committer.follow(removeWriter);
    expect(change?.left).toEqual([{ agentRunId: "writer_1", address: "/writer" }]);
    expect(steps).toEqual(["lock", "live", "write", "replaceTree", "stop:", "removeHandle:writer_1", "notices", "runParts", "publish"]);
    expect(current().rootTeam.formerMembers).toEqual([expect.not.objectContaining({ leaving: true })]);
    expect(followers.publish).toHaveBeenCalledWith(TEAM_MEMBERSHIP_CHANGED_EVENT);
  });

  it("an unchanged definition writes nothing and tells nobody", async () => {
    const { committer, steps } = setup();
    await committer.follow(removeWriter);
    steps.length = 0;
    expect(await committer.follow(removeWriter)).toBeNull();
    expect(steps).toEqual(["lock", "live"]);
  });

  it("a write that does not commit leaves the run as it is", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { committer, steps, current } = setup({ outcomes: ["not_committed"] });
    expect(await committer.follow(removeWriter)).toBeNull();
    expect(steps).toEqual(["lock", "live", "write"]);
    expect(current().rootTeam.members).toHaveLength(2);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("TEAM_RUN_DEFINITION_NOT_FOLLOWED: Team run 'team_1'"));
    warn.mockRestore();
  });

  it("a durable change that cannot be applied live stops the run (fail-stop)", async () => {
    const { committer, enterLifecycleFailStop, followers } = setup({ replaceThrows: true });
    await expect(committer.follow(removeWriter)).rejects.toThrow("live apply failed");
    expect(enterLifecycleFailStop).toHaveBeenCalledOnce();
    expect(followers.notices.recordChange).not.toHaveBeenCalled();
  });
});

describe("TeamMembershipCommitter release step (DS-004, SR-010)", () => {
  it("a removed member with a live execution (even an idle one) is written leaving and asked to stop; once stopped: write → replace → handle → rows → view", async () => {
    const { committer, steps, current, stop } = setup({ live: ["lead_1", "writer_1"] });
    await committer.follow(removeWriter);
    expect(steps).toContain("stop:writer_1");
    expect(current().rootTeam.formerMembers).toEqual([expect.objectContaining({ agentRunId: "writer_1", leaving: true })]);
    steps.length = 0;
    stop("writer_1");
    await vi.waitFor(() => expect(steps).toContain("publish"));
    expect(steps).toEqual(["lock", "live", "write", "replaceTree", "removeHandle:writer_1", "runParts", "publish"]);
    expect(current().rootTeam.formerMembers![0]).not.toHaveProperty("leaving");
  });

  it("a release write that does not commit keeps the marker with a warning; the next plan heals it", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { committer, current, stop } = setup({ live: ["lead_1", "writer_1"], outcomes: ["committed", "not_committed"] });
    await committer.follow(removeWriter);
    stop("writer_1");
    await vi.waitFor(() => expect(warn).toHaveBeenCalledWith(expect.stringContaining("TEAM_MEMBER_RELEASE_NOT_SAVED: Team run 'team_1': member 'writer_1'")));
    expect(current().rootTeam.formerMembers![0]).toMatchObject({ leaving: true });
    const healed = await committer.follow(removeWriter);
    expect(healed?.released).toEqual(["writer_1"]);
    expect(current().rootTeam.formerMembers![0]).not.toHaveProperty("leaving");
    warn.mockRestore();
  });

  it("N-12: the stopped handle goes even when the member rejoined meanwhile; its marker is not touched by the release", async () => {
    const { committer, steps, current, stop, live } = setup({ live: ["lead_1", "writer_1"] });
    await committer.follow(removeWriter);
    await committer.follow({ ...removeWriter, members: [{ address: a("/lead"), agentDefinitionId: "agent-lead" }, { address: a("/writer"), agentDefinitionId: "agent-writer" }] });
    expect(current().rootTeam.members.map((member) => member.agentRunId)).toEqual(["lead_1", "writer_1"]);
    steps.length = 0;
    live.add("writer_1");
    stop("writer_1");
    await vi.waitFor(() => expect(steps).toContain("publish"));
    expect(steps).toEqual(["lock", "live", "removeHandle:writer_1", "runParts", "publish"]);
  });

  it("a team run that is ending writes nothing when a leaving member stops (its markers read as former, its restore clears them)", async () => {
    const { committer, steps, persistence, stop, end } = setup({ live: ["lead_1", "writer_1"] });
    await committer.follow(removeWriter);
    const writes = persistence.commitExecutionTreeMutation.mock.calls.length;
    steps.length = 0;
    end();
    stop("writer_1");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(persistence.commitExecutionTreeMutation.mock.calls.length).toBe(writes);
    expect(steps).toEqual([]);
  });
});

describe("TeamDefinitionChangeListener (D-TRIGGER, N-4)", () => {
  const root = (teamRunId: string, followDefinition: () => Promise<unknown>) => ({
    teamRunId, isActive: () => true, getExecutionTreeSnapshot: tree, followDefinition: vi.fn(followDefinition),
  });

  it("follows every live run; a failing run is logged and the next one still follows", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const failing = root("bad", async () => { throw new Error("boom"); });
    const healthy = root("good", async () => null);
    const listener = new TeamDefinitionChangeListener({ liveRuns: () => [failing, healthy] as never, planner: { viewFor: async () => removeWriter } });
    await listener.definitionsChanged();
    expect(healthy.followDefinition).toHaveBeenCalledWith(removeWriter);
    expect(warn).toHaveBeenCalledWith("TEAM_RUN_DEFINITION_NOT_FOLLOWED: Team run 'bad' keeps its members (boom).");
    warn.mockRestore();
  });

  it("a change during a pass asks for exactly one more pass; after close nothing follows", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const viewFor = vi.fn(async () => { await gate; return null; });
    const listener = new TeamDefinitionChangeListener({ liveRuns: () => [root("r", async () => null)] as never, planner: { viewFor } });
    const signal = { listeners: [] as Array<() => void>, subscribe(listener: () => void) { this.listeners.push(listener); return () => undefined; } };
    const stop = listener.listen(signal as never);
    const first = listener.definitionsChanged();
    void listener.definitionsChanged();
    void listener.definitionsChanged();
    release();
    await first;
    expect(viewFor).toHaveBeenCalledTimes(2);
    stop();
    await listener.definitionsChanged();
    expect(viewFor).toHaveBeenCalledTimes(2);
  });

  it("followLiveTeamRun skips a run that stopped while its view was read", async () => {
    const stopped = { ...root("r", async () => null), isActive: () => false };
    await followLiveTeamRun({ viewFor: async () => removeWriter }, stopped as never);
    expect(stopped.followDefinition).not.toHaveBeenCalled();
  });
});
