import { describe, expect, it } from "vitest";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import { AutoByteusTeamMemberStatusProjector } from "../../../src/agent-team-execution/backends/autobyteus/autobyteus-team-member-status-projector.js";
import { AutoByteusTeamMemberContext, AutoByteusTeamRunContext } from "../../../src/agent-team-execution/backends/autobyteus/autobyteus-team-run-context.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../../../src/agent-team-execution/domain/team-run-event.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

const createRuntimeContext = () => {
  const memberContext = new AutoByteusTeamMemberContext({
    memberName: "Worker",
    memberPath: ["Worker"],
    memberRouteKey: "Worker",
    memberRunId: "member-run-1",
    nativeAgentId: null,
  });
  return {
    memberContext,
    runtimeContext: new AutoByteusTeamRunContext({
      coordinatorMemberRouteKey: "Worker",
      memberContexts: [memberContext],
    }),
  };
};

describe("AutoByteusTeamMemberStatusProjector", () => {
  it("uses configured member run id as outward status id and backfills native identity", () => {
    const { runtimeContext, memberContext } = createRuntimeContext();
    const projector = new AutoByteusTeamMemberStatusProjector({
      teamId: "team-run-1",
      context: {
        agents: [{
          agentId: "native-member-1",
          currentStatus: "running",
          context: { state: { activeTurn: {} }, config: { name: "Worker" } },
        }],
      },
    }, {
      memberRunIdsByName: new Map([["Worker", "member-run-1"]]),
      runtimeContext,
      isActive: () => true,
    });

    const snapshot = projector.projectMemberStatusSnapshot({
      memberRunId: "member-run-1",
      memberName: "Worker",
      knownRuntimeMemberContext: memberContext,
    });

    expect(snapshot).toMatchObject({
      status: "running",
      can_interrupt: true,
      agent_id: "member-run-1",
      agent_name: "Worker",
      member_route_key: "Worker",
      member_path: ["Worker"],
    });
    expect(snapshot.agent_id).not.toBe("native-member-1");
    expect(memberContext.nativeAgentId).toBe("native-member-1");
  });

  it("resolves native event identity by native id, member name, route key, path, and configured run id", () => {
    const { runtimeContext, memberContext } = createRuntimeContext();
    memberContext.nativeAgentId = "native-member-1";
    const projector = new AutoByteusTeamMemberStatusProjector({
      teamId: "team-run-1",
      context: { agents: [] },
    }, {
      memberRunIdsByName: new Map([["Worker", "member-run-1"]]),
      runtimeContext,
      isActive: () => true,
    });

    const identity = projector.resolveAgentEventMember({
      memberName: "Worker",
      fallbackMemberRunId: "team-run-1",
      agentEvent: { agent_id: "native-member-1" },
    });

    expect(identity).toMatchObject({
      memberName: "Worker",
      memberRunId: "member-run-1",
      memberRouteKey: "Worker",
      memberPath: ["Worker"],
      nativeAgentId: "native-member-1",
    });
    expect(projector.resolveMemberContextByIdentity("Worker")).toBe(memberContext);
    expect(projector.resolveMemberContextByIdentity("member-run-1")).toBe(memberContext);
    expect(projector.resolveMemberContextByIdentity("native-member-1")).toBe(memberContext);
    expect(projector.resolveMemberContextByIdentity("missing")).toBeNull();
  });

  it("applies observed status cache without exposing duplicate native and configured snapshot ids", () => {
    const { runtimeContext } = createRuntimeContext();
    const projector = new AutoByteusTeamMemberStatusProjector({
      teamId: "team-run-1",
      context: {
        agents: [{
          agentId: "native-member-1",
          currentStatus: "offline",
          context: { config: { name: "Worker" } },
        }],
      },
    }, {
      memberRunIdsByName: new Map([["Worker", "member-run-1"]]),
      runtimeContext,
      isActive: () => true,
    });

    projector.recordStatusEvents([{
      eventSourceType: TeamRunEventSourceType.AGENT,
      teamRunId: "team-run-1",
      sourcePath: ["Worker"],
      data: {
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        memberName: "Worker",
        memberRunId: "member-run-1",
        memberPath: ["Worker"],
        memberRouteKey: "Worker",
        agentEvent: {
          eventType: AgentRunEventType.AGENT_STATUS,
          runId: "member-run-1",
          payload: { status: "running", can_interrupt: false, agent_id: "member-run-1" },
          statusHint: "ACTIVE",
        },
      },
    } satisfies TeamRunEvent]);

    const snapshots = projector.projectMemberStatusSnapshots();
    expect(snapshots).toEqual([
      expect.objectContaining({ agent_id: "member-run-1", status: "running", member_route_key: "Worker" }),
    ]);
    expect(snapshots).not.toContainEqual(expect.objectContaining({ agent_id: "native-member-1" }));
  });

  it("returns observed live status for a known member when the native snapshot is missing", () => {
    const { runtimeContext, memberContext } = createRuntimeContext();
    const projector = new AutoByteusTeamMemberStatusProjector({
      teamId: "team-run-1",
      context: { agents: [] },
    }, {
      memberRunIdsByName: new Map([["Worker", "member-run-1"]]),
      runtimeContext,
      isActive: () => true,
    });

    projector.recordStatusEvents([{
      eventSourceType: TeamRunEventSourceType.AGENT,
      teamRunId: "team-run-1",
      sourcePath: ["Worker"],
      data: {
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        memberName: "Worker",
        memberRunId: "member-run-1",
        memberPath: ["Worker"],
        memberRouteKey: "Worker",
        agentEvent: {
          eventType: AgentRunEventType.AGENT_STATUS,
          runId: "member-run-1",
          payload: { status: "idle", can_interrupt: false, agent_id: "member-run-1" },
          statusHint: "IDLE",
        },
      },
    } satisfies TeamRunEvent]);

    expect(projector.projectMemberStatusSnapshot({
      memberRunId: "member-run-1",
      memberName: "Worker",
      knownRuntimeMemberContext: memberContext,
    })).toMatchObject({
      status: "idle",
      can_interrupt: false,
      agent_id: "member-run-1",
      agent_name: "Worker",
      member_route_key: "Worker",
      member_path: ["Worker"],
    });
  });

  it("does not keep observed live status when the backend is inactive", () => {
    const { runtimeContext, memberContext } = createRuntimeContext();
    const projector = new AutoByteusTeamMemberStatusProjector({
      teamId: "team-run-1",
      context: { agents: [] },
    }, {
      memberRunIdsByName: new Map([["Worker", "member-run-1"]]),
      runtimeContext,
      isActive: () => false,
    });

    projector.recordStatusEvents([{
      eventSourceType: TeamRunEventSourceType.AGENT,
      teamRunId: "team-run-1",
      sourcePath: ["Worker"],
      data: {
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        memberName: "Worker",
        memberRunId: "member-run-1",
        memberPath: ["Worker"],
        memberRouteKey: "Worker",
        agentEvent: {
          eventType: AgentRunEventType.AGENT_STATUS,
          runId: "member-run-1",
          payload: { status: "running", can_interrupt: true, agent_id: "member-run-1" },
          statusHint: "ACTIVE",
        },
      },
    } satisfies TeamRunEvent]);

    expect(projector.projectMemberStatusSnapshot({
      memberRunId: "member-run-1",
      memberName: "Worker",
      knownRuntimeMemberContext: memberContext,
    })).toMatchObject({
      status: "offline",
      can_interrupt: false,
      agent_id: "member-run-1",
      agent_name: "Worker",
    });
  });

  it("does not apply observed live status overlays to inactive snapshot lists", () => {
    const { runtimeContext } = createRuntimeContext();
    const projector = new AutoByteusTeamMemberStatusProjector({
      teamId: "team-run-1",
      context: { agents: [] },
    }, {
      memberRunIdsByName: new Map([["Worker", "member-run-1"]]),
      runtimeContext,
      isActive: () => false,
    });

    projector.recordStatusEvents([{
      eventSourceType: TeamRunEventSourceType.AGENT,
      teamRunId: "team-run-1",
      sourcePath: ["Worker"],
      data: {
        runtimeKind: RuntimeKind.AUTOBYTEUS,
        memberName: "Worker",
        memberRunId: "member-run-1",
        memberPath: ["Worker"],
        memberRouteKey: "Worker",
        agentEvent: {
          eventType: AgentRunEventType.AGENT_STATUS,
          runId: "member-run-1",
          payload: { status: "running", can_interrupt: true, agent_id: "member-run-1" },
          statusHint: "ACTIVE",
        },
      },
    } satisfies TeamRunEvent]);

    expect(projector.projectMemberStatusSnapshots()).toEqual([
      expect.objectContaining({
        status: "offline",
        can_interrupt: false,
        agent_id: "member-run-1",
        agent_name: "Worker",
        member_route_key: "Worker",
        member_path: ["Worker"],
      }),
    ]);
  });
});
