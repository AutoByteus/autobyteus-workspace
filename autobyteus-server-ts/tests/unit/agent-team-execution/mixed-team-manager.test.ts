import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { MixedTeamManager } from "../../../src/agent-team-execution/backends/mixed/mixed-team-manager.js";
import { MixedTeamRunBackend } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-backend.js";
import { MixedAgentMemberContext, MixedSubTeamMemberContext, MixedTeamRunContext } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import type { InterAgentMessageDeliveryIntent } from "../../../src/agent-team-execution/domain/inter-agent-message-delivery.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { createTeamAgentExecutionBinding } from "../../../src/agent-team-execution/domain/team-agent-execution-binding.js";
import { createTeamAgentStatusDetails, createTeamAgentStatusSnapshot } from "../../../src/agent-team-execution/domain/team-agent-status.js";
import { createTeamExecutionAddress } from "../../../src/agent-team-execution/domain/team-execution-address.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { TeamRun } from "../../../src/agent-team-execution/domain/team-run.js";
import { TeamRunEventSourceType, type TeamRunEvent, type TeamRunEventListener } from "../../../src/agent-team-execution/domain/team-run-event.js";
import { clearTaskTeamActiveRunDirectory, getTaskTeamActiveRunDirectory } from "../../../src/agent-team-execution/task-delegation/task-team-active-run-directory.js";
import { testAgentNode, testAgentTeamNode, testTeamRunConfig } from "../../fixtures/current-team-run-fixtures.js";

const taskTeamRunId = "task-team-run-1";
const taskId = "task-1";

const buildSquadNode = testAgentTeamNode({
  address: "/BuildSquad",
  coordinatorAddress: "/BuildSquad/review_lead",
  teamRunId: "build-squad-run",
  teamDefinitionId: "build-squad-team",
  children: [
    testAgentNode("/BuildSquad/review_lead", {
      agentRunId: "review-lead-run",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    }),
    testAgentNode("/BuildSquad/implementer", {
      agentRunId: "implementer-run",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    }),
  ],
});
const taskBuildSquadNode = testAgentTeamNode({
  address: "/BuildSquad",
  coordinatorAddress: "/BuildSquad/review_lead",
  teamRunId: taskTeamRunId,
  teamDefinitionId: "build-squad-team",
  children: [
    testAgentNode("/BuildSquad/review_lead", {
      agentRunId: "review-lead-task-run",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    }),
    testAgentNode("/BuildSquad/implementer", {
      agentRunId: "implementer-task-run",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    }),
  ],
});
const rootConfig = testTeamRunConfig({
  rootTeamRunId: "parent-1",
  rootTeamDefinitionId: "parent-team",
  coordinatorAddress: "/program_manager",
  children: [
    testAgentNode("/program_manager", { agentRunId: "program-manager-run" }),
    buildSquadNode,
  ],
});
const taskRootConfig = testTeamRunConfig({
  rootTeamRunId: "parent-1",
  rootTeamDefinitionId: "parent-team",
  coordinatorAddress: "/program_manager",
  children: [
    testAgentNode("/program_manager", { agentRunId: "program-manager-run" }),
    taskBuildSquadNode,
  ],
});

const executionAddress = (memberAddress: string, taskTeamRunIds: string[] = []) =>
  createTeamExecutionAddress({ rootTeamRunId: "parent-1", taskTeamRunIds, memberAddress });

const buildIntent = (rootTeamRunId = "parent-1"): InterAgentMessageDeliveryIntent => ({
  rootTeamRunId,
  callerAddressing: {
    rootTeamRunId,
    memberAddress: "/BuildSquad/review_lead",
  },
  recipientAddress: "/program_manager",
  sender: { participant: {
    kind: "agent",
    displayName: "review_lead",
    agentRunId: "review-lead-run",
    executionAddress: createTeamExecutionAddress({
      rootTeamRunId,
      taskTeamRunIds: [],
      memberAddress: "/BuildSquad/review_lead",
    }),
    runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    platformAgentRunId: "platform-review-lead-run",
  } },
  content: "Build is complete.",
  messageType: "status_update",
});

