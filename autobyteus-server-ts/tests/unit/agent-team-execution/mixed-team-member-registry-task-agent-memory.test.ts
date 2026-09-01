import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { AgentMemoryLocationService } from "../../../src/agent-memory/services/agent-memory-location-service.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import {
  MixedTaskAgentExecutionRegistry,
  TaskAgentDurabilityEventGate,
} from "../../../src/agent-team-execution/backends/mixed/members/mixed-task-agent-execution-registry.js";
import { MixedAgentMemberContext, MixedTeamRunContext } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import type { TeamRunEvent } from "../../../src/agent-team-execution/domain/team-run-event.js";
import {
  createChildTeamRunPhysicalScope,
  createRootTeamRunPhysicalScope,
} from "../../../src/agent-team-execution/domain/team-run-physical-scope.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { createStoredTeamRunExecutionTreeLocationService } from "../../../src/run-history/services/team-run-execution-tree-location-service.js";
import {
  testAgentNode,
  testAgentTeamNode,
  testMemberTeamContext,
  testTeamRunConfig,
} from "../../fixtures/current-team-run-fixtures.js";

const opaqueTeamEvent = (marker: string): TeamRunEvent => ({ marker } as unknown as TeamRunEvent);

describe("TaskAgentDurabilityEventGate", () => {
  it("drains prepared and synchronous reentrant events in FIFO order before forwarding live events", () => {
    const first = opaqueTeamEvent("first");
    const second = opaqueTeamEvent("second");
    const reentrant = opaqueTeamEvent("reentrant");
    const live = opaqueTeamEvent("live");
    const forwarded: TeamRunEvent[] = [];
    let gate!: TaskAgentDurabilityEventGate;
    gate = new TaskAgentDurabilityEventGate((event) => {
      forwarded.push(event);
      if (event === first) gate.publish(reentrant);
    });

    gate.publish(first);
    gate.publish(second);
    expect(forwarded).toEqual([]);

    expect(gate.releaseToLive()).toBe(true);
    expect(forwarded).toEqual([first, second, reentrant]);

    gate.publish(live);
    expect(forwarded).toEqual([first, second, reentrant, live]);
    expect(gate.releaseToLive()).toBe(true);
    expect(forwarded).toEqual([first, second, reentrant, live]);
  });

  it("drops retained and future events when aborted and never releases", () => {
    const forward = vi.fn();
    const gate = new TaskAgentDurabilityEventGate(forward);

    gate.publish(opaqueTeamEvent("retained"));
    gate.abort();
    gate.publish(opaqueTeamEvent("after-abort"));

    expect(gate.releaseToLive()).toBe(false);
    expect(forward).not.toHaveBeenCalled();
  });
});

