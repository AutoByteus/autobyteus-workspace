import { describe, expect, it, vi } from "vitest";
import { DelegatedChildLaunches, type OwnSaveResult } from "../../../../src/run-history/services/delegated-child-launches.js";
import { DelegatedLaunchSelectionService } from "../../../../src/run-history/services/delegated-launch-selection-service.js";
import type { DelegatedChild } from "../../../../src/agent-collaboration/delegation/delegation-tree.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { testAgentNode, testExecutionTree } from "../../../fixtures/current-team-run-fixtures.js";

/**
 * autobyteus-461 SR-039 (design DS-8): a child row's change in its delegator's Settings is that child's own ordinary
 * stopped-run Save; every run is checked before any write; a failure after a save names the runs saved. A child row's
 * Stop is the child's ordinary Stop.
 */
const choice = { runtimeKind: RuntimeKind.AUTOBYTEUS, llmModelIdentifier: "m2", llmConfig: null };
const PARENT = { rootSubjectKind: "agent" as const, rootRunId: "manager" };
const child = (run: DelegatedChild["run"], recipientAddress: string, nodeId?: string): DelegatedChild => ({
  run, taskId: "T1", delegatorAgentRunId: "manager", entryAgentRunId: "agentRunId" in run ? run.agentRunId : "lead",
  started: true, linkedAt: "2026-11-01T00:00:00.000Z", recipientAddress, ...(nodeId ? { nodeId } : {}),
});
const saved = (outcome: OwnSaveResult["outcome"] = "UPDATED"): OwnSaveResult => ({ success: true, outcome, message: "Saved.", fieldErrors: [] });
const failed = (message: string): OwnSaveResult => ({ success: false, outcome: "PERSISTENCE_FAILED", message, fieldErrors: [] });

const world = (overrides: { running?: string[]; parentLive?: boolean } = {}) => {
  const children = [
    child({ agentRunId: "writer" }, "/writer"),
    child({ teamRunId: "eng" }, "/eng"),
    child({ agentRunId: "far" }, "/far", "node-b"),
  ];
  const engTree = testExecutionTree({ rootTeamRunId: "eng", coordinatorAddress: "/designer",
    children: [testAgentNode("/designer", { agentRunId: "designer" }), testAgentNode("/coder", { agentRunId: "coder" })] });
  const agents = { check: vi.fn(async () => null), save: vi.fn(async () => saved()) };
  const teams = { check: vi.fn(async () => null), save: vi.fn(async () => saved()) };
  const launches = new DelegatedChildLaunches({
    tree: { openChildrenOf: () => children },
    agentMetadata: async () => null,
    teamTree: async (teamRunId) => teamRunId === "eng" ? engTree : null,
    isRunning: (run) => (overrides.running ?? []).includes("agentRunId" in run ? run.agentRunId : run.teamRunId),
    agents, teams,
    modelOptions: { listOptionsMany: vi.fn(async (contexts) => contexts.map(() => ({ models: [] }) as never)) },
  });
  const agentRuns = { checkStoppedSelection: vi.fn(async () => null), updateStoppedSelection: vi.fn(async () => saved() as never),
    terminateAgentRun: vi.fn(async () => ({ success: true }) as never) };
  const teamRuns = { terminateTeamRun: vi.fn(async () => true) };
  const liveRoot = { stopDelegatedExecution: vi.fn(async () => ({ outcome: "STOPPED" as const, message: "Stopped on its node.", notStoppedUnattributed: 0 })) };
  const service = new DelegatedLaunchSelectionService({
    teams: { getManagedTeamRun: () => null, checkStoppedSelections: vi.fn(), updateStoppedSelections: vi.fn() } as never,
    orgs: { getActive: () => null, checkStoppedRunConfig: vi.fn(), updateStoppedRunConfig: vi.fn() } as never,
    agents: { getActive: () => overrides.parentLive === false ? null : liveRoot } as never,
    agentRuns, teamRuns, children: launches,
  });
  return { service, agents, teams, agentRuns, teamRuns, liveRoot };
};

