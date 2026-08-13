import { afterEach, describe, expect, it, vi } from "vitest";
import { ServerMessage, ServerMessageType } from "../../../../src/services/agent-streaming/models.js";
import { AgentStreamWebSocketEgress } from "../../../../src/services/agent-streaming/websocket-egress/agent-stream-websocket-egress.js";
import type {
  AgentStreamEgressFilter,
  AgentStreamEgressObserver,
} from "../../../../src/services/agent-streaming/websocket-egress/agent-stream-egress-control.js";

const content = (
  delta: unknown,
  id = "segment-a",
  extra: Record<string, unknown> = {},
): ServerMessage => new ServerMessage(ServerMessageType.SEGMENT_CONTENT, {
  id,
  turn_id: "turn-1",
  segment_type: "text",
  delta,
  ...extra,
});

const parseSent = (sendRaw: ReturnType<typeof vi.fn>) =>
  sendRaw.mock.calls.map(([raw]) => JSON.parse(String(raw)) as {
    type: ServerMessageType;
    payload: Record<string, unknown>;
  });

const status = (
  value: string,
  identity: Record<string, unknown> = { agent_id: "agent-run-1" },
  extra: Record<string, unknown> = {},
): ServerMessage => new ServerMessage(ServerMessageType.AGENT_STATUS, {
  status: value,
  ...identity,
  ...extra,
});

