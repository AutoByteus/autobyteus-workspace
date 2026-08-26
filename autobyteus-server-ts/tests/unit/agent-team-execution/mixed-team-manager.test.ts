import { createNoopAgentToolMcpRunSessionReleaser } from "../../fixtures/agent-tool-mcp-run-session-releaser-fixtures.js";
import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { MixedAgentMemberHandle } from "../../../src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.js";
import { MixedTeamManager } from "../../../src/agent-team-execution/backends/mixed/mixed-team-manager.js";
import { MixedAgentMemberContext, MixedSubTeamMemberContext, MixedTeamRunContext } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import {
  createChildTeamRunPhysicalScope,
  createRootTeamRunPhysicalScope,
} from "../../../src/agent-team-execution/domain/team-run-physical-scope.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { address, testAgentNode, testAgentTeamNode, testMemberTaskRootResolver, testTeamRunConfig } from "../../fixtures/current-team-run-fixtures.js";

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
  physicalScope: createRootTeamRunPhysicalScope(rootRunId),
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
    configuredMemberActivationMode: "restore",
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

const createFakeTeamRun = (
  teamNode: ReturnType<typeof freshTaskTeam> | typeof configuredReviewTeam,
  configuredMemberActivationMode: "fresh" | "restore",
) => {
  let active = true;
  let openWork = false;
  const postMessage = vi.fn(async () => ({ accepted: true as const }));
  const cancel = vi.fn();
  const finish = vi.fn(async () => {
    active = false;
    return { accepted: true as const };
  });
  const interruptActiveTurns = vi.fn(async () => ({ accepted: true as const }));
  const prepareMemberRuns = vi.fn(async () => undefined);
  const scopeFinish = vi.fn(async () => finish());
  const frozenScope = Object.freeze({ interruptActiveTurns, prepareMemberRuns, finish: scopeFinish });
  const commit = vi.fn(() => ({ finish }));
  const context = new TeamRunContext({
    physicalScope: teamNode.teamRunId === rootRunId
      ? createRootTeamRunPhysicalScope(rootRunId)
      : createChildTeamRunPhysicalScope(
          createRootTeamRunPhysicalScope(rootRunId),
          teamNode.teamRunId,
        ),
    teamRunId: teamNode.teamRunId,
    teamBackendKind: TeamBackendKind.MIXED,
    teamNode,
    handoffs: [],
    runtimeContext: new MixedTeamRunContext({
      memberContexts: [],
      configuredMemberActivationMode,
    }),
  });
  return {
    teamRunId: teamNode.teamRunId,
    context,
    isActive: vi.fn(() => active),
    isTerminated: vi.fn(() => !active),
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
    freezeForRootTermination: vi.fn(() => frozenScope),
    cancel,
    commit,
    finish,
    frozenScope,
  };
};

const buildManager = () => {
  const context = createContext();
  const runs = new Map<string, ReturnType<typeof createFakeTeamRun>>();
  const materializeConfiguredChild = vi.fn(async (input: {
    teamNode: typeof configuredReviewTeam;
    configuredMemberActivationMode: "fresh" | "restore";
  }) => {
    const run = createFakeTeamRun(input.teamNode, input.configuredMemberActivationMode);
    runs.set(input.teamNode.teamRunId, run);
    return run;
  });
  const prepareFreshTaskTeam = vi.fn(async (input: {
    teamNode: ReturnType<typeof freshTaskTeam>;
  }) => {
    const run = createFakeTeamRun(input.teamNode, "fresh");
    runs.set(input.teamNode.teamRunId, run);
    return run;
  });
  const manager = new MixedTeamManager(context, {
    agentToolMcpRunSessionReleaser: createNoopAgentToolMcpRunSessionReleaser(),
    subTeamRunFactory: { materializeConfiguredChild, prepareFreshTaskTeam } as never,
    agentRunManager: { createAgentRun: vi.fn() } as never,
    taskRootResolver: testMemberTaskRootResolver(),
    publish: vi.fn(),
    deliverInterAgentMessage: vi.fn(async () => ({ accepted: true })),
    acceptPlatformBinding: vi.fn(async () => undefined),
  });
  return { manager, context, runs, materializeConfiguredChild, prepareFreshTaskTeam };
};

