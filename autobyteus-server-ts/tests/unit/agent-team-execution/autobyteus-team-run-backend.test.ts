import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import { AutoByteusTeamRunBackend } from "../../../src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend.js";
import {
  TeamRunEventSourceType,
  type TeamRunEvent,
} from "../../../src/agent-team-execution/domain/team-run-event.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { AutoByteusTeamMemberContext, AutoByteusTeamRunContext } from "../../../src/agent-team-execution/backends/autobyteus/autobyteus-team-run-context.js";
import type { InterAgentMessageDeliveryRequest } from "../../../src/agent-team-execution/domain/inter-agent-message-delivery.js";


const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const createRuntimeContext = () => new AutoByteusTeamRunContext({
  coordinatorMemberRouteKey: "Worker",
  memberContexts: [new AutoByteusTeamMemberContext({
    memberName: "Worker",
    memberPath: ["Worker"],
    memberRouteKey: "Worker",
    memberRunId: "member-run-1",
    nativeAgentId: "native-member-run-1",
  })],
});

const createDelayedBackend = (postMessage: ReturnType<typeof vi.fn>) => new AutoByteusTeamRunBackend({
  teamId: "team-1",
  currentStatus: "idle",
  postMessage,
  context: { agents: [{ agentId: "native-member-run-1", currentStatus: "offline", context: { config: { name: "Worker" } } }] },
} as any, {
  isActive: () => true,
  removeTeamRun: vi.fn(),
  memberRunIdsByName: new Map([["Worker", "member-run-1"]]),
  runtimeContext: createRuntimeContext(),
});

const createInterAgentRequest = (): InterAgentMessageDeliveryRequest => ({
  teamRunId: "team-1",
  sender: {
    participant: {
      memberKind: "agent", memberName: "Sender", memberPath: ["Sender"], memberRouteKey: "Sender", memberRunId: "sender-run-1",
      address: { teamRunId: "team-1", memberPath: ["Sender"], memberRouteKey: "Sender" },
    },
    selector: { kind: "path", memberPath: ["Sender"] },
  },
  recipient: {
    participant: {
      memberKind: "agent", memberName: "Worker", memberPath: ["Worker"], memberRouteKey: "Worker", memberRunId: "member-run-1",
      address: { teamRunId: "team-1", memberPath: ["Worker"], memberRouteKey: "Worker" },
    },
    selector: { kind: "route_key", memberRouteKey: "Worker" },
  },
  content: "Please continue.",
  messageType: "agent_message",
});

const buildAgentEvent = (
  agentEvent: AgentRunEvent,
): TeamRunEvent => ({
  eventSourceType: TeamRunEventSourceType.AGENT,
  teamRunId: "team-1",
  data: {
    runtimeKind: RuntimeKind.AUTOBYTEUS,
    memberName: "Worker",
    memberRunId: "member-run-1",
    memberPath: ["Worker"],
    memberRouteKey: "Worker",
    agentEvent,
  },
  sourcePath: ["Worker"],
});