const createChildManager = () => {
  const parentDeliverInterAgentMessage = vi.fn(async () => ({ accepted: true }));
  const context = new TeamRunContext({
    teamRunId: "build-squad-run",
    teamAddress: "/BuildSquad",
    teamBackendKind: TeamBackendKind.MIXED,
    config: rootConfig,
    runtimeContext: new MixedTeamRunContext({
      memberContexts: [new MixedAgentMemberContext({
        address: "/BuildSquad/review_lead",
        agentRunId: "review-lead-run",
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        platformAgentRunId: "platform-review-lead-run",
      })],
      parentBoundary: {
        parentTeamRunId: "parent-1",
        rootTeamRunId: "parent-1",
        parentTeamAddress: "/",
        deliverInterAgentMessage: parentDeliverInterAgentMessage,
      },
      teamExecutionAddress: executionAddress("/BuildSquad/review_lead"),
    }),
  });
  return { context, parentDeliverInterAgentMessage, manager: new MixedTeamManager(context) };
};

describe("MixedTeamManager parent-boundary delivery", () => {
  it("forwards one root-canonical intent unchanged with the actual nested Agent identity", async () => {
    const { manager, parentDeliverInterAgentMessage } = createChildManager();
    const intent = buildIntent();

    await expect(manager.deliverInterAgentMessage(intent)).resolves.toEqual({ accepted: true });
    expect(parentDeliverInterAgentMessage).toHaveBeenCalledTimes(1);
    expect(parentDeliverInterAgentMessage).toHaveBeenCalledWith(intent);
    expect(parentDeliverInterAgentMessage.mock.calls[0]![0].sender.participant).toMatchObject({
      kind: "agent",
      displayName: "review_lead",
      agentRunId: "review-lead-run",
      executionAddress: executionAddress("/BuildSquad/review_lead"),
    });
  });

  it("forwards a foreign-root intent unchanged so only the collaboration root validates it", async () => {
    const { manager, parentDeliverInterAgentMessage } = createChildManager();
    const intent = buildIntent("foreign-root");

    await expect(manager.deliverInterAgentMessage(intent)).resolves.toEqual({ accepted: true });
    expect(parentDeliverInterAgentMessage).toHaveBeenCalledWith(intent);
  });
});

const createRootManagerWithTaskTeamTarget = (taskScopedRoot = false) => {
  clearTaskTeamActiveRunDirectory();
  let childActive = true;
  const childListeners = new Set<TeamRunEventListener>();
  const taskExecutionAddress = executionAddress(
    "/BuildSquad/review_lead",
    [taskTeamRunId],
  );
  const taskSnapshot = createTeamAgentStatusSnapshot({
    execution: createTeamAgentExecutionBinding({
      executionAddress: taskExecutionAddress,
      agentRunId: "review-lead-task-run",
    }),
    details: createTeamAgentStatusDetails({ status: "idle" }),
  });
  const childRuntimeContext = new MixedTeamRunContext({
    memberContexts: [
      new MixedAgentMemberContext({
        address: "/BuildSquad/review_lead",
        agentRunId: "review-lead-task-run",
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        platformAgentRunId: "platform-review-lead-task-run",
      }),
      new MixedAgentMemberContext({
        address: "/BuildSquad/implementer",
        agentRunId: "implementer-task-run",
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        platformAgentRunId: "platform-implementer-task-run",
      }),
    ],
    taskId: taskId,
    teamExecutionAddress: executionAddress(
      "/BuildSquad",
      [taskTeamRunId],
    ),
  });
  const childContext = new TeamRunContext({
    teamRunId: taskTeamRunId,
    teamAddress: "/BuildSquad",
    taskTeamRunIds: [taskTeamRunId],
    teamBackendKind: TeamBackendKind.MIXED,
    config: taskRootConfig,
    runtimeContext: childRuntimeContext,
  });
  const childDeliverResolvedInterAgentMessage = vi.fn(async (
    _request,
    beforePublishMemberInput?: (() => void) | null,
  ) => {
    beforePublishMemberInput?.();
    return { accepted: true, code: "DELIVERED" };
  });
  const childRun = {
    teamRunId: taskTeamRunId,
    config: taskRootConfig,
    context: childContext,
    isActive: vi.fn(() => childActive),
    getLeafAgentStatusSnapshots: vi.fn(() => childActive ? [taskSnapshot] : []),
    hasOpenExecutionWork: vi.fn(() => false),
    getRuntimeContext: vi.fn(() => childRuntimeContext),
    subscribeToEvents: vi.fn((listener: TeamRunEventListener) => {
      childListeners.add(listener);
      return () => childListeners.delete(listener);
    }),
    postMessage: vi.fn(async () => ({ accepted: true })),
    deliverResolvedInterAgentMessage: childDeliverResolvedInterAgentMessage,
    approveToolInvocation: vi.fn(async () => ({ accepted: true })),
    interruptMember: vi.fn(async () => ({ accepted: true })),
    terminate: vi.fn(async () => {
      childActive = false;
      return { accepted: true };
    }),
  };
  const subTeamRunFactory = { createOrRestore: vi.fn(async () => childRun) };
  const parentContext = new TeamRunContext({
    teamRunId: "parent-1",
    teamAddress: "/",
    teamBackendKind: TeamBackendKind.MIXED,
    config: taskScopedRoot ? taskRootConfig : rootConfig,
    runtimeContext: new MixedTeamRunContext({
      memberContexts: [
        new MixedAgentMemberContext({
          address: "/program_manager",
          agentRunId: "program-manager-run",
          runtimeKind: RuntimeKind.AUTOBYTEUS,
          platformAgentRunId: null,
        }),
        new MixedSubTeamMemberContext({
          address: "/BuildSquad",
          teamDefinitionId: "build-squad-team",
          teamRunId: taskScopedRoot ? taskTeamRunId : "build-squad-run",
        }),
      ],
      teamExecutionAddress: executionAddress("/program_manager"),
    }),
  });
  return {
    childRun,
    manager: new MixedTeamManager(parentContext, {
      subTeamRunFactory: subTeamRunFactory as never,
    }),
    subTeamRunFactory,
    taskSnapshot,
    childDeliverResolvedInterAgentMessage,
  };
};

