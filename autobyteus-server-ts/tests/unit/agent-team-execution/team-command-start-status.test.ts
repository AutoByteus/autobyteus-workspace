import { describe, expect, it, vi } from "vitest";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../../../src/agent-team-execution/domain/team-run-event.js";
import { MemberCommandStatusOverlayStore } from "../../../src/agent-team-execution/services/member-command-status-overlay-store.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

const memberContext = {
  memberName: "Worker",
  memberPath: ["Worker"],
  memberRouteKey: "Worker",
  memberRunId: "member-run-1",
};

const taskAgentInstance = {
  taskAgentInstanceId: "task-agent-instance-1",
  taskAgentRunId: "task-agent-run-1",
  teamRunId: "team-run-1",
  taskId: "task-0001",
  logicalMember: {
    memberName: "Worker",
    memberPath: ["Worker"],
    memberRouteKey: "Worker",
    templateMemberRunId: "member-run-1",
    runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  },
  createdAt: "2026-06-03T00:00:00.000Z",
};

const createStore = () => {
  const events: TeamRunEvent[] = [];
  const store = new MemberCommandStatusOverlayStore({
    getTeamRunId: () => "team-run-1",
    publishEvent: (event) => events.push(event),
  });
  return { store, events };
};

const statusReplacementEvent = (input: {
  memberRunId?: string;
  memberRouteKey?: string;
  taskAgentRunId?: string;
} = {}): TeamRunEvent => {
  const memberRunId = input.memberRunId ?? "member-run-1";
  const memberRouteKey = input.memberRouteKey ?? "Worker";
  return {
    eventSourceType: TeamRunEventSourceType.AGENT,
    teamRunId: "team-run-1",
    sourcePath: [memberRouteKey],
    data: {
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      memberName: memberRouteKey,
      memberRunId,
      memberPath: [memberRouteKey],
      memberRouteKey,
      agentEvent: {
        eventType: AgentRunEventType.AGENT_STATUS,
        runId: memberRunId,
        payload: {
          status: "running",
          member_route_key: memberRouteKey,
          ...(input.taskAgentRunId ? { task_agent_run_id: input.taskAgentRunId } : {}),
        },
        statusHint: "ACTIVE",
      },
      ...(input.taskAgentRunId ? { taskAgentInstance } : {}),
    },
  };
};

describe("MemberCommandStatusOverlayStore", () => {
  it("publishes initializing only for an offline or idle leaf and retains exact identity", () => {
    const { store, events } = createStore();

    expect(store.publishMemberCommandStatus({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      memberContext,
      status: "initializing",
      currentStatus: () => "running",
    })).toBe(false);
    expect(events).toEqual([]);

    expect(store.publishMemberCommandStatus({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      memberContext,
      status: "initializing",
      currentStatus: () => "offline",
    })).toBe(true);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      eventSourceType: TeamRunEventSourceType.AGENT,
      teamRunId: "team-run-1",
      sourcePath: ["Worker"],
      data: {
        memberRunId: "member-run-1",
        memberRouteKey: "Worker",
        agentEvent: {
          eventType: AgentRunEventType.AGENT_STATUS,
          runId: "member-run-1",
          payload: {
            status: "initializing",
            agent_id: "member-run-1",
            agent_name: "Worker",
            member_route_key: "Worker",
            member_path: ["Worker"],
            source_route_key: "Worker",
            source_path: ["Worker"],
          },
        },
      },
    });
  });

  it("replaces an overlay only when the matching canonical leaf status arrives", () => {
    const { store } = createStore();
    store.publishMemberCommandStatus({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      memberContext,
      status: "error",
      errorMessage: "failed",
      currentStatus: () => "offline",
    });

    expect(store.recordReplacementEvents([
      statusReplacementEvent({ memberRunId: "other-run", memberRouteKey: "Other" }),
    ])).toBe(false);
    expect(store.getMemberStatusSnapshot({
      memberContext,
      fallback: () => ({ status: "offline" }),
    })).toMatchObject({ status: "error", agent_id: "member-run-1" });

    expect(store.recordReplacementEvents([statusReplacementEvent()])).toBe(true);
    expect(store.getMemberStatusSnapshot({
      memberContext,
      fallback: () => ({ status: "running" }),
    })).toEqual({ status: "running" });
  });

  it("keeps task-agent overlays isolated by concrete task-agent run identity", () => {
    const { store, events } = createStore();
    const taskMemberContext = {
      ...memberContext,
      memberRunId: taskAgentInstance.taskAgentRunId,
    };

    expect(store.publishMemberCommandStatus({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      memberContext: taskMemberContext,
      taskAgentInstance,
      status: "initializing",
      currentStatus: () => "offline",
    })).toBe(true);
    expect(events[0]).toMatchObject({
      data: {
        taskAgentInstance: {
          taskAgentRunId: "task-agent-run-1",
          taskId: "task-0001",
        },
        agentEvent: {
          payload: {
            agent_id: "task-agent-run-1",
            task_agent_run_id: "task-agent-run-1",
            task_agent_instance_id: "task-agent-instance-1",
            task_id: "task-0001",
          },
        },
      },
    });
    expect(store.getMemberStatusSnapshot({
      memberContext,
      fallback: () => ({ status: "offline" }),
    })).toEqual({ status: "offline" });
    expect(store.getMemberStatusSnapshot({
      memberContext: taskMemberContext,
      taskAgentInstance,
      fallback: () => ({ status: "offline" }),
    })).toMatchObject({ status: "initializing", task_agent_run_id: "task-agent-run-1" });

    expect(store.recordReplacementEvents([
      statusReplacementEvent({
        memberRunId: "task-agent-run-1",
        taskAgentRunId: "task-agent-run-1",
      }),
    ])).toBe(true);
  });

  it("applies overlays only to matching leaf snapshots and clears them on dispose", () => {
    const { store } = createStore();
    store.publishMemberCommandStatus({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      memberContext,
      status: "initializing",
      currentStatus: () => "idle",
    });

    expect(store.applyMemberStatusOverlays([
      { status: "idle", agent_id: "member-run-1", member_route_key: "Worker" },
      { status: "running", agent_id: "other-run", member_route_key: "Other" },
    ])).toEqual([
      expect.objectContaining({ status: "initializing", agent_id: "member-run-1" }),
      expect.objectContaining({ status: "running", agent_id: "other-run" }),
    ]);

    store.clear();
    expect(store.applyMemberStatusOverlays([
      { status: "idle", agent_id: "member-run-1", member_route_key: "Worker" },
    ])).toEqual([
      expect.objectContaining({ status: "idle", agent_id: "member-run-1" }),
    ]);
  });
});
