/**
 * Codex exact-turn gate rejection logging across the real Codex client path.
 *
 * Purpose: prove that rejected Codex item events are logged bounded per rejected turn account
 * (one detailed line, then count summaries at turn boundaries, thread release and app-server
 * close) and that admission is unchanged (rejected events never reach AgentRun; the active
 * turn's events still do), driven through the real CodexAppServerClient (child process over
 * stdio), CodexClientThreadRouter, CodexThreadManager, CodexAgentRunBackend and AgentRun.
 * Prerequisites: none. The app-server is the provider-free fixture
 * `tests/fixtures/codex-scripted-notification-cli.mjs`; no Codex binary, model or credentials.
 * Command: pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent-execution/codex-segment-turn-rejection-logging.integration.test.ts --no-watch
 * Cases: late tool items after Stop (SCN-001); whole rejected turn with no active turn (SCN-002);
 * run termination with pending counts; app-server exit with pending counts.
 */
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { AgentRun } from "../../../src/agent-execution/domain/agent-run.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import { CodexAgentRunContext } from "../../../src/agent-execution/backends/codex/backend/codex-agent-run-context.js";
import { CodexAgentRunBackend } from "../../../src/agent-execution/backends/codex/backend/codex-agent-run-backend.js";
import type { CodexThreadCleanup } from "../../../src/agent-execution/backends/codex/backend/codex-thread-cleanup.js";
import { CodexThreadManager } from "../../../src/agent-execution/backends/codex/thread/codex-thread-manager.js";
import { CodexApprovalPolicy } from "../../../src/agent-execution/backends/codex/thread/codex-thread-config.js";
import { CodexClientThreadRouter } from "../../../src/agent-execution/backends/codex/thread/codex-client-thread-router.js";
import { CodexAppServerClient } from "../../../src/runtime-management/codex/client/codex-app-server-client.js";
import { CodexAppServerClientManager } from "../../../src/runtime-management/codex/client/codex-app-server-client-manager.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { activatedAgentToolMcpRunSessionsStub } from "../../helpers/agent-tool-mcp-run-sessions-stub.js";

const DETAILED = "[CodexSegmentTurnAdmissionRejected]";
const SUMMARY = "[CodexSegmentTurnAdmissionRejectedSummary]";
const RUNTIME = RuntimeKind.CODEX_APP_SERVER;
const fixture = fileURLToPath(new URL("../../fixtures/codex-scripted-notification-cli.mjs", import.meta.url));

type Notification = { method: string; params: Record<string, unknown> };

const commandItem = (threadId: string, turnId: string, id: string, phase: "started" | "completed"): Notification => ({
  method: `item/${phase}`,
  params: {
    threadId,
    turnId,
    item: phase === "started"
      ? { type: "commandExecution", id, command: `secret-cmd ${id}`, cwd: "/tmp", status: "inProgress" }
      : { type: "commandExecution", id, command: `secret-cmd ${id}`, cwd: "/tmp", status: "completed",
        aggregatedOutput: `secret-output ${id}`, exitCode: 0 },
  },
});
const agentMessage = (threadId: string, turnId: string | null, id: string, text: string): Notification[] => {
  const turn = turnId ? { turnId } : {};
  return [
    { method: "item/started", params: { threadId, ...turn, item: { type: "agentMessage", id, text: "" } } },
    { method: "item/agentMessage/delta", params: { threadId, ...turn, itemId: id, delta: text } },
    { method: "item/completed", params: { threadId, ...turn, item: { type: "agentMessage", id, text } } },
  ];
};
const delta = (threadId: string, turnId: string | null, itemId: string, text: string): Notification => ({
  method: "item/agentMessage/delta",
  params: { threadId, ...(turnId ? { turnId } : {}), itemId, delta: text },
});
const turnCompleted = (threadId: string, turnId: string): Notification => ({
  method: "turn/completed",
  params: { threadId, turn: { id: turnId, status: "completed", error: null } },
});

