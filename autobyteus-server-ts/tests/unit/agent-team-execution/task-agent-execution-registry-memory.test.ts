import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import {
  TaskAgentExecutionRegistry,
} from "../../../src/agent-team-execution/local/registries/task-agent-execution-registry.js";
import { TaskAgentDurabilityEventGate } from "../../../src/agent-collaboration/execution/services/task-agent-durability-event-gate.js";
import { FlatAgentExecutionContext, FlatTeamExecutionContext } from "../../../src/agent-team-execution/local/flat-team-execution-context.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import {
  createCollaborationMemberExecutionIdentity,
  createRootExecutionPhysicalScope,
  createTeamRootExecutionIdentity,
} from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { CollaborationAgentExecutionEvent } from "../../../src/agent-collaboration/execution/domain/collaboration-agent-execution-event.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import {
  testAgentNode,
  testAgentTeamNode,
  testMemberExecutionContext,
  testTeamRunConfig,
} from "../../fixtures/current-team-run-fixtures.js";

const gateIdentity = createCollaborationMemberExecutionIdentity({
  root: createTeamRootExecutionIdentity("gate-root-run"),
  memberAddress: "/worker",
  agentRunId: "gate-agent-run",
});
const gateEvent = (marker: string): CollaborationAgentExecutionEvent => ({
  kind: "readiness_failure",
  code: marker,
  message: marker,
});

describe("TaskAgentDurabilityEventGate", () => {
  it("drains prepared and synchronous reentrant events in FIFO order before forwarding live events", () => {
    const first = gateEvent("first");
    const second = gateEvent("second");
    const reentrant = gateEvent("reentrant");
    const live = gateEvent("live");
    const forwarded: CollaborationAgentExecutionEvent[] = [];
    let gate!: TaskAgentDurabilityEventGate;
    gate = new TaskAgentDurabilityEventGate((_identity, event) => {
      forwarded.push(event);
      if (event === first) gate.publish(gateIdentity, reentrant);
    });

    gate.publish(gateIdentity, first);
    gate.publish(gateIdentity, second);
    expect(forwarded).toEqual([]);

    expect(gate.releaseToLive()).toBe(true);
    expect(forwarded).toEqual([first, second, reentrant]);

    gate.publish(gateIdentity, live);
    expect(forwarded).toEqual([first, second, reentrant, live]);
    expect(gate.releaseToLive()).toBe(true);
    expect(forwarded).toEqual([first, second, reentrant, live]);
  });

  it("drops retained and future events when aborted and never releases", () => {
    const forward = vi.fn();
    const gate = new TaskAgentDurabilityEventGate(forward);

    gate.publish(gateIdentity, gateEvent("retained"));
    gate.abort();
    gate.publish(gateIdentity, gateEvent("after-abort"));

    expect(gate.releaseToLive()).toBe(false);
    expect(forward).not.toHaveBeenCalled();
  });
});

describe("TaskAgentExecutionRegistry task-agent memory", () => {
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
    const physicalScope = createRootExecutionPhysicalScope({
      root: createTeamRootExecutionIdentity("owning-team-run"),
      ancestorTeamRunIds: [reviewTeam.teamRunId],
    });
    const teamContext = new TeamRunContext({
      physicalScope,
      teamRunId: reviewTeam.teamRunId,
      teamBackendKind: TeamBackendKind.MIXED,
      teamNode: reviewTeam,
      handoffs: config.handoffs,
      runtimeContext: new FlatTeamExecutionContext({
        memberContexts: [new FlatAgentExecutionContext({
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
    const memoryRoot = appConfigProvider.config.getMemoryDir();
    const getRootedLocation = vi.fn((scope: typeof physicalScope, agentRunId: string) => ({
      scope,
      agentRunId,
      memoryDir: new AgentMemoryLayout(memoryRoot).getRootedAgentRunDirPath(scope, agentRunId),
    }));
    const taskAgentRunId = "worker_00000000000000000000000000000001";
    const publish = vi.fn((_identity, _event) => undefined);
    const registry = new TaskAgentExecutionRegistry({
      teamContext,
      agentRunManager: { prepareNewAgentRun } as never,
      memoryLocator: {
        getLocation: getRootedLocation,
      } as never,
      activityInspector: { inspect: vi.fn(() => ({ kind: "none" })) } as never,
      callbacks: {
        buildMemberExecutionContext: vi.fn(async ({ identity }) => testMemberExecutionContext({
          rootTeamRunId: identity.root.rootRunId,
          memberAddress: identity.memberAddress,
          agentRunId: identity.agentRunId,
        })),
        publishAgentEvent: publish,
        commitPlatformBindingChange: vi.fn(async () => undefined),
      },
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
      root: expect.objectContaining({ rootRunId: config.rootTeam.teamRunId }),
      memberAddress: workerNode.address,
      agentRunId: taskAgentRunId,
    }));
    expect(publish.mock.calls[0]?.[1]).toEqual(expect.objectContaining({
      kind: "agent_run",
      event: expect.objectContaining({ eventType: AgentRunEventType.TURN_STARTED }),
    }));
    expect(publish.mock.calls[1]?.[1]).toEqual(expect.objectContaining({
      kind: "agent_run",
      event: expect.objectContaining({ eventType: AgentRunEventType.TURN_COMPLETED }),
    }));

    eventListeners[0]?.({
      eventType: AgentRunEventType.TURN_INTERRUPTED,
      runId: taskAgentRunId,
      payload: { turn_id: "turn-2", reason: "live" },
      statusHint: "IDLE",
    } satisfies AgentRunEvent);
    expect(publish).toHaveBeenCalledTimes(3);
    expect(publish.mock.calls[2]?.[1]).toEqual(expect.objectContaining({
      kind: "agent_run",
      event: expect.objectContaining({ eventType: AgentRunEventType.TURN_INTERRUPTED }),
    }));
    committed.releaseWork();
    expect(publish).toHaveBeenCalledTimes(3);

    await vi.waitFor(() => expect(postedMessages).toEqual([message]));
    expect(prepareNewAgentRun).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: taskAgentRunId,
        config: expect.objectContaining({
          memoryDir: new AgentMemoryLayout(memoryRoot)
            .getRootedAgentRunDirPath(physicalScope, taskAgentRunId),
        }),
      }),
    );
    expect(getRootedLocation).toHaveBeenCalledWith(physicalScope, taskAgentRunId);
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
