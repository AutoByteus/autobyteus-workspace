import { describe, expect, it, vi } from "vitest";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { MixedSubTeamMemberHandle } from "../../../src/agent-team-execution/backends/mixed/members/mixed-sub-team-member-handle.js";
import { MixedSubTeamMemberContext, MixedTeamRunContext } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { testAgentNode, testAgentTeamNode, testTeamRunConfig } from "../../fixtures/current-team-run-fixtures.js";

const reviewTeam = testAgentTeamNode({
  address: "/ReviewTeam",
  coordinatorAddress: "/ReviewTeam/Reviewer",
  teamDefinitionId: "review-team",
  teamRunId: "child-review-1",
  children: [
    testAgentNode("/ReviewTeam/Reviewer", { agentRunId: "run-reviewer", runtimeKind: RuntimeKind.CODEX_APP_SERVER }),
    testAgentNode("/ReviewTeam/Observer", { agentRunId: "run-observer", runtimeKind: RuntimeKind.CODEX_APP_SERVER }),
  ],
});
const config = testTeamRunConfig({
  rootTeamRunId: "parent-1",
  coordinatorAddress: "/Lead",
  children: [testAgentNode("/Lead", { agentRunId: "run-lead" }), reviewTeam],
});

const build = (terminationAccepted = true) => {
  let active = true;
  const childRuntime = new MixedTeamRunContext({
    memberContexts: [],
    configuredMemberActivationMode: "restore",
  });
  const childFinish = vi.fn(async () => {
    if (terminationAccepted) active = false;
    return terminationAccepted
      ? { accepted: true as const }
      : { accepted: false as const, code: "BUSY", message: "child still busy" };
  });
  const childCancel = vi.fn();
  const childCommit = vi.fn(() => ({ finish: childFinish }));
  const childRun = {
    teamRunId: "child-review-1",
    isActive: vi.fn(() => active),
    getRuntimeContext: vi.fn(() => childRuntime),
    getLeafAgentStatusSnapshots: vi.fn(() => []),
    hasOpenExecutionWork: vi.fn(() => false),
    prepareTermination: vi.fn(async () => ({ cancel: childCancel, commit: childCommit })),
  };
  const subTeamRunFactory = { materializeConfiguredChild: vi.fn(async () => childRun) };
  const parentContext = new TeamRunContext({
    rootTeamRunId: "parent-1",
    teamRunId: "parent-1",
    teamBackendKind: TeamBackendKind.MIXED,
    teamNode: config.rootTeam,
    handoffs: config.handoffs,
    runtimeContext: new MixedTeamRunContext({
      memberContexts: [],
      configuredMemberActivationMode: "restore",
    }),
  });
  const context = new MixedSubTeamMemberContext({
    address: reviewTeam.address,
    teamDefinitionId: "review-team",
    teamRunId: "child-review-1",
  });
  const handle = new MixedSubTeamMemberHandle({
    parentContext,
    context,
    config: reviewTeam,
    subTeamRunFactory: subTeamRunFactory as never,
  });
  return { handle, context, childRun, childRuntime, childCancel, childCommit, childFinish, subTeamRunFactory };
};

describe("MixedSubTeamMemberHandle", () => {
  it("materializes the exact configured child once and preserves its runtime context", async () => {
    const { handle, context, childRun, childRuntime, subTeamRunFactory } = build();

    await expect(handle.getOrCreateTeamRun()).resolves.toBe(childRun);
    await expect(handle.getOrCreateTeamRun()).resolves.toBe(childRun);
    expect(subTeamRunFactory.materializeConfiguredChild).toHaveBeenCalledOnce();
    expect(subTeamRunFactory.materializeConfiguredChild).toHaveBeenCalledWith({
      handoffs: config.handoffs,
      applicationBinding: null,
      rootTeamRunId: "parent-1",
      teamNode: reviewTeam,
      configuredMemberActivationMode: "restore",
    });
    expect(context.childRuntimeContext).toBe(childRuntime);
  });

  it("commits prepared termination once and clears only after accepted child teardown", async () => {
    const { handle, context, childCommit, childFinish } = build();
    await handle.getOrCreateTeamRun();

    const prepared = await handle.prepareTermination();
    const committed = prepared.commit();
    expect(prepared.commit()).toBe(committed);
    await expect(committed.finish()).resolves.toEqual({ accepted: true });

    expect(childCommit).toHaveBeenCalledOnce();
    expect(childFinish).toHaveBeenCalledOnce();
    expect(context.childRuntimeContext).toBeNull();
    expect(handle.isActive()).toBe(false);
  });

  it("keeps the child attached when committed termination rejects", async () => {
    const { handle, context, childRuntime } = build(false);
    await handle.getOrCreateTeamRun();

    await expect(handle.terminate()).resolves.toEqual({
      accepted: false,
      code: "BUSY",
      message: "child still busy",
    });
    expect(context.childRuntimeContext).toBe(childRuntime);
    expect(handle.isActive()).toBe(true);
  });

  it("cancels child termination preparation without clearing live state", async () => {
    const { handle, context, childRuntime, childCancel, childCommit } = build();
    await handle.getOrCreateTeamRun();
    const prepared = await handle.prepareTermination();

    prepared.cancel();
    prepared.cancel();

    expect(childCancel).toHaveBeenCalledOnce();
    expect(childCommit).not.toHaveBeenCalled();
    expect(context.childRuntimeContext).toBe(childRuntime);
    expect(() => prepared.commit()).toThrow("was cancelled");
  });
});