describe("a delegator's Settings saves each child as itself (SR-039)", () => {
  it("saves an agent child, a team child's team row and a member row through each child's own Save, in row order", async () => {
    const w = world();
    const result = await w.service.update({ rootKind: "AGENT", rootRunId: "manager", changes: [
      { agentRunId: "writer", selection: choice },
      { teamRunId: "eng", selection: choice },
      { agentRunId: "coder", selection: { ...choice, llmModelIdentifier: "m3" } },
    ] });
    expect(result).toMatchObject({ success: true, outcome: "UPDATED" });
    expect(w.agents.save).toHaveBeenCalledWith({ agentRunId: "writer", ...choice });
    expect(w.teams.save).toHaveBeenCalledTimes(1);
    expect(w.teams.save).toHaveBeenCalledWith({ teamRunId: "eng", selectionPatches: [
      { ...choice, scopeKind: "CONFIGURED_TEAM", scopeAddress: "/" },
      { ...choice, llmModelIdentifier: "m3", scopeKind: "CONFIGURED_AGENT", scopeAddress: "/coder" },
    ] });
    expect(w.agents.save.mock.invocationCallOrder[0]).toBeLessThan(w.teams.save.mock.invocationCallOrder[0]!);
  });

  it("refuses the whole Save before any write when a named child is running, or a check fails", async () => {
    const running = world({ running: ["eng"] });
    await expect(running.service.update({ rootKind: "AGENT", rootRunId: "manager", changes: [
      { agentRunId: "writer", selection: choice }, { teamRunId: "eng", selection: choice },
    ] })).resolves.toMatchObject({ success: false, outcome: "COPY_RUNNING", message: "/eng is running: stop it to change its model." });
    expect(running.agents.save).not.toHaveBeenCalled();
    expect(running.teams.save).not.toHaveBeenCalled();

    const invalid = world();
    invalid.teams.check.mockResolvedValueOnce({ success: false, outcome: "VALIDATION_FAILED", message: "Bad model.", fieldErrors: [] } as never);
    await expect(invalid.service.update({ rootKind: "AGENT", rootRunId: "manager", changes: [
      { agentRunId: "writer", selection: choice }, { teamRunId: "eng", selection: choice },
    ] })).resolves.toMatchObject({ success: false, outcome: "VALIDATION_FAILED", message: "/eng: Bad model." });
    expect(invalid.agents.save).not.toHaveBeenCalled();
  });

  it("reports a failure after an earlier save as PERSISTENCE_FAILED, naming the runs saved and the one that failed", async () => {
    const w = world({ parentLive: false });
    w.teams.save.mockResolvedValueOnce(failed("disk full"));
    await expect(w.service.update({ rootKind: "AGENT", rootRunId: "manager", changes: [
      { agentRunId: "writer", selection: choice }, { teamRunId: "eng", selection: choice },
    ], configured: { kind: "agent", selection: choice } })).resolves.toMatchObject({
      success: false, outcome: "PERSISTENCE_FAILED", message: "Saved: this run, /writer. Not saved: /eng (disk full)" });
    expect(w.agentRuns.updateStoppedSelection).toHaveBeenCalledWith({ agentRunId: "manager", ...choice });
  });

  it("refuses a run this run did not delegate to, and a peer child (it keeps no editable launch)", async () => {
    const w = world();
    for (const change of [{ agentRunId: "stranger", selection: choice }, { agentRunId: "far", selection: choice }]) {
      await expect(w.service.update({ rootKind: "AGENT", rootRunId: "manager", changes: [change] }))
        .resolves.toMatchObject({ success: false, outcome: "NOT_FOUND" });
    }
    expect(w.agents.save).not.toHaveBeenCalled();
  });
});

describe("a child row's Stop (DS-8)", () => {
  it("stops a local child through its own Stop, and a peer child through its node", async () => {
    const w = world();
    await expect(w.service.stop({ rootKind: "AGENT", rootRunId: "manager", target: { agentRunId: "writer" } }))
      .resolves.toMatchObject({ success: true, outcome: "STOPPED" });
    expect(w.agentRuns.terminateAgentRun).toHaveBeenCalledWith("writer");
    await expect(w.service.stop({ rootKind: "AGENT", rootRunId: "manager", target: { teamRunId: "eng" } }))
      .resolves.toMatchObject({ success: true, outcome: "STOPPED" });
    expect(w.teamRuns.terminateTeamRun).toHaveBeenCalledWith("eng");
    w.teamRuns.terminateTeamRun.mockResolvedValueOnce(false);
    await expect(w.service.stop({ rootKind: "AGENT", rootRunId: "manager", target: { teamRunId: "eng" } }))
      .resolves.toMatchObject({ success: true, outcome: "ALREADY_STOPPED" });
    await expect(w.service.stop({ rootKind: "AGENT", rootRunId: "manager", target: { agentRunId: "far" } }))
      .resolves.toMatchObject({ success: true, outcome: "STOPPED" });
    expect(w.liveRoot.stopDelegatedExecution).toHaveBeenCalledWith({ agentRunId: "far" });
    await expect(w.service.stop({ rootKind: "AGENT", rootRunId: "manager", target: { agentRunId: "stranger" } }))
      .resolves.toMatchObject({ success: false, outcome: "NOT_FOUND" });
  });
});
