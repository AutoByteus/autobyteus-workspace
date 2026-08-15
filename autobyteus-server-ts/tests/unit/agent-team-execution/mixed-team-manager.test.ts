import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { MixedTeamManager } from "../../../src/agent-team-execution/backends/mixed/mixed-team-manager.js";
import { MixedAgentMemberContext, MixedSubTeamMemberContext, MixedTeamRunContext } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { address, testAgentNode, testAgentTeamNode, testTeamRunConfig } from "../../fixtures/current-team-run-fixtures.js";

const rootRunId = "root-team-run";
const rootLead = testAgentNode("/lead", { agentRunId: "lead-run" });
const configuredReviewer = testAgentNode("/review_team/reviewer", { agentRunId: "configured-reviewer-run" });
const configuredReviewTeam = testAgentTeamNode({
  address: "/review_team",
  coordinatorAddress: configuredReviewer.address,
  teamDefinitionId: "review-team-def",
  teamRunId: "configured-review-team-run",
  children: [configuredReviewer],
});
const config = testTeamRunConfig({
  rootTeamRunId: rootRunId,
  coordinatorAddress: rootLead.address,
  children: [rootLead, configuredReviewTeam],
});

const createContext = () => new TeamRunContext({
  rootTeamRunId: rootRunId,
  teamRunId: rootRunId,
  teamBackendKind: TeamBackendKind.MIXED,
  teamNode: config.rootTeam,
  handoffs: config.handoffs,
  runtimeContext: new MixedTeamRunContext({
    memberContexts: [
      new MixedAgentMemberContext({
        address: rootLead.address,
        agentRunId: rootLead.agentRunId,
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        platformAgentRunId: null,
      }),
      new MixedSubTeamMemberContext({
        address: configuredReviewTeam.address,
        teamDefinitionId: configuredReviewTeam.teamDefinitionId,
        teamRunId: configuredReviewTeam.teamRunId,
      }),
    ],
  }),
});

const freshTaskTeam = () => {
  const coordinator = testAgentNode("/review_team/reviewer", { agentRunId: "task-reviewer-run" });
  return testAgentTeamNode({
    address: "/review_team",
    coordinatorAddress: coordinator.address,
    teamDefinitionId: "review-team-def",
    teamRunId: "task-review-team-run",
    children: [coordinator],
  });
};

const createFakeTeamRun = (teamNode: ReturnType<typeof freshTaskTeam> | typeof configuredReviewTeam) => {
  let active = true;
  let openWork = false;
  const postMessage = vi.fn(async () => ({ accepted: true as const }));
  const cancel = vi.fn();
  const finish = vi.fn(async () => {
    active = false;
    return { accepted: true as const };
  });
  const commit = vi.fn(() => ({ finish }));
  const context = new TeamRunContext({
    rootTeamRunId: rootRunId,
    teamRunId: teamNode.teamRunId,
    teamBackendKind: TeamBackendKind.MIXED,
    teamNode,
    handoffs: [],
    runtimeContext: new MixedTeamRunContext({ memberContexts: [] }),
  });
  return {
    teamRunId: teamNode.teamRunId,
    context,
    isActive: vi.fn(() => active),
    getRuntimeContext: vi.fn(() => context.runtimeContext),
    getLeafAgentStatusSnapshots: vi.fn(() => [{
      execution: { rootTeamRunId: rootRunId, memberAddress: teamNode.coordinatorAddress, agentRunId: teamNode.children[0]!.kind === "agent" ? teamNode.children[0]!.agentRunId : "" },
      details: { status: "idle", activeTurnId: null, errorMessage: null },
    }]),
    hasOpenExecutionWork: vi.fn(() => openWork),
    setOpenWork: (value: boolean) => { openWork = value; },
    getOrCreateConfiguredChildTeam: vi.fn(),
    postMessage,
    prepareTermination: vi.fn(async () => ({ cancel, commit })),
    cancel,
    commit,
    finish,
  };
};

