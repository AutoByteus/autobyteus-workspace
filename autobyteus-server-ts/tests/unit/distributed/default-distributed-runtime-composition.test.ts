import { describe, expect, it, vi } from "vitest";
import {
  AgentInputUserMessage,
  AgentEventRebroadcastPayload,
  AgentTeamStatusUpdateData,
  AgentTeamStreamEvent,
  StreamEvent,
  StreamEventType,
  SubTeamEventRebroadcastPayload,
} from "autobyteus-ts";
import { projectRemoteExecutionEventsFromTeamEvent } from "../../../src/distributed/bootstrap/default-distributed-runtime-composition.js";
import {
  dispatchInterAgentMessageViaTeamManager,
  dispatchWithWorkerLocalRoutingPort,
  ensureNodeDirectoryEntryForHostUplink,
  normalizeDistributedBaseUrl,
  resolveBoundRuntimeTeamFromRegistries,
} from "../../../src/distributed/bootstrap/default-distributed-runtime-composition.js";
import { TeamRunNotBoundError } from "../../../src/distributed/runtime-binding/run-scoped-team-binding-registry.js";
import { TeamCommandIngressError } from "../../../src/distributed/ingress/team-command-ingress-service.js";
import { NodeDirectoryService } from "../../../src/distributed/node-directory/node-directory-service.js";

describe("default distributed runtime composition event projection", () => {
  it("projects top-level agent events into remote execution event payloads", () => {
    const projected = projectRemoteExecutionEventsFromTeamEvent({
      teamEvent: new AgentTeamStreamEvent({
        team_id: "team-1",
        event_source_type: "AGENT",
        data: new AgentEventRebroadcastPayload({
          agent_name: "worker-a",
          agent_event: new StreamEvent({
            event_id: "evt-1",
            event_type: StreamEventType.ASSISTANT_COMPLETE_RESPONSE,
            agent_id: "agent-1",
            data: { content: "hello" },
          }),
        }),
      }),
    });

    expect(projected).toHaveLength(1);
    expect(projected[0]).toMatchObject({
      memberName: "worker-a",
      agentId: "agent-1",
      eventType: "assistant_complete_response",
    });
    expect(projected[0]?.sourceEventId).toContain(":worker-a:assistant_complete_response");
    expect(projected[0]?.payload).toMatchObject({
      content: "hello",
      agent_name: "worker-a",
      member_route_key: "worker-a",
      event_scope: "member_scoped",
    });
  });

  it("normalizes internal segment payload fields into canonical distributed payload contract", () => {
    const projected = projectRemoteExecutionEventsFromTeamEvent({
      teamEvent: new AgentTeamStreamEvent({
        team_id: "team-1",
        event_source_type: "AGENT",
        data: new AgentEventRebroadcastPayload({
          agent_name: "worker-a",
          agent_event: new StreamEvent({
            event_id: "evt-seg-1",
            event_type: StreamEventType.SEGMENT_EVENT,
            agent_id: "agent-1",
            data: {
              event_type: "SEGMENT_CONTENT",
              segment_id: "seg-1",
              payload: { delta: "hello" },
            },
          }),
        }),
      }),
    });

    expect(projected).toHaveLength(1);
    expect(projected[0]).toMatchObject({
      memberName: "worker-a",
      agentId: "agent-1",
      eventType: "segment_event",
    });
    expect(projected[0]?.payload).toMatchObject({
      event_type: "SEGMENT_CONTENT",
      id: "seg-1",
      delta: "hello",
      agent_name: "worker-a",
      member_route_key: "worker-a",
      event_scope: "member_scoped",
    });
    expect(projected[0]?.payload).not.toHaveProperty("segment_id");
    expect(projected[0]?.payload).not.toHaveProperty("payload");
  });

  it("projects nested sub-team agent events with hierarchical route key", () => {
    const nestedEvent = new AgentTeamStreamEvent({
      team_id: "team-1",
      event_source_type: "SUB_TEAM",
      data: new SubTeamEventRebroadcastPayload({
        sub_team_node_name: "sub-team",
        sub_team_event: new AgentTeamStreamEvent({
          team_id: "sub-team-runtime",
          event_source_type: "AGENT",
          data: new AgentEventRebroadcastPayload({
            agent_name: "worker-b",
            agent_event: new StreamEvent({
              event_id: "evt-2",
              event_type: StreamEventType.ARTIFACT_UPDATED,
              agent_id: "agent-2",
              data: {
                artifact_id: "art-1",
                path: "/tmp/a.txt",
                type: "file",
                agent_id: "agent-2",
              },
            }),
          }),
        }),
      }),
    });

    const projected = projectRemoteExecutionEventsFromTeamEvent({ teamEvent: nestedEvent });
    expect(projected).toHaveLength(1);
    expect(projected[0]).toMatchObject({
      memberName: "sub-team/worker-b",
      eventType: "artifact_updated",
      agentId: "agent-2",
    });
    expect(projected[0]?.payload).toMatchObject({
      agent_name: "worker-b",
      member_route_key: "sub-team/worker-b",
      event_scope: "member_scoped",
    });
  });

  it("ignores non-member-scoped team stream events", () => {
    const projected = projectRemoteExecutionEventsFromTeamEvent({
      teamEvent: new AgentTeamStreamEvent({
        team_id: "team-1",
        event_source_type: "TEAM",
        data: new AgentTeamStatusUpdateData({
          new_status: "ready",
        }),
      }),
    });

    expect(projected).toEqual([]);
  });
});