async function harness() {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "codex-rejection-logging-"));
  let client!: CodexAppServerClient;
  const clients = new CodexAppServerClientManager({ createClient: () => client = new CodexAppServerClient({
    command: process.execPath, args: [fixture], cwd, env: {}, requestTimeoutMs: 5000,
  }) });
  const cleanup = { cleanupPreparedWorkspaceSkills: vi.fn(async () => undefined) };
  const manager = new CodexThreadManager(clients, cleanup as unknown as CodexThreadCleanup, new CodexClientThreadRouter());
  const createRun = async (runId: string) => {
    const context = new AgentRunContext({ runId,
      config: new AgentRunConfig({ runtimeKind: RUNTIME, agentDefinitionId: "test-rejection-logging",
        llmModelIdentifier: "", autoExecuteTools: false, workspaceId: cwd }),
      runtimeContext: new CodexAgentRunContext({ codexThreadConfig: {
        model: null, workingDirectory: cwd, reasoningEffort: null, serviceTier: null,
        approvalPolicy: CodexApprovalPolicy.NEVER, sandbox: "workspace-write", baseInstructions: null, developerInstructions: null, dynamicTools: [],
      } }),
    });
    const thread = await manager.createThread(context, () => undefined);
    const backend = new CodexAgentRunBackend(context, thread, manager, activatedAgentToolMcpRunSessionsStub(context.runId));
    const run = new AgentRun({ context, backend, providerInputNormalizer: { normalizeForProvider: dispatch => dispatch } });
    const events: AgentRunEvent[] = [];
    run.subscribeToEvents(event => events.push(event));
    const threadId = thread.threadId!;
    const notify = (notifications: Notification[]) => client.request("test/notify", { notifications });
    const send = async (text: string): Promise<string> => {
      await run.postUserMessage(new AgentInputUserMessage(text));
      await vi.waitFor(() => expect(run.getInputStateSnapshot().entries[0]?.state).toBe("forwarded"));
      return thread.activeTurnId!;
    };
    const stop = async (turnId: string) => {
      expect(await run.interrupt(turnId)).toMatchObject({ accepted: true });
      await vi.waitFor(() => {
        expect(thread.activeTurnId).toBeNull();
        expect(run.getInputStateSnapshot().entries).toEqual([]);
      });
    };
    const complete = async (turnId: string) => {
      await notify([turnCompleted(threadId, turnId)]);
      await vi.waitFor(() => expect(run.getInputStateSnapshot().entries).toEqual([]));
    };
    return { run, thread, threadId, events, notify, send, stop, complete };
  };
  const close = async () => {
    await client.close().catch(() => undefined);
    await rm(cwd, { recursive: true, force: true });
  };
  return { createRun, manager, client: () => client, close };
}