const buildManager = () => {
  const context = createContext();
  const runs = new Map<string, ReturnType<typeof createFakeTeamRun>>();
  const createOrRestore = vi.fn(async (input: { teamNode: ReturnType<typeof freshTaskTeam> | typeof configuredReviewTeam }) => {
    const run = createFakeTeamRun(input.teamNode);
    runs.set(input.teamNode.teamRunId, run);
    return run;
  });
  const manager = new MixedTeamManager(context, {
    subTeamRunFactory: { createOrRestore } as never,
    agentRunManager: { createAgentRun: vi.fn() } as never,
    publish: vi.fn(),
    deliverInterAgentMessage: vi.fn(async () => ({ accepted: true })),
  });
  return { manager, context, runs, createOrRestore };
};

describe("MixedTeamManager current local execution mechanics", () => {
  it("materializes only the exact configured child TeamRun ID", async () => {
    const { manager, createOrRestore } = buildManager();

    await expect(manager.getOrCreateConfiguredChildTeam("configured-review-team-run"))
      .resolves.toMatchObject({ teamRunId: "configured-review-team-run" });
    await expect(manager.getOrCreateConfiguredChildTeam("foreign-team-run"))
      .rejects.toThrow("is not a direct configured child");

    expect(createOrRestore).toHaveBeenCalledOnce();
    expect(createOrRestore).toHaveBeenCalledWith(expect.objectContaining({
      rootTeamRunId: rootRunId,
      teamNode: expect.objectContaining({
        address: "/review_team",
        teamRunId: "configured-review-team-run",
        coordinatorAddress: "/review_team/reviewer",
      }),
    }));
  });

  it("prepares a fresh task Team, hides it until commit, and releases its exact coordinator message once", async () => {
    const { manager, runs } = buildManager();
    const teamNode = freshTaskTeam();
    const message = new AgentInputUserMessage("perform delegated review");

    const prepared = await manager.prepareTaskTeam({
      taskId: "task-1",
      address: address("/review_team"),
      teamRunId: teamNode.teamRunId,
      handoffs: [],
      teamNode,
      message,
    });

    expect(prepared.binding).toEqual({
      kind: "team",
      address: "/review_team",
      teamRunId: "task-review-team-run",
      coordinatorAgentRunId: "task-reviewer-run",
    });
    expect(manager.getLeafAgentStatusSnapshots()).toHaveLength(2);
    prepared.sealForCommit();
    const committed = prepared.commit();
    committed.releaseWork();
    committed.releaseWork();

    await vi.waitFor(() => expect(runs.get(teamNode.teamRunId)?.postMessage)
      .toHaveBeenCalledWith(message, "task-reviewer-run"));
    expect(runs.get(teamNode.teamRunId)?.postMessage).toHaveBeenCalledOnce();
    expect(manager.getLeafAgentStatusSnapshots()).toHaveLength(3);
  });

  it("settles only an idle committed task Team after durability commits its local teardown", async () => {
    const { manager, runs } = buildManager();
    const teamNode = freshTaskTeam();
    const prepared = await manager.prepareTaskTeam({
      taskId: "task-1",
      address: teamNode.address,
      teamRunId: teamNode.teamRunId,
      handoffs: [],
      teamNode,
      message: new AgentInputUserMessage("work"),
    });
    prepared.sealForCommit();
    prepared.commit();
    const run = runs.get(teamNode.teamRunId)!;

    run.setOpenWork(true);
    await expect(manager.prepareDirectTaskSettlement("task-1", { teamRunId: teamNode.teamRunId }))
      .resolves.toBeNull();
    run.setOpenWork(false);
    const settlement = await manager.prepareDirectTaskSettlement("task-1", { teamRunId: teamNode.teamRunId });
    expect(settlement?.binding).toEqual(prepared.binding);
    const local = settlement!.commitAfterDurability();
    await expect(local.finishLocalTeardown()).resolves.toEqual({ accepted: true });

    expect(run.commit).toHaveBeenCalledOnce();
    expect(run.finish).toHaveBeenCalledOnce();
    expect(manager.getLeafAgentStatusSnapshots()).toHaveLength(2);
  });

  it("cancels reversible TeamRun termination and returns to active admission", async () => {
    const { manager } = buildManager();
    const prepared = await manager.prepareTermination();
    prepared.cancel();

    expect(manager.isActive()).toBe(true);
    await expect(manager.executeDirectAgentCommand("missing", { kind: "interrupt" }))
      .resolves.toMatchObject({ accepted: false, code: "RUN_NOT_FOUND" });
  });
});