describe("default distributed runtime composition worker-local ingress helpers", () => {
  it("normalizes distributed base URLs and strips trailing /rest", () => {
    expect(normalizeDistributedBaseUrl("http://host.docker.internal:8000/rest/")).toBe(
      "http://host.docker.internal:8000",
    );
    expect(normalizeDistributedBaseUrl("http://localhost:8000")).toBe("http://localhost:8000");
    expect(normalizeDistributedBaseUrl("not-a-url")).toBeNull();
  });

  it("ensures missing host uplink node entry from registry URL fallback", () => {
    const nodeDirectoryService = new NodeDirectoryService([
      {
        nodeId: "node-worker-8001",
        baseUrl: "http://localhost:8001",
        isHealthy: true,
        supportsAgentExecution: true,
      },
    ]);

    const ensured = ensureNodeDirectoryEntryForHostUplink({
      localNodeId: "node-worker-8001",
      targetHostNodeId: "node-host-8000",
      nodeDirectoryService,
      distributedUplinkBaseUrl: null,
      discoveryRegistryUrl: "http://host.docker.internal:8000/rest/",
    });

    expect(ensured).toBe(true);
    expect(nodeDirectoryService.getRequiredEntry("node-host-8000")).toMatchObject({
      baseUrl: "http://host.docker.internal:8000",
      isHealthy: true,
      supportsAgentExecution: true,
    });
  });

  it("returns false when host uplink entry cannot be ensured", () => {
    const nodeDirectoryService = new NodeDirectoryService([
      {
        nodeId: "node-worker-8001",
        baseUrl: "http://localhost:8001",
        isHealthy: true,
        supportsAgentExecution: true,
      },
    ]);

    const ensured = ensureNodeDirectoryEntryForHostUplink({
      localNodeId: "node-worker-8001",
      targetHostNodeId: "node-host-8000",
      nodeDirectoryService,
      distributedUplinkBaseUrl: "",
      discoveryRegistryUrl: "",
    });

    expect(ensured).toBe(false);
    expect(nodeDirectoryService.getEntry("node-host-8000")).toBeNull();
  });

  it("rewrites loopback host entry to reachable fallback when uplinking from worker", () => {
    const nodeDirectoryService = new NodeDirectoryService([
      {
        nodeId: "node-worker-8001",
        baseUrl: "http://localhost:8001",
        isHealthy: true,
        supportsAgentExecution: true,
      },
      {
        nodeId: "node-host-8000",
        baseUrl: "http://localhost:8000",
        isHealthy: true,
        supportsAgentExecution: true,
      },
    ]);

    const ensured = ensureNodeDirectoryEntryForHostUplink({
      localNodeId: "node-worker-8001",
      targetHostNodeId: "node-host-8000",
      nodeDirectoryService,
      distributedUplinkBaseUrl: "http://host.docker.internal:8000",
      discoveryRegistryUrl: null,
    });

    expect(ensured).toBe(true);
    expect(nodeDirectoryService.getRequiredEntry("node-host-8000")).toMatchObject({
      baseUrl: "http://host.docker.internal:8000",
    });
  });

  it("dispatches through worker-local routing adapter for worker-managed runs", async () => {
    const ensureNodeIsReady = vi.fn(async () => ({
      postMessage: vi.fn(async () => undefined),
    }));
    const team = {
      runtime: {
        context: {
          teamManager: {
            ensureNodeIsReady,
          },
        },
      },
    } as any;

    const userMessage = new AgentInputUserMessage("hello");
    const dispatch = vi.fn(async (localRoutingPort: any) =>
      localRoutingPort.dispatchUserMessage({
        targetAgentName: "student",
        userMessage,
      }),
    );

    const handled = await dispatchWithWorkerLocalRoutingPort({
      teamRunId: "run-worker-1",
      workerManagedRunIds: new Set(["run-worker-1"]),
      team,
      dispatch,
    });

    expect(handled).toBe(true);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(ensureNodeIsReady).toHaveBeenCalledWith("student");
  });

  it("returns false without dispatch for non-worker-managed runs", async () => {
    const dispatch = vi.fn(async () => ({ accepted: true }));
    const handled = await dispatchWithWorkerLocalRoutingPort({
      teamRunId: "run-host-1",
      workerManagedRunIds: new Set(),
      team: {} as any,
      dispatch,
    });

    expect(handled).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("dispatches inter-agent message via bound team manager context", async () => {
    const dispatchInterAgentMessage = vi.fn(async function (
      this: { teamRoutingPort?: { mode: string } },
      event: { recipientName: string; content: string },
    ) {
      if (!this.teamRoutingPort) {
        throw new Error("missing teamRoutingPort");
      }
      expect(this.teamRoutingPort.mode).toBe("host-routing");
      expect(event.recipientName).toBe("professor");
      expect(event.content).toBe("hello back");
    });

    const handled = await dispatchInterAgentMessageViaTeamManager({
      team: {
        runtime: {
          context: {
            teamManager: {
              teamRoutingPort: { mode: "host-routing" },
              dispatchInterAgentMessage,
            },
          },
        },
      } as any,
      event: {
        senderAgentId: "member-student",
        recipientName: "professor",
        content: "hello back",
        messageType: "direct_message",
      } as any,
    });

    expect(handled).toBe(true);
    expect(dispatchInterAgentMessage).toHaveBeenCalledTimes(1);
  });

  it("returns false when team manager dispatch is unavailable", async () => {
    const handled = await dispatchInterAgentMessageViaTeamManager({
      team: { runtime: { context: { teamManager: {} } } } as any,
      event: {
        senderAgentId: "member-student",
        recipientName: "professor",
        content: "hello back",
        messageType: "direct_message",
      } as any,
    });
    expect(handled).toBe(false);
  });

  it("falls back to host run-scoped resolver when run-scoped binding is missing", () => {
    const hostTeam = { teamId: "team-host-runtime" } as any;
    const resolved = resolveBoundRuntimeTeamFromRegistries({
      teamRunId: "run-1",
      runScopedTeamBindingRegistry: {
        resolveRun: () => {
          throw new TeamRunNotBoundError("run-1");
        },
      },
      teamRunOrchestrator: {
        getRunRecord: () =>
          ({
            teamRunId: "run-1",
            teamDefinitionId: "def-1",
            status: "running",
          }) as any,
      },
      resolveTeamById: () => {
        throw new Error("resolveTeamById should not be called in host fallback path.");
      },
      resolveTeamByRunId: (teamRunId: string) => {
        expect(teamRunId).toBe("run-1");
        return hostTeam;
      },
    });

    expect(resolved.team).toBe(hostTeam);
    expect(resolved.teamDefinitionId).toBe("def-1");
  });

  it("uses run-scoped binding when present", () => {
    const workerTeam = { teamId: "team-worker-runtime" } as any;
    const resolved = resolveBoundRuntimeTeamFromRegistries({
      teamRunId: "run-2",
      runScopedTeamBindingRegistry: {
        resolveRun: () =>
          ({
            teamRunId: "run-2",
            teamDefinitionId: "def-2",
            runtimeTeamId: "runtime-worker-2",
          }) as any,
      },
      teamRunOrchestrator: {
        getRunRecord: () => null,
      },
      resolveTeamById: (teamId: string) => {
        expect(teamId).toBe("runtime-worker-2");
        return workerTeam;
      },
      resolveTeamByRunId: () => {
        throw new Error("resolveTeamByRunId should not be called when binding exists.");
      },
    });

    expect(resolved.team).toBe(workerTeam);
    expect(resolved.teamDefinitionId).toBe("def-2");
  });

  it("throws TEAM_RUN_NOT_BOUND when neither binding nor active host run exists", () => {
    expect(() =>
      resolveBoundRuntimeTeamFromRegistries({
        teamRunId: "run-3",
        runScopedTeamBindingRegistry: {
          resolveRun: () => {
            throw new TeamRunNotBoundError("run-3");
          },
        },
        teamRunOrchestrator: {
          getRunRecord: () => null,
        },
        resolveTeamById: () => ({}) as any,
        resolveTeamByRunId: () => ({}) as any,
      }),
    ).toThrowError(TeamCommandIngressError);

    try {
      resolveBoundRuntimeTeamFromRegistries({
        teamRunId: "run-3",
        runScopedTeamBindingRegistry: {
          resolveRun: () => {
            throw new TeamRunNotBoundError("run-3");
          },
        },
        teamRunOrchestrator: {
          getRunRecord: () => null,
        },
        resolveTeamById: () => ({}) as any,
        resolveTeamByRunId: () => ({}) as any,
      });
    } catch (error) {
      const typed = error as TeamCommandIngressError;
      expect(typed.code).toBe("TEAM_RUN_NOT_BOUND");
    }
  });
});