describe("MixedTeamManager current local execution mechanics", () => {
  it("materializes only the exact configured child TeamRun ID", async () => {
    const { manager, context, materializeConfiguredChild } = buildManager();

    await expect(manager.getOrCreateConfiguredChildTeam("configured-review-team-run"))
      .resolves.toMatchObject({ teamRunId: "configured-review-team-run" });
    await expect(manager.getOrCreateConfiguredChildTeam("foreign-team-run"))
      .rejects.toThrow("is not a direct configured child");

    expect(materializeConfiguredChild).toHaveBeenCalledOnce();
    expect(materializeConfiguredChild).toHaveBeenCalledWith(expect.objectContaining({
      parentContext: context,
      configuredMemberActivationMode: "restore",
      teamNode: expect.objectContaining({
        address: "/review_team",
        teamRunId: "configured-review-team-run",
        coordinatorAddress: "/review_team/reviewer",
      }),
    }));
  });

  it("prepares a fresh task Team, hides it until commit, and releases its exact coordinator message once", async () => {
    const { manager, runs, prepareFreshTaskTeam } = buildManager();
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
    expect(prepareFreshTaskTeam).toHaveBeenCalledOnce();
    expect(runs.get(teamNode.teamRunId)?.context.runtimeContext.configuredMemberActivationMode)
      .toBe("fresh");
    expect(manager.getLeafAgentStatusSnapshots()).toHaveLength(2);
    prepared.sealForCommit();
    const committed = prepared.commitAfterDurability();
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
    prepared.commitAfterDurability();
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

  it("freezes configured and delegated descendants once, dispatches every interrupt, and retries the same scope", async () => {
    const { manager, context, runs } = buildManager();
    const activationSpy = vi.spyOn(MixedAgentMemberHandle.prototype, "prepareForTaskActivation")
      .mockResolvedValue({
        stagedPlatformBindings: Object.freeze([]),
        commitAfterDurability: vi.fn(),
        abort: vi.fn(async () => undefined),
      });
    const directAgentContext = context.runtimeContext.memberContexts.find((member) => member.kind === "agent")!;
    const configuredAgent = (manager as unknown as {
      configured: { getOrCreate(member: typeof directAgentContext): MixedAgentMemberHandle };
    }).configured.getOrCreate(directAgentContext);
    const preparedTaskAgent = await manager.prepareTaskAgent({
      taskId: "task-agent-1",
      address: rootLead.address,
      agentRunId: "delegated-agent-run",
      sourceNode: rootLead,
      message: new AgentInputUserMessage("delegated agent work"),
    });
    const taskAgent = (manager as unknown as {
      taskAgents: { listPreparedHandles(): readonly MixedAgentMemberHandle[] };
    }).taskAgents.listPreparedHandles()[0]!;
    activationSpy.mockRestore();

    await manager.getOrCreateConfiguredChildTeam(configuredReviewTeam.teamRunId);
    const taskTeamNode = freshTaskTeam();
    const preparedTaskTeam = await manager.prepareTaskTeam({
      taskId: "task-team-1",
      address: taskTeamNode.address,
      teamRunId: taskTeamNode.teamRunId,
      handoffs: [],
      teamNode: taskTeamNode,
      message: new AgentInputUserMessage("delegated team work"),
    });

    const order: string[] = [];
    const localTermination = (label: string) => {
      const finish = vi.fn(async () => { order.push(`${label}:finish`); return { accepted: true as const }; });
      const commit = vi.fn(() => Object.freeze({ finish }));
      return Object.freeze({ cancel: vi.fn(), commit });
    };
    vi.spyOn(configuredAgent, "interruptForRootTermination")
      .mockImplementation(async () => { order.push("configured-agent:interrupt"); return { accepted: true }; });
    vi.spyOn(taskAgent, "interruptForRootTermination")
      .mockImplementation(async () => { order.push("task-agent:interrupt"); return { accepted: true }; });
    vi.spyOn(configuredAgent, "prepareTermination")
      .mockImplementation(async () => { order.push("configured-agent:prepare"); return localTermination("configured-agent"); });
    vi.spyOn(taskAgent, "prepareTermination")
      .mockImplementation(async () => { order.push("task-agent:prepare"); return localTermination("task-agent"); });

    const configuredChild = runs.get(configuredReviewTeam.teamRunId)!;
    const taskChild = runs.get(taskTeamNode.teamRunId)!;
    configuredChild.frozenScope.interruptActiveTurns.mockImplementation(async () => {
      order.push("configured-child:interrupt");
      return { accepted: true };
    });
    taskChild.frozenScope.interruptActiveTurns.mockImplementation(async () => {
      order.push("task-child:interrupt");
      return { accepted: true };
    });
    configuredChild.frozenScope.prepareMemberRuns.mockImplementation(async () => {
      order.push("configured-child:prepare");
    });
    taskChild.frozenScope.prepareMemberRuns.mockImplementation(async () => {
      order.push("task-child:prepare");
    });
    configuredChild.frozenScope.finish.mockImplementation(async () => {
      order.push("configured-child:finish");
      return { accepted: true };
    });
    taskChild.frozenScope.finish
      .mockImplementationOnce(async () => {
        order.push("task-child:finish-rejected");
        return { accepted: false, code: "DESCENDANT_BUSY" };
      })
      .mockImplementationOnce(async () => {
        order.push("task-child:finish");
        return { accepted: true };
      });

    const scope = manager.freezeForRootTermination();
    expect(manager.freezeForRootTermination()).toBe(scope);
    expect(configuredChild.freezeForRootTermination).toHaveBeenCalledOnce();
    expect(taskChild.freezeForRootTermination).toHaveBeenCalledOnce();
    expect(preparedTaskAgent.binding).toMatchObject({ kind: "agent", agentRunId: "delegated-agent-run" });
    expect(preparedTaskTeam.binding).toMatchObject({ kind: "team", teamRunId: taskTeamNode.teamRunId });

    await expect(manager.prepareTaskAgent({
      taskId: "late-task",
      address: rootLead.address,
      agentRunId: "late-agent-run",
      sourceNode: rootLead,
      message: new AgentInputUserMessage("late"),
    })).rejects.toThrow("materialization is closed");
    const lateContext = new MixedAgentMemberContext({
      address: address("/late"),
      agentRunId: "late-configured-run",
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      platformAgentRunId: null,
    });
    expect(() => (manager as unknown as {
      configured: { getOrCreate(member: MixedAgentMemberContext): unknown };
    }).configured.getOrCreate(lateContext)).toThrow("cannot materialize after TeamRun freeze");

    const interruption = scope.interruptActiveTurns();
    expect(order).toEqual([
      "configured-agent:interrupt",
      "task-agent:interrupt",
      "configured-child:interrupt",
      "task-child:interrupt",
    ]);
    await expect(interruption).resolves.toEqual({ accepted: true });
    await scope.prepareMemberRuns();
    await expect(scope.finish()).resolves.toEqual({ accepted: false, code: "DESCENDANT_BUSY" });
    expect(manager.isTerminated()).toBe(false);
    await expect(scope.finish()).resolves.toEqual({ accepted: true });

    expect(configuredChild.frozenScope.finish).toHaveBeenCalledTimes(2);
    expect(taskChild.frozenScope.finish).toHaveBeenCalledTimes(2);
    expect(order.indexOf("task-child:finish")).toBeLessThan(order.indexOf("configured-agent:finish"));
    expect(order.indexOf("task-child:finish")).toBeLessThan(order.indexOf("task-agent:finish"));
    expect(manager.isTerminated()).toBe(true);
  });
});