describe("AutoByteusTeamRunBackend", () => {
  it("uses same-batch member recovery status when publishing aggregate team status", () => {
    const backend = new AutoByteusTeamRunBackend({
      teamId: "team-1",
      currentStatus: "error",
      context: {
        agents: [{
          agentId: "native-member-run-1",
          currentStatus: "error",
          context: {
            config: {
              name: "Worker",
            },
          },
        }],
      },
    } as any, {
      isActive: () => true,
      removeTeamRun: vi.fn(),
    });
    const publishedEvents: TeamRunEvent[] = [];
    (backend as any).listeners.add((event: TeamRunEvent) => {
      publishedEvents.push(event);
    });

    (backend as any).fanOutProcessedEvents([
      buildAgentEvent({
        eventType: AgentRunEventType.SEGMENT_START,
        runId: "member-run-1",
        payload: {
          id: "segment-1",
          turn_id: "turn-1",
          segment_type: "text",
        },
        statusHint: null,
      }),
      buildAgentEvent({
        eventType: AgentRunEventType.AGENT_STATUS,
        runId: "member-run-1",
        payload: {
          status: "running",
          can_interrupt: false,
          agent_id: "member-run-1",
          agent_name: "Worker",
        },
        statusHint: "ACTIVE",
      }),
    ]);

    expect(publishedEvents.map((event) => event.eventSourceType)).toEqual([
      TeamRunEventSourceType.AGENT,
      TeamRunEventSourceType.AGENT,
      TeamRunEventSourceType.TEAM,
    ]);
    expect(publishedEvents[1]).toMatchObject({
      eventSourceType: TeamRunEventSourceType.AGENT,
      data: {
        agentEvent: {
          eventType: AgentRunEventType.AGENT_STATUS,
          payload: {
            status: "running",
          },
        },
      },
    });
    expect(publishedEvents[2]).toMatchObject({
      eventSourceType: TeamRunEventSourceType.TEAM,
      data: {
        status: "running",
      },
    });
  });

  it("keeps aggregate team status running during active member events until member completion", () => {
    const backend = new AutoByteusTeamRunBackend({
      teamId: "team-1",
      currentStatus: "idle",
      context: {
        agents: [{
          agentId: "native-member-run-1",
          currentStatus: "idle",
          context: {
            config: {
              name: "Worker",
            },
          },
        }],
      },
    } as any, {
      isActive: () => true,
      removeTeamRun: vi.fn(),
    });
    const publishedEvents: TeamRunEvent[] = [];
    (backend as any).listeners.add((event: TeamRunEvent) => {
      publishedEvents.push(event);
    });

    (backend as any).fanOutProcessedEvents([
      buildAgentEvent({
        eventType: AgentRunEventType.AGENT_STATUS,
        runId: "member-run-1",
        payload: {
          status: "running",
          can_interrupt: false,
          agent_id: "member-run-1",
          agent_name: "Worker",
        },
        statusHint: "ACTIVE",
      }),
    ]);
    expect((publishedEvents.at(-1)?.data as any).status).toBe("running");

    publishedEvents.length = 0;
    (backend as any).fanOutProcessedEvents([{
      eventSourceType: TeamRunEventSourceType.TEAM,
      teamRunId: "team-1",
      sourcePath: [],
      data: { status: "idle" },
    } satisfies TeamRunEvent]);

    expect(publishedEvents).toHaveLength(1);
    expect(publishedEvents[0]).toMatchObject({
      eventSourceType: TeamRunEventSourceType.TEAM,
      data: { status: "running" },
    });

    publishedEvents.length = 0;
    (backend as any).fanOutProcessedEvents([
      buildAgentEvent({
        eventType: AgentRunEventType.ASSISTANT_COMPLETE,
        runId: "member-run-1",
        payload: { content: "done" },
        statusHint: null,
      }),
    ]);

    expect(publishedEvents).toHaveLength(1);
    expect(publishedEvents[0]).toMatchObject({
      eventSourceType: TeamRunEventSourceType.AGENT,
      data: {
        agentEvent: {
          eventType: AgentRunEventType.ASSISTANT_COMPLETE,
        },
      },
    });

    publishedEvents.length = 0;
    (backend as any).fanOutProcessedEvents([
      buildAgentEvent({
        eventType: AgentRunEventType.AGENT_STATUS,
        runId: "member-run-1",
        payload: {
          status: "idle",
          can_interrupt: false,
          agent_id: "member-run-1",
          agent_name: "Worker",
        },
        statusHint: "IDLE",
      }),
    ]);

    expect(publishedEvents.at(-1)).toMatchObject({
      eventSourceType: TeamRunEventSourceType.TEAM,
      data: { status: "idle" },
    });
  });

  it("emits target member initializing before delayed native postMessage resolves and reflects pending snapshots", async () => {
    const deferred = createDeferred<void>();
    const backend = createDelayedBackend(vi.fn(() => deferred.promise));
    const publishedEvents: TeamRunEvent[] = [];
    backend.subscribeToEvents((event) => publishedEvents.push(event));

    const postPromise = backend.postMessage(new AgentInputUserMessage("start"), { kind: "route_key", memberRouteKey: "Worker" });

    expect(publishedEvents[0]).toMatchObject({
      eventSourceType: TeamRunEventSourceType.AGENT,
      sourcePath: ["Worker"],
      data: { agentEvent: { eventType: AgentRunEventType.AGENT_STATUS, payload: { status: "initializing" } } },
    });
    expect(backend.getMemberStatusSnapshots()).toEqual([
      expect.objectContaining({ agent_id: "member-run-1", status: "initializing", member_route_key: "Worker" }),
    ]);
    expect(backend.getMemberStatusSnapshots()).not.toContainEqual(expect.objectContaining({ agent_id: "native-member-run-1" }));
    expect(backend.getStatusSnapshot()).toEqual({ status: "initializing" });

    deferred.resolve();
    await expect(postPromise).resolves.toMatchObject({ accepted: true, memberName: "Worker" });
  });

  it("emits recipient initializing before delayed native inter-agent delivery resolves", async () => {
    const deferred = createDeferred<void>();
    const backend = createDelayedBackend(vi.fn(() => deferred.promise));
    const publishedEvents: TeamRunEvent[] = [];
    backend.subscribeToEvents((event) => publishedEvents.push(event));

    const deliverPromise = backend.deliverInterAgentMessage(createInterAgentRequest());

    expect(publishedEvents[0]).toMatchObject({
      eventSourceType: TeamRunEventSourceType.AGENT,
      sourcePath: ["Worker"],
      data: { agentEvent: { eventType: AgentRunEventType.AGENT_STATUS, payload: { status: "initializing" } } },
    });
    expect(backend.getMemberStatusSnapshots()).toEqual([
      expect.objectContaining({ agent_id: "member-run-1", status: "initializing", member_route_key: "Worker" }),
    ]);
    expect(backend.getStatusSnapshot()).toEqual({ status: "initializing" });

    deferred.resolve();
    await expect(deliverPromise).resolves.toEqual({ accepted: true });
  });

  it("emits root initializing only for true no-target native postMessage", async () => {
    const deferred = createDeferred<void>();
    const backend = createDelayedBackend(vi.fn(() => deferred.promise));
    const publishedEvents: TeamRunEvent[] = [];
    backend.subscribeToEvents((event) => publishedEvents.push(event));

    const postPromise = backend.postMessage(new AgentInputUserMessage("start"), null);

    expect(publishedEvents).toHaveLength(1);
    expect(publishedEvents[0]).toMatchObject({ eventSourceType: TeamRunEventSourceType.TEAM, sourcePath: [], data: { status: "initializing" } });
    expect(publishedEvents.some((event) => event.eventSourceType === TeamRunEventSourceType.AGENT)).toBe(false);
    expect(backend.getStatusSnapshot()).toEqual({ status: "initializing" });

    deferred.resolve();
    await expect(postPromise).resolves.toMatchObject({ accepted: true });
  });

  it("clears pending member overlay when matching native member status arrives", async () => {
    const deferred = createDeferred<void>();
    const backend = createDelayedBackend(vi.fn(() => deferred.promise));
    backend.subscribeToEvents(() => undefined);
    void backend.postMessage(new AgentInputUserMessage("start"), { kind: "route_key", memberRouteKey: "Worker" });

    expect(backend.getStatusSnapshot()).toEqual({ status: "initializing" });
    (backend as any).fanOutProcessedEvents([buildAgentEvent({
      eventType: AgentRunEventType.AGENT_STATUS,
      runId: "member-run-1",
      payload: { status: "running", can_interrupt: false, agent_id: "member-run-1", agent_name: "Worker" },
      statusHint: "ACTIVE",
    })]);

    expect(backend.getMemberStatusSnapshots()).toEqual([
      expect.objectContaining({ agent_id: "member-run-1", status: "running", member_route_key: "Worker" }),
    ]);
    expect(backend.getStatusSnapshot()).toEqual({ status: "running" });
    deferred.resolve();
  });

  it("replaces pending member overlay with error when native postMessage fails", async () => {
    const backend = createDelayedBackend(vi.fn().mockRejectedValue(new Error("native failed")));
    const publishedEvents: TeamRunEvent[] = [];
    backend.subscribeToEvents((event) => publishedEvents.push(event));

    await expect(backend.postMessage(new AgentInputUserMessage("start"), { kind: "route_key", memberRouteKey: "Worker" })).resolves.toMatchObject({
      accepted: false,
      code: "RUNTIME_COMMAND_FAILED",
    });

    expect(publishedEvents).toContainEqual(expect.objectContaining({
      eventSourceType: TeamRunEventSourceType.AGENT,
      data: expect.objectContaining({ agentEvent: expect.objectContaining({ payload: expect.objectContaining({ status: "error" }) }) }),
    }));
    expect(backend.getMemberStatusSnapshots()).toEqual([
      expect.objectContaining({ agent_id: "member-run-1", status: "error", member_route_key: "Worker" }),
    ]);
  });

  it("clears pending root overlay when native root team status arrives", async () => {
    const deferred = createDeferred<void>();
    const team = { teamId: "team-1", currentStatus: "idle", postMessage: vi.fn(() => deferred.promise), context: { agents: [] } };
    const backend = new AutoByteusTeamRunBackend(team as any, {
      isActive: () => true,
      removeTeamRun: vi.fn(),
      runtimeContext: new AutoByteusTeamRunContext({ coordinatorMemberRouteKey: null, memberContexts: [] }),
    });
    backend.subscribeToEvents(() => undefined);
    void backend.postMessage(new AgentInputUserMessage("start"), null);

    expect(backend.getStatusSnapshot()).toEqual({ status: "initializing" });
    team.currentStatus = "running";
    (backend as any).fanOutProcessedEvents([{
      eventSourceType: TeamRunEventSourceType.TEAM,
      teamRunId: "team-1",
      sourcePath: [],
      data: { status: "running" },
    } satisfies TeamRunEvent]);

    expect(backend.getStatusSnapshot()).toEqual({ status: "running" });
    deferred.resolve();
  });

});
