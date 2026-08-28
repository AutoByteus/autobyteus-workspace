import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentConversationActivityInspector } from "../../../src/agent-memory/services/agent-conversation-activity-inspector.js";
import { AgentMemoryLocationService } from "../../../src/agent-memory/services/agent-memory-location-service.js";
import { MixedSubTeamRunFactory } from "../../../src/agent-team-execution/backends/mixed/mixed-sub-team-run-factory.js";
import { MixedTeamManager } from "../../../src/agent-team-execution/backends/mixed/mixed-team-manager.js";
import { MixedTeamRunBackendFactory } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.js";
import { TeamRun } from "../../../src/agent-team-execution/domain/team-run.js";
import { TeamExecutionIndex } from "../../../src/agent-team-execution/services/team-execution-index.js";
import { buildInitialTeamRunExecutionTree } from "../../../src/agent-team-execution/services/team-run-execution-tree-builder.js";
import { MemberTeamContextBuilder } from "../../../src/agent-team-execution/services/member-team-context-builder.js";
import { TeamRunResolver } from "../../../src/agent-team-execution/services/team-run-resolver.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { createStoredTeamRunExecutionTreeLocationService } from "../../../src/run-history/services/team-run-execution-tree-location-service.js";
import { WorkspaceManager } from "../../../src/workspaces/workspace-manager.js";
import { testAgentNode, testAgentTeamNode, testMemberTaskRootResolver, testTeamRunConfig } from "../../fixtures/current-team-run-fixtures.js";

const deferred = <T = void>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((settle) => { resolve = settle; });
  return { promise, resolve };
};

afterEach(() => vi.restoreAllMocks());

describe("TeamRunResolver configured child overlap", () => {
  it("joins child materialization and agent readiness for overlapping first commands", async () => {
    const agentRunId = "configured-overlap-native-agent";
    const childTeamRunId = "configured-overlap-child";
    const child = testAgentTeamNode({
      address: "/Nested",
      coordinatorAddress: "/Nested/Worker",
      teamRunId: childTeamRunId,
      children: [testAgentNode("/Nested/Worker", {
        agentRunId,
        runtimeKind: RuntimeKind.AUTOBYTEUS,
      })],
    });
    const config = testTeamRunConfig({
      rootTeamRunId: "configured-overlap-root",
      coordinatorAddress: "/Lead",
      children: [testAgentNode("/Lead"), child],
    });
    const candidateStarted = deferred();
    const releaseCandidate = deferred();
    const postUserMessage = vi.fn(async () => ({ accepted: true as const }));
    const run = {
      runId: agentRunId,
      isActive: () => true,
      subscribeToEvents: vi.fn(() => () => undefined),
      postUserMessage,
    };
    const candidate = {
      runId: agentRunId,
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      platformAgentRunId: agentRunId,
      commitPublication: vi.fn(() => run),
      abort: vi.fn(async () => ({ kind: "aborted" as const })),
    };
    const agentRunManager = {
      prepareNewAgentRun: vi.fn(async () => {
        candidateStarted.resolve();
        await releaseCandidate.promise;
        return candidate;
      }),
      prepareRestoreAgentRun: vi.fn(),
      prepareRestoreAgentRunFromPlatformState: vi.fn(),
    };
    const memoryDir = "/tmp/configured-overlap";
    const memoryLocationService = new AgentMemoryLocationService({
      memoryDir,
      locationService: createStoredTeamRunExecutionTreeLocationService(memoryDir),
    });
    const activityInspector = new AgentConversationActivityInspector();
    const memberTeamContextBuilder = new MemberTeamContextBuilder();
    const workspaceManager = WorkspaceManager.getInstance();
    const backendFactory = new MixedTeamRunBackendFactory({
      createTeamManager: (input) => new MixedTeamManager(input.context, {
        subTeamRunFactory: input.subTeamRunFactory,
        agentRunManager: agentRunManager as never,
        memoryLocationService,
        activityInspector,
        memberTeamContextBuilder,
        workspaceManager,
        taskRootResolver: input.callbacks.taskRootResolver,
        publish: input.callbacks.publish,
        deliverInterAgentMessage: input.callbacks.deliverInterAgentMessage,
        acceptPlatformBinding: input.callbacks.acceptPlatformBinding,
      }),
    });
    const callbacks = {
      taskRootResolver: testMemberTaskRootResolver(),
      publish: vi.fn(),
      deliverInterAgentMessage: vi.fn(async () => ({ accepted: true as const })),
      acceptPlatformBinding: vi.fn(async () => undefined),
    };
    const rootBackend = await backendFactory.restoreBackend(config, config.rootTeam.teamRunId, callbacks);
    const rootRun = new TeamRun(rootBackend.getTeamRunContext(), rootBackend);
    const index = new TeamExecutionIndex(buildInitialTeamRunExecutionTree({
      config,
      teamDefinitionName: "Configured overlap team",
      createdAt: "2026-08-17T00:00:00.000Z",
    }));
    const resolver = new TeamRunResolver({ rootTeamRun: rootRun, getIndex: () => index });

    vi.spyOn(MemberTeamContextBuilder.prototype, "build").mockResolvedValue(null as never);
    vi.spyOn(AgentConversationActivityInspector.prototype, "inspect").mockReturnValue({ kind: "none" });
    const childMaterializationStarted = deferred();
    const releaseChildMaterialization = deferred();
    const materializeConfiguredChild = MixedSubTeamRunFactory.prototype.materializeConfiguredChild;
    const materializationSpy = vi.spyOn(MixedSubTeamRunFactory.prototype, "materializeConfiguredChild")
      .mockImplementation(async function (input) {
        childMaterializationStarted.resolve();
        await releaseChildMaterialization.promise;
        return materializeConfiguredChild.call(this, input);
      });

    const send = async (content: string) => {
      const nestedRun = await resolver.requireConfigured(childTeamRunId);
      const result = await nestedRun.postMessage(new AgentInputUserMessage(content), agentRunId);
      return { nestedRun, result };
    };
    const first = send("first");
    await childMaterializationStarted.promise;
    const second = send("second");

    expect(materializationSpy).toHaveBeenCalledOnce();
    releaseChildMaterialization.resolve();
    await candidateStarted.promise;
    expect(agentRunManager.prepareNewAgentRun).toHaveBeenCalledOnce();
    releaseCandidate.resolve();

    const [firstResult, secondResult] = await Promise.all([first, second]);
    expect(firstResult.nestedRun).toBe(secondResult.nestedRun);
    expect(firstResult.result).toMatchObject({ accepted: true, agentRunId });
    expect(secondResult.result).toMatchObject({ accepted: true, agentRunId });
    expect(resolver.getActive(childTeamRunId)).toBe(firstResult.nestedRun);
    expect(materializationSpy).toHaveBeenCalledOnce();
    expect(candidate.commitPublication).toHaveBeenCalledOnce();
    expect(postUserMessage).toHaveBeenCalledTimes(2);
    expect(callbacks.acceptPlatformBinding).not.toHaveBeenCalled();
  });
});
