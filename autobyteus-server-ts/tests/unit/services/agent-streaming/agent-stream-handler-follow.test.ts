import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentRunEventType } from "../../../../src/agent-execution/domain/agent-run-event.js";
import { AgentStreamHandler } from "../../../../src/services/agent-streaming/agent-stream-handler.js";
import { getAgentRunEventMessageMapper } from "../../../../src/services/agent-streaming/agent-run-event-message-mapper.js";
import { AgentSessionManager } from "../../../../src/services/agent-streaming/agent-session-manager.js";
import { ClientMessageType, ServerMessageType } from "../../../../src/services/agent-streaming/models.js";
import { ActiveCollaborationRootDirectory } from "../../../../src/agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { createAgentRootExecutionIdentity } from "../../../../src/agent-collaboration/execution/domain/root-execution-identity.js";

/**
 * autobyteus-461 SR-064: a delegated agent's own stream (rule 2) follows its run by run ID. A delegator's Task message
 * restores the stopped child while the user watches it: its events arrive on the open session with no reconnect and
 * no send; after a stop the session stays open with the stopped status; an own send during the restore binds once.
 */
const RUN = "child-run";
const stopped = { status: "offline", isActive: false, shouldConnectStream: false, lastKnownStatus: "IDLE",
  statusSource: "HISTORICAL_METADATA", statusPayload: { status: "offline", agent_id: RUN } };
const boundary = { hasAgentExecution: () => true, deliverExactAgentMessage: async () => ({ accepted: true as const }) };

const fakeRun = () => {
  const listeners = new Set<(event: unknown) => void>();
  return {
    runId: RUN, runtimeKind: "autobyteus",
    getStatusSnapshot: () => ({ status: "running" }),
    subscribeToEvents: vi.fn((listener: (event: unknown) => void) => { listeners.add(listener); return () => listeners.delete(listener); }),
    emit: (delta: string) => listeners.forEach((listener) => listener({ runId: RUN, eventType: AgentRunEventType.SEGMENT_CONTENT,
      payload: { id: "item-1", delta, segment_type: "text" }, statusHint: null })),
    listenerCount: () => listeners.size,
  };
};

const setup = () => {
  const registrations = new ActiveCollaborationRootDirectory();
  const hostReady = new Set<(run: never) => void>();
  let live: ReturnType<typeof fakeRun> | null = null;
  const root = {
    activeHostRun: () => live as never,
    onHostReady: (listener: (run: never) => void) => { hostReady.add(listener); return () => hostReady.delete(listener); },
  };
  let registered = false;
  const agentRunService = { getAgentRun: vi.fn(() => live), recordRunActivity: vi.fn() };
  let reservation: ReturnType<ActiveCollaborationRootDirectory["reserve"]> | null = null;
  /** The delegator's Task message restores the child: its root registers, then its host is made ready in its gate. */
  const restore = () => {
    reservation = registrations.reserve(createAgentRootExecutionIdentity(RUN), boundary);
    registered = true;
    reservation.commit();
    const run = fakeRun();
    live = run;
    hostReady.forEach((listener) => listener(run as never));
    return run;
  };
  const stop = () => { live = null; registered = false; reservation?.release(); };
  const coordinator = { postUserMessage: vi.fn(async (input: any) => {
    const run = live ?? restore();
    input.onActiveRunReady?.(run);
    return { ack: { command_type: "SEND_MESSAGE", run_id: RUN, message_id: input.messageId, dedupe_key: input.dedupeKey,
      state: "accepted", accepted: true, duplicate: false } };
  }) };
  const handler = new AgentStreamHandler(new AgentSessionManager(), agentRunService as never, getAgentRunEventMessageMapper(),
    undefined, coordinator as never, { getRunStatusProjection: vi.fn(async () => stopped) } as never,
    { registrations, roots: { getActive: (id: string) => (registered && id === RUN ? root : null) } });
  const connection = { send: vi.fn(), close: vi.fn() };
  const wire = () => connection.send.mock.calls.map(([raw]) => JSON.parse(raw));
  const deltas = () => wire().filter((message) => message.type === ServerMessageType.SEGMENT_CONTENT).map((message) => message.payload.delta);
  return { handler, connection, restore, stop, wire, deltas };
};

const settle = async () => { await Promise.resolve(); await Promise.resolve(); vi.advanceTimersByTime(500); await Promise.resolve(); };

describe("AgentStreamHandler follows its run (SR-064)", () => {
  afterEach(() => vi.useRealTimers());

  it("a stopped child restored by its delegator's Task message streams on the open session, with no reconnect or send", async () => {
    vi.useFakeTimers();
    const { handler, connection, restore, deltas } = setup();
    expect(await handler.connect(connection, RUN)).toBeTruthy();
    const run = restore();
    run.emit("first");
    run.emit("output");
    await settle();
    expect(deltas()).toEqual(["first", "output"]);
    expect(connection.close).not.toHaveBeenCalled();
  });

  it("after a stop the session stays open with the stopped status, and binds again on the next restore", async () => {
    vi.useFakeTimers();
    const { handler, connection, restore, stop, wire, deltas } = setup();
    await handler.connect(connection, RUN);
    const first = restore();
    stop();
    await settle();
    expect(first.listenerCount()).toBe(0);
    expect(wire().at(-1)).toMatchObject({ type: ServerMessageType.AGENT_STATUS, payload: { status: "offline" } });
    expect(connection.close).not.toHaveBeenCalled();
    restore().emit("again");
    await settle();
    expect(deltas()).toEqual(["again"]);
  });

  it("an own send during the restore binds once and does not duplicate events", async () => {
    vi.useFakeTimers();
    const { handler, connection, deltas } = setup();
    const sessionId = (await handler.connect(connection, RUN))!;
    await handler.handleMessage(sessionId, JSON.stringify({ type: ClientMessageType.SEND_MESSAGE, payload: {
      content: "hello", message_id: "m1", dedupe_key: "d1" } }));
    const run = (handler as unknown as { subscribedRunsBySessionId: Map<string, ReturnType<typeof fakeRun>> }).subscribedRunsBySessionId.get(sessionId)!;
    expect(run.listenerCount()).toBe(1);
    run.emit("once");
    await settle();
    expect(deltas()).toEqual(["once"]);
  });
});