describe("MixedTaskAgentExecutionRegistry task-agent memory", () => {
  it("keeps a fresh task Agent as a leaf in its containing nested TeamRun scope and releases work only after commit", async () => {
    const workerNode = testAgentNode("/review/worker", {
      agentRunId: "worker-template-run",
      agentDefinitionId: "agent-worker",
      llmModelIdentifier: "model-1",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    });
    const reviewTeam = testAgentTeamNode({
      address: "/review",
      coordinatorAddress: workerNode.address,
      teamRunId: "review-team-run",
      children: [workerNode],
    });
    const config = testTeamRunConfig({
      rootTeamRunId: "owning-team-run",
      rootTeamDefinitionId: "team-def",
      coordinatorAddress: "/lead",
      children: [testAgentNode("/lead"), reviewTeam],
    });
    const physicalScope = createChildTeamRunPhysicalScope(
      createRootTeamRunPhysicalScope("owning-team-run"),
      reviewTeam.teamRunId,
    );
    const teamContext = new TeamRunContext({
      physicalScope,
      teamRunId: reviewTeam.teamRunId,
      teamBackendKind: TeamBackendKind.MIXED,
      teamNode: reviewTeam,
      handoffs: config.handoffs,
      runtimeContext: new MixedTeamRunContext({
        memberContexts: [new MixedAgentMemberContext({
          address: workerNode.address,
          agentRunId: "worker-template-run",
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          platformAgentRunId: null,
        })],
        configuredMemberActivationMode: "fresh",
      }),
    });
    const postedMessages: AgentInputUserMessage[] = [];
    const createdConfigs: unknown[] = [];
    const eventListeners: Array<(event: unknown) => void> = [];
    const prepareNewAgentRun = vi.fn(async ({ config: runConfig, runId }) => {
      createdConfigs.push(runConfig);
      const run = {
        runId,
        config: runConfig,
        isActive: () => true,
        getPlatformAgentRunId: () => null,
        getStatusSnapshot: () => ({ status: "idle" }),
        subscribeToEvents: (listener: (event: unknown) => void) => {
          eventListeners.push(listener);
          return () => undefined;
        },
        postUserMessage: async (message: AgentInputUserMessage) => {
          postedMessages.push(message);
          return { accepted: true as const };
        },
        approveToolInvocation: async () => ({ accepted: true as const }),
        interrupt: async () => ({ accepted: true as const }),
        prepareTermination: async () => ({
          cancel: () => undefined,
          commit: () => ({ finish: async () => ({ accepted: true as const }) }),
        }),
      };
      return {
        runId,
        runtimeKind: runConfig.runtimeKind,
        platformAgentRunId: `platform-${runId}`,
        commitPublication: () => run,
        abort: async () => ({ kind: "aborted" as const }),
      };
    });
    const memoryLocationService = new AgentMemoryLocationService({
      memoryDir: appConfigProvider.config.getMemoryDir(),
      locationService: createStoredTeamRunExecutionTreeLocationService(
        appConfigProvider.config.getMemoryDir(),
      ),
    });
    const getTeamAgentRunLocation = vi.spyOn(
      memoryLocationService,
      "getTeamAgentRunLocation",
    );
    const taskAgentRunId = "worker_00000000000000000000000000000001";
    const publish = vi.fn((_event: TeamRunEvent) => undefined);
    const registry = new MixedTaskAgentExecutionRegistry({
      teamContext,
      agentRunManager: { prepareNewAgentRun } as never,
      memoryLocationService,
      activityInspector: { inspect: vi.fn(() => ({ kind: "none" })) } as never,
      memberTeamContextBuilder: {
        build: vi.fn(async ({ agentNode }: { agentNode: { agentRunId: string } }) => testMemberTeamContext({
          rootTeamRunId: config.rootTeam.teamRunId,
          memberAddress: workerNode.address,
          agentRunId: agentNode.agentRunId,
        })),
      } as never,
      publish,
      deliverInterAgentMessage: vi.fn(),
      acceptPlatformBinding: vi.fn(async () => undefined),
    });
    const message = new AgentInputUserMessage("start task", SenderType.USER);

    const prepared = await registry.prepare({
      taskId: "task_0001",
      address: workerNode.address,
      agentRunId: taskAgentRunId,
      sourceNode: workerNode,
      message,
    });

    expect(prepared.binding).toEqual({
      kind: "agent",
      address: "/review/worker",
      agentRunId: taskAgentRunId,
    });
    expect(prepared.stagedPlatformBindings).toEqual([
      expect.objectContaining({
        platformAgentRunId: `platform-${taskAgentRunId}`,
      }),
    ]);
    expect(registry.get(taskAgentRunId)).toBeNull();
    expect(postedMessages).toEqual([]);
    prepared.sealForCommit();
    const committed = prepared.commitAfterDurability();
    expect(registry.get(taskAgentRunId)).not.toBeNull();
    expect(eventListeners).toHaveLength(1);
    eventListeners[0]?.({
      eventType: AgentRunEventType.TURN_STARTED,
      runId: taskAgentRunId,
      payload: { turn_id: "turn-1" },
      statusHint: "ACTIVE",
    } satisfies AgentRunEvent);
    expect(publish).not.toHaveBeenCalled();

    publish.mockImplementationOnce(() => {
      eventListeners[0]?.({
        eventType: AgentRunEventType.TURN_COMPLETED,
        runId: taskAgentRunId,
        payload: { turn_id: "turn-1", reason: "reentrant" },
        statusHint: "IDLE",
      } satisfies AgentRunEvent);
    });
    committed.releaseWork();
    expect(postedMessages).toEqual([]);
    expect(publish).toHaveBeenCalledTimes(2);
    expect(publish.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      eventSourceType: "AGENT",
      execution: expect.objectContaining({ agentRunId: taskAgentRunId }),
      payload: expect.objectContaining({ eventType: "TURN_STARTED" }),
    }));
    expect(publish.mock.calls[1]?.[0]).toEqual(expect.objectContaining({
      payload: expect.objectContaining({ eventType: "TURN_COMPLETED" }),
    }));

    eventListeners[0]?.({
      eventType: AgentRunEventType.TURN_INTERRUPTED,
      runId: taskAgentRunId,
      payload: { turn_id: "turn-2", reason: "live" },
      statusHint: "IDLE",
    } satisfies AgentRunEvent);
    expect(publish).toHaveBeenCalledTimes(3);
    expect(publish.mock.calls[2]?.[0]).toEqual(expect.objectContaining({
      payload: expect.objectContaining({ eventType: "TURN_INTERRUPTED" }),
    }));
    committed.releaseWork();
    expect(publish).toHaveBeenCalledTimes(3);

    await vi.waitFor(() => expect(postedMessages).toEqual([message]));
    expect(prepareNewAgentRun).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: taskAgentRunId,
        config: expect.objectContaining({
          memoryDir: new AgentMemoryLayout(appConfigProvider.config.getMemoryDir())
            .getTeamAgentRunDirPath({
              rootTeamRunId: "owning-team-run",
              ancestorTeamRunIds: ["review-team-run"],
            }, taskAgentRunId),
        }),
      }),
    );
    expect(getTeamAgentRunLocation).toHaveBeenCalledWith({
      ...physicalScope,
      agentRunId: taskAgentRunId,
    });
    expect((createdConfigs[0] as { memoryDir?: string }).memoryDir).not.toBe("/tmp/template-member-memory-dir");

    const disposedTaskAgentRunId = "worker_00000000000000000000000000000002";
    const disposedMessage = new AgentInputUserMessage("must not start", SenderType.USER);
    const disposedPrepared = await registry.prepare({
      taskId: "task_0002",
      address: workerNode.address,
      agentRunId: disposedTaskAgentRunId,
      sourceNode: workerNode,
      message: disposedMessage,
    });
    disposedPrepared.sealForCommit();
    const disposedCommitted = disposedPrepared.commitAfterDurability();
    expect(eventListeners).toHaveLength(2);
    const publishedBeforeDisposedRelease = publish.mock.calls.length;
    eventListeners[1]?.({
      eventType: AgentRunEventType.TURN_STARTED,
      runId: disposedTaskAgentRunId,
      payload: { turn_id: "turn-disposed" },
      statusHint: "ACTIVE",
    } satisfies AgentRunEvent);
    expect(publish).toHaveBeenCalledTimes(publishedBeforeDisposedRelease);

    registry.dispose();
    disposedCommitted.releaseWork();
    await Promise.resolve();
    expect(postedMessages).toEqual([message]);
    expect(publish).toHaveBeenCalledTimes(publishedBeforeDisposedRelease);
  });
});
