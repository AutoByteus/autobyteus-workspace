import { describe, expect, it } from "vitest";
import { createTeamAgentExecutionBinding } from "../../../src/agent-team-execution/domain/team-agent-execution-binding.js";
import {
  createTeamAgentStatusDetails,
  createTeamAgentStatusSnapshot,
} from "../../../src/agent-team-execution/domain/team-agent-status.js";
import type { TeamRunEvent } from "../../../src/agent-team-execution/domain/team-run-event.js";
import { MemberCommandStatusOverlayStore } from "../../../src/agent-team-execution/services/member-command-status-overlay-store.js";

const persistentBinding = createTeamAgentExecutionBinding({
  rootTeamRunId: "team-run-1",
  memberAddress: "/Worker",
  agentRunId: "member-run-1",
});
const taskBinding = createTeamAgentExecutionBinding({
  rootTeamRunId: "team-run-1",
  memberAddress: "/Worker",
  agentRunId: "task-agent-run-1",
});

const createStore = () => {
  const events: TeamRunEvent[] = [];
  return {
    events,
    store: new MemberCommandStatusOverlayStore({ publishEvent: (event) => events.push(event) }),
  };
};

const snapshot = (
  binding = persistentBinding,
  status: "offline" | "idle" | "running" = "running",
) => createTeamAgentStatusSnapshot({
  execution: binding,
  details: createTeamAgentStatusDetails({ status }),
});

describe("MemberCommandStatusOverlayStore", () => {
  it("publishes initializing only for an offline or idle exact execution", () => {
    const { store, events } = createStore();
    expect(store.publishMemberCommandStatus({
      binding: persistentBinding,
      status: "initializing",
      currentStatus: () => "running",
    })).toBe(false);
    expect(events).toEqual([]);

    expect(store.publishMemberCommandStatus({
      binding: persistentBinding,
      status: "initializing",
      currentStatus: () => "offline",
    })).toBe(true);
    expect(events).toEqual([expect.objectContaining({
      eventSourceType: "AGENT",
      execution: persistentBinding,
      payload: expect.objectContaining({
        eventType: "AGENT_STATUS",
        details: expect.objectContaining({ status: "initializing" }),
      }),
    })]);
  });

  it("isolates repeated executions at one logical address by AgentRun ID", () => {
    const { store } = createStore();
    store.publishMemberCommandStatus({
      binding: taskBinding,
      status: "initializing",
      currentStatus: () => "offline",
    });

    expect(store.getMemberStatusSnapshot({
      binding: persistentBinding,
      fallback: () => ({ status: "offline" }),
    }).details.status).toBe("offline");
    expect(store.getMemberStatusSnapshot({
      binding: taskBinding,
      fallback: () => ({ status: "offline" }),
    }).details.status).toBe("initializing");

    expect(store.clearAcceptedLiveStatus(persistentBinding)).toBe(false);
    expect(store.clearAcceptedLiveStatus(taskBinding)).toBe(true);
  });

  it("applies overlays only to matching snapshots and clears atomically", () => {
    const { store } = createStore();
    store.publishMemberCommandStatus({
      binding: persistentBinding,
      status: "error",
      errorMessage: "failed",
      currentStatus: () => "idle",
    });

    expect(store.applyMemberStatusOverlays([snapshot(), snapshot(taskBinding)]).map((row) => ({
      run: row.execution.agentRunId,
      status: row.details.status,
    }))).toEqual([
      { run: "member-run-1", status: "error" },
      { run: "task-agent-run-1", status: "running" },
    ]);

    store.clear();
    expect(store.applyMemberStatusOverlays([snapshot(persistentBinding, "idle")])[0]?.details.status).toBe("idle");
  });
});