describe("AgentStreamWebSocketEgress", () => {
  afterEach(() => vi.useRealTimers());

  it.each([100, 500, 1_000, 2_000])(
    "uses one fixed non-sliding %d ms window",
    (interval) => {
      vi.useFakeTimers();
      const sendRaw = vi.fn();
      const egress = new AgentStreamWebSocketEgress({
        sendRaw,
        readIntervalMs: () => interval,
      });

      egress.send(content("a"));
      vi.advanceTimersByTime(interval - 10);
      egress.send(content("b"));
      vi.advanceTimersByTime(10);

      expect(parseSent(sendRaw)).toEqual([
        expect.objectContaining({ payload: expect.objectContaining({ delta: "ab" }) }),
      ]);
    },
  );

  it("preserves immutable input messages and ordered A/B/A groups", () => {
    const sendRaw = vi.fn();
    const egress = new AgentStreamWebSocketEgress({ sendRaw, readIntervalMs: () => 500 });
    const first = content("a1", "A", { nested: { route: "root" } });
    const second = content("a2", "A", { nested: { route: "root" } });

    egress.send(first);
    egress.send(second);
    egress.send(new ServerMessage(ServerMessageType.AGENT_STATUS, { status: "running" }));
    egress.send(content("b1", "B"));
    egress.send(content("a3", "A", { nested: { route: "root" } }));
    egress.flush();

    expect(first.payload.delta).toBe("a1");
    expect(second.payload.delta).toBe("a2");
    const sent = parseSent(sendRaw);
    expect(sent.filter(({ type }) => type === ServerMessageType.AGENT_STATUS)).toHaveLength(1);
    expect(sent
      .filter(({ type }) => type === ServerMessageType.SEGMENT_CONTENT)
      .map(({ payload }) => [payload.id, payload.delta])).toEqual([
      ["A", "a1a2"],
      ["B", "b1"],
      ["A", "a3"],
    ]);
  });

  it("keeps same-identity content mergeable across running without moving the original timer", () => {
    vi.useFakeTimers();
    const sendRaw = vi.fn();
    const egress = new AgentStreamWebSocketEgress({ sendRaw, readIntervalMs: () => 500 });

    egress.send(new ServerMessage(ServerMessageType.AGENT_STATUS, { status: "running" }));
    egress.send(content("a1"));
    vi.advanceTimersByTime(200);
    egress.send(new ServerMessage(ServerMessageType.AGENT_STATUS, { status: "running" }));
    egress.send(content("a2"));

    expect(parseSent(sendRaw)).toEqual([
      { type: ServerMessageType.AGENT_STATUS, payload: { status: "running" } },
      { type: ServerMessageType.AGENT_STATUS, payload: { status: "running" } },
    ]);
    vi.advanceTimersByTime(299);
    expect(sendRaw).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(1);
    expect(parseSent(sendRaw).map(({ type, payload }) => [type, payload.delta ?? payload.status]))
      .toEqual([
        [ServerMessageType.AGENT_STATUS, "running"],
        [ServerMessageType.AGENT_STATUS, "running"],
        [ServerMessageType.SEGMENT_CONTENT, "a1a2"],
      ]);
  });

  it("suppresses an exact repeated standalone status but forwards a payload transition", () => {
    const sendRaw = vi.fn();
    const egress = new AgentStreamWebSocketEgress({ sendRaw });

    egress.send(status("running"));
    egress.send(status("running"));
    egress.send(status("running", { agent_id: "agent-run-1" }, { detail: "changed" }));

    expect(parseSent(sendRaw).map(({ payload }) => payload)).toEqual([
      { status: "running", agent_id: "agent-run-1" },
      { status: "running", agent_id: "agent-run-1", detail: "changed" },
    ]);
  });

  it("isolates stable-member, task-agent, and nested task-team status identities", () => {
    const sendRaw = vi.fn();
    const egress = new AgentStreamWebSocketEgress({ sendRaw });
    const stableA = { agent_id: "run-a", member_route_key: "root/a" };
    const stableB = { agent_id: "run-b", member_route_key: "root/b" };
    const taskAgent = {
      agent_id: "task-agent-run",
      task_agent_run_id: "task-agent-run",
      task_agent_instance_id: "task-agent-instance",
      source_route_key: "root/lead/task-agent",
    };
    const taskTeamLeaf = {
      agent_id: "leaf-run",
      task_team_run_id: "task-team-run",
      task_team_instance_id: "task-team-instance",
      task_id: "task-1",
      team_route_key: "root/task-team",
      task_team_relative_member_route_key: "researcher",
    };

    [stableA, stableB, taskAgent, taskTeamLeaf].forEach((identity) => {
      egress.send(status("running", identity));
      egress.send(status("running", identity));
    });

    expect(parseSent(sendRaw)).toHaveLength(4);
    expect(parseSent(sendRaw).map(({ payload }) => payload.agent_id)).toEqual([
      "run-a",
      "run-b",
      "task-agent-run",
      "leaf-run",
    ]);
  });

  it("fails open when a status identity is incomplete", () => {
    const sendRaw = vi.fn();
    const egress = new AgentStreamWebSocketEgress({ sendRaw });
    const incompleteTaskTeam = {
      agent_id: "leaf-run",
      task_team_run_id: "task-team-run",
    };

    egress.send(status("running", incompleteTaskTeam));
    egress.send(status("running", incompleteTaskTeam));

    expect(parseSent(sendRaw)).toHaveLength(2);
  });

  it("resets status state per connection and on disposal", () => {
    const sendRawA = vi.fn();
    const sendRawB = vi.fn();
    const first = new AgentStreamWebSocketEgress({ sendRaw: sendRawA });
    const second = new AgentStreamWebSocketEgress({ sendRaw: sendRawB });

    first.send(status("running"));
    first.send(status("running"));
    second.send(status("running"));
    first.dispose();

    expect(parseSent(sendRawA)).toHaveLength(1);
    expect(parseSent(sendRawB)).toHaveLength(1);
  });

  it("runs registered filters in order and keeps observers non-authoritative", () => {
    const sendRaw = vi.fn();
    const filterCalls: string[] = [];
    const observations: string[] = [];
    const onObserverError = vi.fn();
    const firstFilter: AgentStreamEgressFilter = {
      evaluate: () => {
        filterCalls.push("first");
        return { action: "FORWARD" };
      },
    };
    const secondFilter: AgentStreamEgressFilter = {
      evaluate: () => {
        filterCalls.push("second");
        return { action: "FORWARD" };
      },
    };
    const observer: AgentStreamEgressObserver = {
      observe: ({ type }) => {
        observations.push(type);
        if (type === "MESSAGE_RECEIVED") throw new Error("observer failed");
      },
    };
    const egress = new AgentStreamWebSocketEgress({
      sendRaw,
      onObserverError,
      controlExtensions: {
        filterFactories: [() => firstFilter, () => secondFilter],
        observerFactories: [() => observer],
      },
    });

    egress.send(new ServerMessage(ServerMessageType.CONNECTED, { session_id: "s-1" }));

    expect(filterCalls).toEqual(["first", "second"]);
    expect(parseSent(sendRaw)).toHaveLength(1);
    expect(observations).toEqual(["MESSAGE_RECEIVED", "MESSAGE_FORWARDED"]);
    expect(onObserverError).toHaveBeenCalledTimes(1);
  });

  it("keeps nested delivery data immutable across registered observers and filters", () => {
    const sendRaw = vi.fn();
    const mutationAttempts: boolean[] = [];
    const observer: AgentStreamEgressObserver = {
      observe: (observation) => {
        if (observation.type !== "MESSAGE_RECEIVED") return;
        const nested = observation.message.payload.nested as Record<string, unknown>;
        mutationAttempts.push(Reflect.set(nested, "route", "observer-mutated"));
      },
    };
    const filter: AgentStreamEgressFilter = {
      evaluate: (message) => {
        const nested = message.payload.nested as Record<string, unknown>;
        mutationAttempts.push(Reflect.set(nested, "route", "filter-mutated"));
        return { action: "FORWARD" };
      },
    };
    const original = new ServerMessage(ServerMessageType.CONNECTED, {
      session_id: "s-immutable",
      nested: { route: "exact" },
    });
    const egress = new AgentStreamWebSocketEgress({
      sendRaw,
      controlExtensions: {
        filterFactories: [() => filter],
        observerFactories: [() => observer],
      },
    });

    egress.send(original);

    expect(mutationAttempts).toEqual([false, false]);
    expect(original.payload).toEqual({ session_id: "s-immutable", nested: { route: "exact" } });
    expect(parseSent(sendRaw)).toEqual([{
      type: ServerMessageType.CONNECTED,
      payload: { session_id: "s-immutable", nested: { route: "exact" } },
    }]);
  });

  it.each([
    new ServerMessage(ServerMessageType.CONNECTED, { session_id: "session-1" }),
    new ServerMessage(ServerMessageType.AGENT_COMMAND_ACK, { accepted: true }),
    new ServerMessage(ServerMessageType.TOKEN_USAGE_UPDATED, { input_tokens: 1 }),
    new ServerMessage(ServerMessageType.AGENT_STATUS, { status: "initializing" }),
    new ServerMessage(ServerMessageType.AGENT_STATUS, { status: "running" }),
  ])("sends declared companion $type without changing pending tail or timer", (companion) => {
    vi.useFakeTimers();
    const sendRaw = vi.fn();
    const egress = new AgentStreamWebSocketEgress({ sendRaw, readIntervalMs: () => 500 });

    egress.send(content("a1"));
    vi.advanceTimersByTime(200);
    egress.send(companion);
    egress.send(content("a2"));

    expect(parseSent(sendRaw).map(({ type }) => type)).toEqual([companion.type]);
    vi.advanceTimersByTime(299);
    expect(sendRaw).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(parseSent(sendRaw).map(({ type, payload }) => [type, payload.delta])).toEqual([
      [companion.type, undefined],
      [ServerMessageType.SEGMENT_CONTENT, "a1a2"],
    ]);
  });

  it.each([
    new ServerMessage(ServerMessageType.SEGMENT_END, { id: "segment-a" }),
    new ServerMessage(ServerMessageType.TURN_COMPLETED, { turn_id: "turn-1" }),
    new ServerMessage(ServerMessageType.TURN_INTERRUPTED, { turn_id: "turn-1" }),
    new ServerMessage(ServerMessageType.ASSISTANT_COMPLETE, { turn_id: "turn-1" }),
    new ServerMessage(ServerMessageType.AGENT_STATUS, { status: "idle" }),
    new ServerMessage(ServerMessageType.AGENT_STATUS, { status: "offline" }),
    new ServerMessage(ServerMessageType.AGENT_STATUS, { status: "error" }),
    new ServerMessage(ServerMessageType.ERROR, { code: "FAILED" }),
    new ServerMessage(ServerMessageType.TOOL_EXECUTION_STARTED, { invocation_id: "tool-1" }),
    new ServerMessage(ServerMessageType.TOOL_EXECUTION_INTERRUPTED, { invocation_id: "tool-1" }),
    new ServerMessage(ServerMessageType.TEAM_RUN_LIFECYCLE, { state: "completed" }),
  ])("flushes content before dependent boundary $type", (boundary) => {
    const sendRaw = vi.fn();
    const egress = new AgentStreamWebSocketEgress({ sendRaw, readIntervalMs: () => 500 });

    egress.send(content("exact"));
    egress.send(boundary);

    expect(parseSent(sendRaw).map(({ type }) => type)).toEqual([
      ServerMessageType.SEGMENT_CONTENT,
      boundary.type,
    ]);
  });

  it("treats invalid content delta conservatively without fabricating content", () => {
    const sendRaw = vi.fn();
    const egress = new AgentStreamWebSocketEgress({ sendRaw, readIntervalMs: () => 500 });

    egress.send(content("valid"));
    egress.send(content(123));

    expect(parseSent(sendRaw).map(({ payload }) => payload.delta)).toEqual(["valid", 123]);
  });

  it("applies a changed setting only to the next newly opened window", () => {
    vi.useFakeTimers();
    const sendRaw = vi.fn();
    let interval = 500;
    const egress = new AgentStreamWebSocketEgress({ sendRaw, readIntervalMs: () => interval });

    egress.send(content("first"));
    interval = 1_000;
    vi.advanceTimersByTime(500);
    expect(sendRaw).toHaveBeenCalledTimes(1);

    egress.send(content("second"));
    vi.advanceTimersByTime(999);
    expect(sendRaw).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(sendRaw).toHaveBeenCalledTimes(2);
  });

  it("disposes pending unsendable connection state idempotently", () => {
    vi.useFakeTimers();
    const sendRaw = vi.fn();
    const egress = new AgentStreamWebSocketEgress({ sendRaw, readIntervalMs: () => 500 });
    egress.send(content("pending"));

    egress.dispose();
    egress.dispose();
    vi.runAllTimers();

    expect(sendRaw).not.toHaveBeenCalled();
  });

  it("reports timer-triggered send failure through the bounded error callback", () => {
    vi.useFakeTimers();
    const sendError = new Error("socket closed");
    const onSendError = vi.fn();
    const egress = new AgentStreamWebSocketEgress({
      sendRaw: () => { throw sendError; },
      readIntervalMs: () => 500,
      onSendError,
    });
    egress.send(content("pending"));

    vi.advanceTimersByTime(500);

    expect(onSendError).toHaveBeenCalledWith(sendError);
  });
});