describe("MixedTeamManager logical message materialization", () => {
  it("materializes an AgentTeam recipient through its exact canonical coordinator", async () => {
    const { manager } = createRootManagerWithTaskTeamTarget();
    const resolveContext = vi.spyOn((manager as any).persistentMembers, "resolveContext");
    const deliver = vi.spyOn((manager as any).deliveryCoordinator, "deliver")
      .mockResolvedValue({ accepted: true, code: "DELIVERED" });
    const senderAddress = executionAddress("/program_manager");
    const intent: InterAgentMessageDeliveryIntent = {
      rootTeamRunId: "parent-1",
      callerAddressing: { rootTeamRunId: "parent-1", memberAddress: "/program_manager" },
      recipientAddress: "/BuildSquad",
      sender: { participant: {
        kind: "agent",
        displayName: "program_manager",
        agentRunId: "program-manager-run",
        executionAddress: senderAddress,
        runtimeKind: RuntimeKind.AUTOBYTEUS,
      } },
      content: "Please coordinate the build.",
    };

    await expect(manager.deliverInterAgentMessage(intent)).resolves.toEqual({
      accepted: true,
      code: "DELIVERED",
    });
    expect(resolveContext).toHaveBeenCalledWith("/BuildSquad/review_lead");
    expect(deliver).toHaveBeenCalledWith(intent, expect.objectContaining({
      targetAgentRunId: "review-lead-run",
      endpoint: { participant: expect.objectContaining({
        kind: "agent",
        displayName: "review_lead",
        agentRunId: "review-lead-run",
        executionAddress: executionAddress("/BuildSquad/review_lead"),
      }) },
    }));
  });

  it("delivers a same-task-Team peer with persistent parent placement and a fresh active TeamRun without fallback", async () => {
    const {
      childDeliverResolvedInterAgentMessage,
      manager,
    } = createRootManagerWithTaskTeamTarget();
    const persistentGetOrCreate = vi.spyOn((manager as any).persistentMembers, "getOrCreate");
    const events: TeamRunEvent[] = [];
    manager.subscribeToEvents((event) => events.push(event));
    const taskTeamRunIds = [taskTeamRunId];
    const senderAddress = executionAddress("/BuildSquad/review_lead", taskTeamRunIds);
    const receiverAddress = executionAddress("/BuildSquad/implementer", taskTeamRunIds);

    try {
      await expect(manager.startTaskTeamExecution({
        taskId: taskId,
        receiver: senderAddress,
        config: taskRootConfig,
        teamNode: taskBuildSquadNode,
        message: new AgentInputUserMessage("Start task-Team work."),
      })).resolves.toEqual({ accepted: true });
      manager.markTaskTeamExecutionActive(taskTeamRunId);
      manager.releaseTaskTeamExecutionWork(
        "/BuildSquad",
        taskTeamRunId,
      );

      const intent: InterAgentMessageDeliveryIntent = {
        rootTeamRunId: "parent-1",
        callerAddressing: {
          rootTeamRunId: "parent-1",
          memberAddress: "/BuildSquad/review_lead",
        },
        recipientAddress: "./implementer",
        sender: { participant: {
          kind: "agent",
          displayName: "review_lead",
          agentRunId: "review-lead-task-run",
          executionAddress: senderAddress,
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          platformAgentRunId: "platform-review-lead-task-run",
          taskId: taskId,
        } },
        content: "Please verify the task-scoped change.",
        messageType: "task_peer_request",
      };

      await expect(manager.deliverInterAgentMessage(intent)).resolves.toMatchObject({
        accepted: true,
        code: "DELIVERED",
        agentRunId: "implementer-task-run",
        displayName: "implementer",
      });

      expect(childDeliverResolvedInterAgentMessage).toHaveBeenCalledTimes(1);
      expect(childDeliverResolvedInterAgentMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          rootTeamRunId: "parent-1",
          recipientAddress: "./implementer",
          senderAddress,
          receiverAddress,
          targetAgentRunId: "implementer-task-run",
          recipient: { participant: expect.objectContaining({
            agentRunId: "implementer-task-run",
            executionAddress: receiverAddress,
            taskId: taskId,
          }) },
        }),
        expect.any(Function),
      );
      expect(persistentGetOrCreate).not.toHaveBeenCalled();
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        eventSourceType: TeamRunEventSourceType.COMMUNICATION,
        payload: {
          senderAddress,
          receiverAddress,
          content: "Please verify the task-scoped change.",
          messageType: "task_peer_request",
          referenceFiles: [],
        },
      });
    } finally {
      clearTaskTeamActiveRunDirectory();
    }
  });
});

