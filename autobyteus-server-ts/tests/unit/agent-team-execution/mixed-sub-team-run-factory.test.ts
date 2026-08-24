import { describe, expect, it } from "vitest";
import { MixedSubTeamRunFactory } from "../../../src/agent-team-execution/backends/mixed/mixed-sub-team-run-factory.js";
import { MixedTeamRunBackendFactory } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.js";
import { createRootTeamRunPhysicalScope } from "../../../src/agent-team-execution/domain/team-run-physical-scope.js";
import { testAgentNode, testAgentTeamNode, testTeamRunConfig } from "../../fixtures/current-team-run-fixtures.js";

describe("MixedSubTeamRunFactory physical scope", () => {
  it("appends each configured child boundary while inheriting handoffs and application binding", async () => {
    const deepAgent = testAgentNode("/child/deep/worker");
    const deepTeam = testAgentTeamNode({
      address: "/child/deep",
      coordinatorAddress: deepAgent.address,
      teamRunId: "deep-run",
      children: [deepAgent],
    });
    const childAgent = testAgentNode("/child/worker");
    const childTeam = testAgentTeamNode({
      address: "/child",
      coordinatorAddress: childAgent.address,
      teamRunId: "child-run",
      children: [childAgent, deepTeam],
    });
    const config = testTeamRunConfig({
      rootTeamRunId: "root-run",
      coordinatorAddress: "/lead",
      handoffs: [{ from: "/lead", to: "/child", rules: ["Delegate review."] }],
      children: [testAgentNode("/lead"), childTeam],
    });
    const backendFactory = new MixedTeamRunBackendFactory();
    const applicationBinding = { applicationId: "app-1", bindingId: "binding-1" };
    const rootContext = backendFactory.buildTeamRunContext({
      config,
      applicationBinding,
      physicalScope: createRootTeamRunPhysicalScope("root-run"),
      teamNode: config.rootTeam,
      configuredMemberActivationMode: "restore",
    });
    const factory = new MixedSubTeamRunFactory({
      buildContext: (input) => backendFactory.buildTeamRunContext(input),
      createTeamManager: () => ({}) as never,
    });

    const child = await factory.materializeConfiguredChild({
      parentContext: rootContext,
      teamNode: childTeam,
      configuredMemberActivationMode: "restore",
    });
    const deep = await factory.materializeConfiguredChild({
      parentContext: child.context as never,
      teamNode: deepTeam,
      configuredMemberActivationMode: "restore",
    });

    expect(child.context.physicalScope.ancestorTeamRunIds).toEqual(["child-run"]);
    expect(deep.context.physicalScope.ancestorTeamRunIds).toEqual(["child-run", "deep-run"]);
    expect(child.context.handoffs).toEqual(config.handoffs);
    expect(child.context.applicationBinding).toEqual(applicationBinding);
  });

  it("appends a delegated task-Team boundary while retaining task handoffs and no application binding", async () => {
    const templateAgent = testAgentNode("/review/worker");
    const template = testAgentTeamNode({
      address: "/review",
      coordinatorAddress: templateAgent.address,
      teamRunId: "configured-review-run",
      children: [templateAgent],
    });
    const config = testTeamRunConfig({
      rootTeamRunId: "root-run",
      coordinatorAddress: "/lead",
      handoffs: [{ from: "/lead", to: "/review", rules: ["Configured handoff."] }],
      children: [testAgentNode("/lead"), template],
    });
    const backendFactory = new MixedTeamRunBackendFactory();
    const rootContext = backendFactory.buildTeamRunContext({
      config,
      physicalScope: createRootTeamRunPhysicalScope("root-run"),
      teamNode: config.rootTeam,
      configuredMemberActivationMode: "fresh",
    });
    const factory = new MixedSubTeamRunFactory({
      buildContext: (input) => backendFactory.buildTeamRunContext(input),
      createTeamManager: () => ({}) as never,
    });
    const taskAgent = testAgentNode("/review/worker", { agentRunId: "task-worker-run" });
    const taskTeam = testAgentTeamNode({
      address: "/review",
      coordinatorAddress: taskAgent.address,
      teamRunId: "task-team-run",
      children: [taskAgent],
    });
    const taskHandoffs = [{ from: "/review/worker", to: "/lead", rules: ["Task handoff."] }];

    const task = await factory.prepareFreshTaskTeam({
      parentContext: rootContext,
      handoffs: taskHandoffs,
      teamNode: taskTeam,
    });

    expect(task.context.physicalScope).toEqual({
      rootTeamRunId: "root-run",
      ancestorTeamRunIds: ["task-team-run"],
    });
    expect(task.context.handoffs).toEqual(taskHandoffs);
    expect(task.context.applicationBinding).toBeNull();
    expect(task.context.runtimeContext?.configuredMemberActivationMode).toBe("fresh");
  });
});
