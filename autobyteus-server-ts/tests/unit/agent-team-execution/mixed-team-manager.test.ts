import { describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import type { InterAgentMessageDeliveryIntent } from "../../../src/agent-team-execution/domain/inter-agent-message-delivery.js";
import {
  TeamRunEventSourceType,
  type TeamRunEvent,
  type TeamRunEventListener,
} from "../../../src/agent-team-execution/domain/team-run-event.js";
import {
  MixedAgentMemberContext,
  MixedSubTeamMemberContext,
  MixedTeamRunContext,
} from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { MixedTeamManager } from "../../../src/agent-team-execution/backends/mixed/mixed-team-manager.js";
import type { TaskTeamInstanceIdentity } from "../../../src/agent-team-execution/domain/task-team-instance.js";
import {
  clearTaskTeamActiveRunDirectory,
  getTaskTeamActiveRunDirectory,
} from "../../../src/agent-team-execution/task-delegation/task-team-active-run-directory.js";

const taskTeamInstance: TaskTeamInstanceIdentity = {
  taskTeamInstanceId: "task-team-instance-1",
  taskTeamRunId: "task-team-run-1",
  parentTeamRunId: "parent-1",
  taskId: "task-1",
  logicalTeam: {
    memberName: "BuildSquad",
    memberPath: ["BuildSquad"],
    memberRouteKey: "BuildSquad",
    templateMemberRunId: "build-squad-run",
    teamDefinitionId: "build-squad-team",
    coordinatorMemberRouteKey: "review_lead",
  },
  ingress: {
    memberName: "review_lead",
    memberPath: ["review_lead"],
    memberRouteKey: "review_lead",
    memberRunId: "review-lead-run",
  },
  createdAt: "2026-05-13T12:00:00.000Z",
};

const createChildManager = () => {
  const parentDeliverInterAgentMessage = vi.fn(async () => ({ accepted: true }));
  const config = new TeamRunConfig({
    teamDefinitionId: "build-squad-team",
    teamBackendKind: TeamBackendKind.MIXED,
    coordinatorMemberRouteKey: "review_lead",
    memberTree: [{
      memberKind: "agent",
      memberName: "review_lead",
      memberPath: ["review_lead"],
      memberRouteKey: "review_lead",
      memberRunId: "review-lead-run",
      agentDefinitionId: "agent-review-lead",
      llmModelIdentifier: "gpt-test",
      autoExecuteTools: false,
      skillAccessMode: SkillAccessMode.NONE,
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    }],
  });
  const context = new TeamRunContext({
    runId: "child-1",
    teamBackendKind: TeamBackendKind.MIXED,
    coordinatorMemberRouteKey: "review_lead",
    config,
    runtimeContext: new MixedTeamRunContext({
      coordinatorMemberRouteKey: "review_lead",
      memberContexts: [new MixedAgentMemberContext({
        memberName: "review_lead",
        memberPath: ["review_lead"],
        memberRouteKey: "review_lead",
        memberRunId: "review-lead-run",
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        platformAgentRunId: "platform-review-lead-run",
      })],
      collaborationRootTeamRunId: "parent-1",
      teamMountPath: ["BuildSquad"],
      effectiveHandoffs: [],
      parentBoundary: {
        parentTeamRunId: "parent-1",
        collaborationRootTeamRunId: "parent-1",
        teamMountPath: ["BuildSquad"],
        effectiveHandoffs: [],
        deliverInterAgentMessage: parentDeliverInterAgentMessage,
      },
    }),
  });
  return { parentDeliverInterAgentMessage, manager: new MixedTeamManager(context) };
};

const buildRootCanonicalIntent = (): InterAgentMessageDeliveryIntent => ({
  teamRunId: "parent-1",
  callerAddressing: {
    rootTeamRunId: "parent-1",
    memberAddress: "/BuildSquad/review_lead",
  },
  recipientName: "/program_manager",
  sender: {
    participant: {
      memberKind: "agent",
      memberName: "review_lead",
      memberPath: ["BuildSquad", "review_lead"],
      memberRouteKey: "BuildSquad/review_lead",
      memberRunId: "review-lead-run",
      address: {
        teamRunId: "parent-1",
        memberPath: ["BuildSquad", "review_lead"],
        memberRouteKey: "BuildSquad/review_lead",
      },
    },
    selector: { kind: "path", memberPath: ["BuildSquad", "review_lead"] },
  },
  senderAddress: { segments: [{ kind: "member", memberRouteKey: "BuildSquad/review_lead" }] },
  content: "Build is complete.",
  messageType: "status_update",
});

describe("MixedTeamManager parent-boundary delivery", () => {
  it("forwards one root-canonical intent unchanged with the actual nested Agent identity", async () => {
    const { manager, parentDeliverInterAgentMessage } = createChildManager();
    const intent = buildRootCanonicalIntent();

    await expect(manager.deliverInterAgentMessage(intent)).resolves.toEqual({ accepted: true });
    expect(parentDeliverInterAgentMessage).toHaveBeenCalledTimes(1);
    expect(parentDeliverInterAgentMessage).toHaveBeenCalledWith(intent);
    const forwarded = parentDeliverInterAgentMessage.mock.calls[0]![0] as InterAgentMessageDeliveryIntent;
    expect(forwarded.sender.participant).toMatchObject({
      memberKind: "agent",
      memberName: "review_lead",
      memberPath: ["BuildSquad", "review_lead"],
      memberRouteKey: "BuildSquad/review_lead",
    });
    expect(forwarded.sender.participant).not.toHaveProperty("representedSubTeam");
  });

  it("rejects a non-root team id without invoking the parent boundary", async () => {
    const { manager, parentDeliverInterAgentMessage } = createChildManager();
    const intent = { ...buildRootCanonicalIntent(), teamRunId: "unreachable-run" };

    await expect(manager.deliverInterAgentMessage(intent)).resolves.toEqual({
      accepted: false,
      code: "TARGET_MEMBER_NOT_FOUND",
      message: "Team run 'unreachable-run' is not reachable from this team boundary.",
    });
    expect(parentDeliverInterAgentMessage).not.toHaveBeenCalled();
  });
});

const createParentManagerWithTaskTeamTarget = () => {
  clearTaskTeamActiveRunDirectory();
  let childActive = true;
  const childListeners = new Set<TeamRunEventListener>();
  const childRun = {
    runId: taskTeamInstance.taskTeamRunId,
    isActive: vi.fn(() => childActive),
    getStatusSnapshot: vi.fn(() => ({ status: childActive ? "idle" : "offline" })),
    getMemberStatusSnapshots: vi.fn(() => []),
    getRuntimeContext: vi.fn(() => new MixedTeamRunContext({
      coordinatorMemberRouteKey: "review_lead",
      collaborationRootTeamRunId: "parent-1",
      teamMountPath: [],
      effectiveHandoffs: [],
      memberContexts: [
        new MixedAgentMemberContext({
          memberName: "review_lead",
          memberPath: ["review_lead"],
          memberRouteKey: "review_lead",
          memberRunId: "review-lead-run",
          runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          platformAgentRunId: "platform-review-lead-run",
        }),
      ],
      taskTeamInstance,
    })),
    subscribeToEvents: vi.fn((listener: TeamRunEventListener) => {
      childListeners.add(listener);
      return () => childListeners.delete(listener);
    }),
    postMessage: vi.fn(async () => ({ accepted: true })),
    terminate: vi.fn(async () => {
      childActive = false;
      for (const listener of childListeners) {
        listener({
          eventSourceType: TeamRunEventSourceType.TEAM,
          teamRunId: taskTeamInstance.taskTeamRunId,
          sourcePath: [],
          data: { status: "offline" },
        });
      }
      return { accepted: true };
    }),
  };
  const subTeamRunFactory = {
    createOrRestore: vi.fn(async () => childRun),
  };
  const config = new TeamRunConfig({
    teamDefinitionId: "parent-team",
    teamBackendKind: TeamBackendKind.MIXED,
    coordinatorMemberRouteKey: "program_manager",
    memberTree: [
      {
        memberKind: "agent_team",
        memberName: "BuildSquad",
        memberPath: ["BuildSquad"],
        memberRouteKey: "BuildSquad",
        memberRunId: "build-squad-run",
        teamDefinitionId: "build-squad-team",
        coordinatorMemberRouteKey: "BuildSquad/review_lead",
        childTeamRunId: "build-squad-run",
        memberConfigs: [
          {
            memberKind: "agent",
            memberName: "review_lead",
            memberPath: ["BuildSquad", "review_lead"],
            memberRouteKey: "BuildSquad/review_lead",
            memberRunId: "review-lead-template-run",
            agentDefinitionId: "agent-review-lead",
            llmModelIdentifier: "gpt-test",
            autoExecuteTools: false,
            skillAccessMode: SkillAccessMode.NONE,
            runtimeKind: RuntimeKind.CODEX_APP_SERVER,
          },
        ],
      },
    ],
  });
  const parentContext = new TeamRunContext({
    runId: "parent-1",
    teamBackendKind: TeamBackendKind.MIXED,
    coordinatorMemberRouteKey: "program_manager",
    config,
    runtimeContext: new MixedTeamRunContext({
      coordinatorMemberRouteKey: "program_manager",
      collaborationRootTeamRunId: "parent-1",
      teamMountPath: [],
      effectiveHandoffs: [],
      memberContexts: [
        new MixedSubTeamMemberContext({
          memberName: "BuildSquad",
          memberPath: ["BuildSquad"],
          memberRouteKey: "BuildSquad",
          memberRunId: "build-squad-run",
          teamDefinitionId: "build-squad-team",
          childTeamRunId: "build-squad-run",
        }),
      ],
    }),
  });
  return {
    childRun,
    manager: new MixedTeamManager(parentContext, {
      subTeamRunFactory: subTeamRunFactory as never,
    }),
    subTeamRunFactory,
    taskTeamConfig: config.memberTree[0],
  };
};

describe("MixedTeamManager logical message materialization", () => {
  it("derives its private root selector from the minimal Team ingress address", async () => {
    const { manager } = createParentManagerWithTaskTeamTarget();
    const resolveContext = vi.spyOn((manager as any).persistentMembers, "resolveContext");
    const deliver = vi.spyOn((manager as any).deliveryCoordinator, "deliver")
      .mockResolvedValue({ accepted: true, code: "DELIVERED" });
    const intent: InterAgentMessageDeliveryIntent = {
      ...buildRootCanonicalIntent(),
      callerAddressing: {
        rootTeamRunId: "parent-1",
        memberAddress: "/program_manager",
      },
      recipientName: "/BuildSquad",
    };

    await expect(manager.deliverInterAgentMessage(intent)).resolves.toEqual({
      accepted: true,
      code: "DELIVERED",
    });
    expect(resolveContext).toHaveBeenCalledWith({
      kind: "route_key",
      memberRouteKey: "BuildSquad/review_lead",
    });
    expect(deliver).toHaveBeenCalledWith(
      intent,
      expect.objectContaining({
        endpoint: expect.objectContaining({
          selector: {
            kind: "route_key",
            memberRouteKey: "BuildSquad/review_lead",
          },
          participant: expect.objectContaining({
            memberName: "review_lead",
            memberRouteKey: "BuildSquad/review_lead",
          }),
        }),
      }),
    );
  });
});


describe("MixedTeamManager termination lifecycle", () => {
  it("keeps active task-team handles in snapshots until accepted settlement removes them", async () => {
    const { childRun, manager, subTeamRunFactory, taskTeamConfig } = createParentManagerWithTaskTeamTarget();
    const events: TeamRunEvent[] = [];
    manager.subscribeToEvents((event) => events.push(event));
    const directory = getTaskTeamActiveRunDirectory();

    try {
      await expect(manager.startTaskTeamInstance({
        identity: taskTeamInstance,
        teamConfig: taskTeamConfig as never,
        message: new AgentInputUserMessage("Start task-team work."),
      })).resolves.toEqual({
        accepted: true,
        memberName: "BuildSquad",
        memberRunId: taskTeamInstance.taskTeamRunId,
      });

      expect(subTeamRunFactory.createOrRestore).toHaveBeenCalledWith(expect.objectContaining({
        childTeamRunId: taskTeamInstance.taskTeamRunId,
        taskTeamInstance,
      }));
      expect(childRun.postMessage).toHaveBeenCalledTimes(1);
      expect(directory.resolveActiveRun(taskTeamInstance.taskTeamRunId)?.runId)
        .toBe(taskTeamInstance.taskTeamRunId);
      expect(manager.getMemberStatusSnapshots()).toEqual(expect.arrayContaining([
        expect.objectContaining({
          agent_id: taskTeamInstance.taskTeamRunId,
          agent_name: "BuildSquad",
          member_route_key: "BuildSquad",
          source_path: ["BuildSquad"],
          status: "initializing",
        }),
      ]));

      await expect(manager.settleTaskTeamInstance(
        "BuildSquad",
        taskTeamInstance.taskTeamRunId,
      )).resolves.toEqual({
        accepted: true,
      });

      expect(childRun.terminate).toHaveBeenCalledTimes(1);
      expect(manager.getMemberStatusSnapshots()).not.toEqual(expect.arrayContaining([
        expect.objectContaining({ agent_id: taskTeamInstance.taskTeamRunId }),
      ]));
      expect(directory.resolveKnownEntryByTaskTeamRunId(taskTeamInstance.taskTeamRunId)).toBeNull();
      expect(events).toEqual(expect.arrayContaining([
        expect.objectContaining({
          eventSourceType: "TEAM",
          teamRunId: "parent-1",
          sourcePath: ["BuildSquad"],
          taskTeamInstance,
          data: { status: "offline" },
        }),
      ]));
    } finally {
      clearTaskTeamActiveRunDirectory();
    }
  });

  it("joins repeated termination, rejects new work while terminating, and publishes root offline once", async () => {
    const { manager } = createChildManager();
    const events: unknown[] = [];
    manager.subscribeToEvents((event) => events.push(event));
    let resolveTaskAgents: ((value: { accepted: true }) => void) | null = null;
    const terminateTaskAgents = vi.fn(() => new Promise<{ accepted: true }>((resolve) => {
      resolveTaskAgents = resolve;
    }));
    (manager as any).taskAgentInstances.terminateAll = terminateTaskAgents;

    const firstTerminate = manager.terminate();
    const secondTerminate = manager.terminate();

    expect(manager.hasActiveMembers()).toBe(false);
    expect(terminateTaskAgents).toHaveBeenCalledTimes(1);
    await expect(manager.startTaskAgentInstance({} as never)).resolves.toEqual({
      accepted: false,
      code: "RUN_NOT_FOUND",
      message: "Run 'unknown' is not active.",
    });

    resolveTaskAgents?.({ accepted: true });
    await expect(firstTerminate).resolves.toEqual({ accepted: true });
    await expect(secondTerminate).resolves.toEqual({ accepted: true });
    await expect(manager.terminate()).resolves.toEqual({ accepted: true });

    expect(events).toEqual([
      expect.objectContaining({
        eventSourceType: "TEAM",
        teamRunId: "child-1",
        sourcePath: [],
        data: { status: "offline" },
      }),
    ]);
    expect(manager.hasActiveMembers()).toBe(false);
  });

  it("keeps the team active and does not publish offline when active child termination is rejected", async () => {
    const { manager } = createChildManager();
    const events: unknown[] = [];
    manager.subscribeToEvents((event) => events.push(event));
    (manager as any).taskAgentInstances.terminateAll = vi.fn(async () => ({
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