describe("MixedTeamManager termination lifecycle", () => {
  it("keeps active task-Team handles in snapshots until accepted settlement removes them", async () => {
    const { childRun, manager, subTeamRunFactory, taskSnapshot } = createRootManagerWithTaskTeamTarget(true);
    const events: TeamRunEvent[] = [];
    manager.subscribeToEvents((event) => events.push(event));
    const directory = getTaskTeamActiveRunDirectory();
    const receiver = executionAddress(
      "/BuildSquad/review_lead",
      [taskTeamRunId],
    );

    try {
      await expect(manager.startTaskTeamExecution({
        taskId: taskId,
        receiver,
        config: taskRootConfig,
        teamNode: taskBuildSquadNode,
        message: new AgentInputUserMessage("Start task-Team work."),
      })).resolves.toEqual({ accepted: true });
      manager.markTaskTeamExecutionActive(taskTeamRunId);
      manager.releaseTaskTeamExecutionWork(
        "/BuildSquad",
        taskTeamRunId,
      );

      expect(subTeamRunFactory.createOrRestore).toHaveBeenCalledWith(expect.objectContaining({
        config: taskRootConfig,
        teamNode: taskBuildSquadNode,
        taskId: taskId,
        taskTeamRunIds: [taskTeamRunId],
        parentBoundary: expect.objectContaining({
          parentTeamRunId: "parent-1",
          rootTeamRunId: "parent-1",
          parentTeamAddress: "/",
        }),
      }));
      await vi.waitFor(() => {
        expect(childRun.postMessage).toHaveBeenCalledWith(
          expect.any(AgentInputUserMessage),
          "/BuildSquad/review_lead",
        );
      });
      expect(directory.resolveActiveRun(taskTeamRunId)?.teamRunId)
        .toBe(taskTeamRunId);
      expect(manager.getLeafAgentStatusSnapshots()).toContainEqual(taskSnapshot);

      await expect(manager.settleTaskTeamExecution(
        "/BuildSquad",
        taskTeamRunId,
      )).resolves.toEqual({ accepted: true });

      expect(childRun.terminate).toHaveBeenCalledTimes(1);
      expect(manager.getLeafAgentStatusSnapshots()).not.toContainEqual(taskSnapshot);
      expect(directory.resolveKnownEntryByTaskTeamRunId(taskTeamRunId)).toBeNull();
      expect(events).toEqual([]);
    } finally {
      clearTaskTeamActiveRunDirectory();
    }
  });

  it("rejects a task-Team receiver outside its configured coordinator before starting", async () => {
    const { manager, subTeamRunFactory } = createRootManagerWithTaskTeamTarget(true);

    try {
      await expect(manager.startTaskTeamExecution({
        taskId: taskId,
        receiver: executionAddress("/BuildSquad", [taskTeamRunId]),
        config: taskRootConfig,
        teamNode: taskBuildSquadNode,
        message: new AgentInputUserMessage("Start task-Team work."),
      })).resolves.toEqual({
        accepted: false,
        code: "TASK_TEAM_IDENTITY_MISMATCH",
        message: "Task AgentTeam '/BuildSquad' receiver does not match its coordinator or task execution chain.",
      });
      expect(subTeamRunFactory.createOrRestore).not.toHaveBeenCalled();
    } finally {
      clearTaskTeamActiveRunDirectory();
    }
  });

  it("joins repeated termination and rejects all supported task operations at the TeamRun boundary", async () => {
    const { context, manager } = createChildManager();
    const teamRun = new TeamRun({
      context,
      backend: new MixedTeamRunBackend(context, manager),
    });
    const events: unknown[] = [];
    teamRun.subscribeToEvents((event) => events.push(event));
    let resolveTaskAgents: ((value: { accepted: true }) => void) | null = null;
    const terminateTaskAgents = vi.fn(() => new Promise<{ accepted: true }>((resolve) => {
      resolveTaskAgents = resolve;
    }));
    (manager as any).taskAgentExecutions.terminateAll = terminateTaskAgents;
    const taskAgentRegistry = (manager as any).taskAgentExecutions;
    const taskTeamRegistry = (manager as any).taskTeamExecutions;
    const registryCalls = [
      vi.spyOn(taskAgentRegistry, "start").mockResolvedValue({ accepted: true }),
      vi.spyOn(taskAgentRegistry, "settle").mockResolvedValue({ accepted: true }),
      vi.spyOn(taskTeamRegistry, "start").mockResolvedValue({ accepted: true }),
      vi.spyOn(taskTeamRegistry, "postMessage").mockResolvedValue({ accepted: true }),
      vi.spyOn(taskTeamRegistry, "settle").mockResolvedValue({ accepted: true }),
    ];

    const firstTerminate = teamRun.terminate();
    const secondTerminate = teamRun.terminate();

    expect(teamRun.isActive()).toBe(false);
    expect(terminateTaskAgents).toHaveBeenCalledTimes(1);
    const runNotFound = {
      accepted: false,
      code: "RUN_NOT_FOUND",
      message: "Run 'build-squad-run' is not active.",
    };
    await expect(Promise.all([
      teamRun.startTaskAgentExecution({} as never),
      teamRun.settleTaskAgentExecution("/BuildSquad/review_lead", "task-agent-run-1"),
      teamRun.startTaskTeamExecution({} as never),
      teamRun.postMessageToTaskTeamExecution(
        "/BuildSquad",
        "task-team-run-1",
        new AgentInputUserMessage("late task-Team work"),
      ),
      teamRun.settleTaskTeamExecution("/BuildSquad", "task-team-run-1"),
    ])).resolves.toEqual(Array.from({ length: 5 }, () => runNotFound));
    for (const registryCall of registryCalls) expect(registryCall).not.toHaveBeenCalled();

    resolveTaskAgents?.({ accepted: true });
    await expect(firstTerminate).resolves.toEqual({ accepted: true });
    await expect(secondTerminate).resolves.toEqual({ accepted: true });
    await expect(teamRun.terminate()).resolves.toEqual({ accepted: true });
    expect(events).toEqual([]);
    expect(teamRun.isActive()).toBe(false);
  });

  it("keeps the Team active when active child termination is rejected", async () => {
    const { manager } = createChildManager();
    const events: unknown[] = [];
    manager.subscribeToEvents((event) => events.push(event));
    (manager as any).taskAgentExecutions.terminateAll = vi.fn(async () => ({
      accepted: false,
      code: "ACTIVE_TERMINATION_FAILED",
      message: "child refused termination",
    }));

    await expect(manager.terminate()).resolves.toEqual({
      accepted: false,
      code: "ACTIVE_TERMINATION_FAILED",
      message: "child refused termination",
    });
    expect(events).toEqual([]);
    expect(manager.hasActiveMembers()).toBe(true);
  });
});