describe("Codex exact-turn rejection logging through the real Codex client path", () => {
  let warn: MockInstance<typeof console.warn>;
  const lines = (tag: string, runId?: string) => warn.mock.calls
    .filter(call => call[0] === tag)
    .map(call => call[1] as Record<string, unknown>)
    .filter(line => !runId || line["runId"] === runId);
  const rejectionText = () => JSON.stringify(warn.mock.calls.filter(call => call[0] === DETAILED || call[0] === SUMMARY));
  const eventText = (events: readonly AgentRunEvent[]) => JSON.stringify(events);
  const receipt = (name: string, runId: string) => console.log(`[receipt] ${name}`, JSON.stringify({
    detailed: lines(DETAILED, runId), summaries: lines(SUMMARY, runId),
  }));

  beforeEach(() => { warn = vi.spyOn(console, "warn").mockImplementation(() => undefined); });
  afterEach(() => { warn.mockRestore(); });

  it("SCN-001: late tool items of stopped turns get one CONFLICT line per turn while the new turn's output is delivered", async () => {
    const h = await harness();
    try {
      const r = await h.createRun("run-late-tools");
      const stopped: string[] = [];
      for (const text of ["first", "second", "third"]) {
        const turnId = await r.send(text);
        await r.notify([commandItem(r.threadId, turnId, `cmd-in-turn-${stopped.length}`, "started")]);
        await r.stop(turnId);
        stopped.push(turnId);
      }
      const activeTurn = await r.send("fourth");
      expect(new Set([...stopped, activeTurn]).size).toBe(4);
      const eventsBeforeLate = r.events.length;

      // Codex finishes the stopped turns' tools after the Stop, while the new turn runs (AC-002, AC-006).
      await r.notify([
        ...stopped.map((turnId, index) => commandItem(r.threadId, turnId, `cmd-in-turn-${index}`, "completed")),
        ...agentMessage(r.threadId, activeTurn, "msg-active", "visible active-turn text"),
      ]);
      await r.complete(activeTurn);

      expect(lines(DETAILED, r.run.runId)).toEqual(stopped.map(turnId => ({
        runtimeKind: RUNTIME, runId: r.run.runId, nativeEventName: "item/completed",
        reasonCode: "CODEX_SEGMENT_TURN_CONFLICT", itemType: "commandExecution", turnId, activeTurnId: activeTurn,
      })));
      expect(lines(SUMMARY, r.run.runId)).toEqual([]);
      const lateEvents = r.events.slice(eventsBeforeLate);
      expect(eventText(lateEvents)).toContain("visible active-turn text");
      expect(lateEvents.some(event => event.eventType === AgentRunEventType.TURN_COMPLETED)).toBe(true);
      expect(eventText(lateEvents)).not.toContain("secret-output");
      for (const turnId of stopped) expect(eventText(lateEvents)).not.toContain(turnId);

      // A later event of an already-reported turn is only counted (AC-008): summary at the next turn start.
      const lastStopped = stopped[0]!;
      await r.notify([commandItem(r.threadId, lastStopped, "cmd-late-start", "started")]);
      expect(lines(DETAILED, r.run.runId)).toHaveLength(3);
      const nextTurn = await r.send("fifth");
      expect(lines(DETAILED, r.run.runId)).toHaveLength(3);
      expect(lines(SUMMARY, r.run.runId)).toEqual([
        { runtimeKind: RUNTIME, runId: r.run.runId, turnId: lastStopped, count: 1 },
      ]);
      expect(eventText(r.events)).not.toContain("cmd-late-start");
      await r.complete(nextTurn);
      expect(lines(SUMMARY, r.run.runId)).toHaveLength(1);
      expect(rejectionText()).not.toContain("secret-");
      receipt("SCN-001", r.run.runId);
    } finally { await h.close(); }
  }, 30_000);

  it("SCN-002: a whole turn rejected with no active turn writes one detailed line and one summary per boundary", async () => {
    const h = await harness();
    try {
      const r = await h.createRun("run-whole-turn");
      const lostTurn = "codex-turn-not-adopted";
      const burst: Notification[] = [
        { method: "item/started", params: { threadId: r.threadId, turnId: lostTurn, item: { type: "agentMessage", id: "msg-lost", text: "" } } },
        ...Array.from({ length: 436 }, (_, index) => delta(r.threadId, lostTurn, "msg-lost", `lost text ${index}`)),
        { method: "item/completed", params: { threadId: r.threadId, turnId: lostTurn, item: { type: "agentMessage", id: "msg-lost", text: "lost text" } } },
        ...Array.from({ length: 3 }, () => delta(r.threadId, null, "msg-no-turn", "lost text without turn")),
      ];
      expect(burst).toHaveLength(441);
      await r.notify(burst);

      // AC-001, AC-003, QR-001: 441 rejected events -> 2 detailed lines, nothing to AgentRun.
      expect(lines(DETAILED, r.run.runId)).toEqual([
        { runtimeKind: RUNTIME, runId: r.run.runId, nativeEventName: "item/started",
          reasonCode: "CODEX_SEGMENT_TURN_INACTIVE", itemType: "agentMessage", turnId: lostTurn, activeTurnId: null },
        { runtimeKind: RUNTIME, runId: r.run.runId, nativeEventName: "item/agentMessage/delta",
          reasonCode: "CODEX_SEGMENT_TURN_INACTIVE", itemType: null, turnId: null, activeTurnId: null },
      ]);
      expect(lines(SUMMARY, r.run.runId)).toEqual([]);
      expect(eventText(r.events)).not.toContain("lost text");

      const activeTurn = await r.send("hello");
      expect(lines(SUMMARY, r.run.runId)).toEqual([
        { runtimeKind: RUNTIME, runId: r.run.runId, turnId: lostTurn, count: 437 },
        { runtimeKind: RUNTIME, runId: r.run.runId, turnId: null, count: 2 },
      ]);

      // AC-008: more events of the reported turn while another turn runs -> counted, no second detailed line.
      await r.notify([
        delta(r.threadId, lostTurn, "msg-lost", "lost text late 1"),
        delta(r.threadId, lostTurn, "msg-lost", "lost text late 2"),
        ...agentMessage(r.threadId, activeTurn, "msg-active", "visible active-turn text"),
      ]);
      await r.complete(activeTurn);
      expect(lines(DETAILED, r.run.runId)).toHaveLength(2);
      expect(lines(SUMMARY, r.run.runId)).toEqual([
        { runtimeKind: RUNTIME, runId: r.run.runId, turnId: lostTurn, count: 437 },
        { runtimeKind: RUNTIME, runId: r.run.runId, turnId: null, count: 2 },
        { runtimeKind: RUNTIME, runId: r.run.runId, turnId: lostTurn, count: 2 },
      ]);
      expect(eventText(r.events)).toContain("visible active-turn text");
      expect(eventText(r.events)).not.toContain("lost text");
      expect(rejectionText()).not.toContain("lost text");
      receipt("SCN-002", r.run.runId);
    } finally { await h.close(); }
  }, 30_000);

  it("run termination writes one summary per pending account, and nothing when nothing is pending (AC-005)", async () => {
    const h = await harness();
    try {
      const pending = await h.createRun("run-terminated-pending");
      const clean = await h.createRun("run-terminated-clean");
      const turnA = "codex-turn-a";
      const turnB = "codex-turn-b";
      await pending.notify([
        ...Array.from({ length: 5 }, (_, index) => delta(pending.threadId, turnA, "msg-a", `lost text ${index}`)),
        ...Array.from({ length: 3 }, (_, index) => commandItem(pending.threadId, turnB, `cmd-b-${index}`, "completed")),
      ]);
      expect(lines(DETAILED, pending.run.runId)).toHaveLength(2);
      expect(lines(SUMMARY, pending.run.runId)).toEqual([]);

      expect(await pending.run.terminate()).toEqual({ accepted: true });
      expect(h.manager.getThread(pending.run.runId)).toBeNull();
      expect(lines(SUMMARY, pending.run.runId)).toEqual([
        { runtimeKind: RUNTIME, runId: pending.run.runId, turnId: turnA, count: 4 },
        { runtimeKind: RUNTIME, runId: pending.run.runId, turnId: turnB, count: 2 },
      ]);

      expect(await clean.run.terminate()).toEqual({ accepted: true });
      expect(h.manager.getThread(clean.run.runId)).toBeNull();
      expect(lines(DETAILED, clean.run.runId)).toEqual([]);
      expect(lines(SUMMARY, clean.run.runId)).toEqual([]);
      expect(rejectionText()).not.toContain("secret-");
      expect(rejectionText()).not.toContain("lost text");
      receipt("AC-005 pending", pending.run.runId);
      receipt("AC-005 clean", clean.run.runId);
    } finally { await h.close(); }
  }, 30_000);

  it("an app-server exit writes the pending summaries (client close)", async () => {
    const h = await harness();
    try {
      const r = await h.createRun("run-client-closed");
      const turnZ = "codex-turn-z";
      await r.notify(Array.from({ length: 3 }, (_, index) => delta(r.threadId, turnZ, "msg-z", `lost text ${index}`)));
      expect(lines(DETAILED, r.run.runId)).toHaveLength(1);

      void h.client().request("test/exit", {}).catch(() => undefined);
      await vi.waitFor(() => expect(lines(SUMMARY, r.run.runId)).toHaveLength(1));
      // Close flushes in the thread and again in the manager's release of the closed thread:
      // after both ran, the pending count is written exactly once.
      await vi.waitFor(() => expect(h.manager.getThread(r.run.runId)).toBeNull());
      expect(lines(SUMMARY, r.run.runId)).toEqual([
        { runtimeKind: RUNTIME, runId: r.run.runId, turnId: turnZ, count: 2 },
      ]);
      expect(rejectionText()).not.toContain("lost text");
      receipt("client close", r.run.runId);
    } finally { await h.close(); }
  }, 30_000);
});
