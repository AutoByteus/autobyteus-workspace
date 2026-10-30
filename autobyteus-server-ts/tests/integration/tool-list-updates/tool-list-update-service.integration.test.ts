import { mkdirSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { readPlatformInputPreface } from "autobyteus-ts/agent/message/platform-input-preface-metadata.js";
import { SenderType } from "autobyteus-ts/agent/sender-type.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentDefinitionChangeSignal } from "../../../src/agent-definition/services/agent-definition-change-signal.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRun } from "../../../src/agent-execution/domain/agent-run.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import { AgentRunPlatformNotices } from "../../../src/agent-execution/domain/agent-run-platform-notices.js";
import type { AgentRunInputPreface } from "../../../src/agent-execution/domain/agent-run-input-preface.js";
import type { AgentRunBackendInputDispatch, AgentRunInputLifecycle } from "../../../src/agent-execution/input/agent-run-input-contract.js";
import type { AgentRunToolListApplyResult } from "../../../src/agent-execution/backends/agent-run-backend.js";
import {
  SKILL_UPDATE_NOTICE_SENDER_ID,
  TOOL_LIST_UPDATE_NOTICE_SENDER_ID,
} from "../../../src/agent-execution/domain/system-task-notification-senders.js";
import { SEEN_TOOL_NAMES_FILE_NAME } from "../../../src/tool-list-updates/providers/seen-tool-names-store.js";
import { createToolListUpdates, type ToolListUpdates } from "../../../src/tool-list-updates/tool-list-updates.js";
import { TOOL_LIST_UPDATE_NOTICE_HEADER } from "../../../src/tool-list-updates/services/tool-list-update-notice-builder.js";
import { createSkillUpdateNotices, type SkillUpdateNotices } from "../../../src/skill-update-notices/skill-update-notices.js";

// DS-001 / DS-005 with the real service, seen-names store, change signal and composite, real
// AgentRuns over fake backends, and an in-memory definition service (id → tool names).

const tempDirs: string[] = [];
const closers: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const close of closers.splice(0)) await close();
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

type RuntimeMode = "immediate" | "on_next_turn";

const createWorld = async () => {
  const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "tool-list-int-")));
  tempDirs.push(root);
  const definitions = new Map<string, string[]>();
  const signal = new AgentDefinitionChangeSignal();
  const reads = vi.fn();
  const updates = createToolListUpdates({
    agentDefinitionService: {
      getAgentDefinitionById: async (id: string) => {
        reads(id);
        const toolNames = definitions.get(id);
        return (toolNames ? { id, toolNames: [...toolNames] } : null) as never;
      },
    },
    definitionChanges: signal,
    seenToolNamesRetryDelaysMs: [20],
  });
  closers.push(() => updates.close());
  const save = async (definitionId: string, toolNames: string[]) => {
    definitions.set(definitionId, toolNames);
    signal.notifyChanged();
    await updates.service.onDefinitionsChanged();
  };
  return { root, definitions, signal, updates, service: updates.service, save, reads };
};

/** A fake backend runtime: the tools it has, and how it takes a definition's tools. */
const createRuntime = (initial: string[], mode: RuntimeMode) => {
  const runtime = {
    has: [...initial],
    pending: null as string[] | null,
    applyCalls: 0,
    applyDefinitionTools: vi.fn(async (definition: { toolNames: string[] }): Promise<AgentRunToolListApplyResult> => {
      runtime.applyCalls += 1;
      const next = [...definition.toolNames].sort();
      const now = [...runtime.has].sort();
      const same = next.length === now.length && next.every((name, index) => name === now[index]);
      if (mode === "immediate") {
        if (same) return { kind: "unchanged", toolNames: runtime.has };
        runtime.has = next;
        return { kind: "applied", toolNames: next };
      }
      runtime.pending = same ? null : next;
      return same ? { kind: "unchanged", toolNames: runtime.has } : { kind: "on_next_turn", toolNames: next };
    }),
    getToolNames: () => runtime.has,
  };
  return runtime;
};

/** A real AgentRun over a fake idle backend; a turn start applies a pending reopen first. */
const createAgentRun = (input: {
  runId: string;
  definitionId: string;
  memoryDir: string | null;
  inputPreface: AgentRunInputPreface;
  runtime: ReturnType<typeof createRuntime>;
  activeTurnAppend?: boolean;
}) => {
  if (input.memoryDir) mkdirSync(input.memoryDir, { recursive: true });
  const context = new AgentRunContext({
    runId: input.runId,
    config: new AgentRunConfig({
      runtimeKind: "codex_app_server", agentDefinitionId: input.definitionId, llmModelIdentifier: "gpt",
      autoExecuteTools: false, workspaceId: null, llmConfig: null, memoryDir: input.memoryDir,
    }),
    runtimeContext: null,
  });
  let turns = 0;
  let activeTurn: string | null = null;
  const sourceListeners = new Set<(events: readonly AgentRunEvent[]) => void | Promise<void>>();
  const dispatchUserInput = vi.fn(async (dispatch: AgentRunBackendInputDispatch) => {
    if (dispatch.kind === "start_turn" && input.runtime.pending) {
      input.runtime.has = input.runtime.pending;
      input.runtime.pending = null;
    }
    if (dispatch.kind === "append_to_active_turn") return { forwarded: true, turnId: dispatch.turnId };
    activeTurn = `turn-${++turns}`;
    return { forwarded: true, turnId: activeTurn };
  });
  const backend = {
    runId: input.runId,
    runtimeKind: context.config.runtimeKind,
    compactionRecovery: { kind: "unsupported" } as const,
    backgroundTaskInspection: { kind: "unsupported" } as const,
    inputCapabilities: { activeTurnAppend: input.activeTurnAppend ? "supported" : "unsupported" },
    getContext: () => context,
    getPlatformAgentRunId: () => `platform-${input.runId}`,
    isActive: () => true,
    getLifecycleSnapshot: () => activeTurn
      ? { availability: "active", phase: "running", currentTurn: { kind: "IDENTIFIED", turnId: activeTurn } }
      : { availability: "active", phase: "idle", currentTurn: { kind: "NONE" } },
    hasRunningBackgroundTasks: () => false,
    subscribeToSourceEventBatches: (listener: (events: readonly AgentRunEvent[]) => void | Promise<void>) => {
      sourceListeners.add(listener);
      return () => sourceListeners.delete(listener);
    },
    dispatchUserInput,
    approveToolInvocation: vi.fn(),
    interrupt: vi.fn(),
    terminate: vi.fn(),
    applyDefinitionTools: input.runtime.applyDefinitionTools,
    getToolNames: input.runtime.getToolNames,
  };
  const run = new AgentRun({
    providerInputNormalizer: { normalizeForProvider: (dispatch: AgentRunBackendInputDispatch) => dispatch },
    context,
    backend: backend as never,
    commandObservers: [],
    inputPreface: input.inputPreface,
  });
  const published: AgentRunEvent[] = [];
  run.subscribeToEvents((value) => { published.push(value); });
  const sent = (call: number) => (dispatchUserInput.mock.calls[call] as unknown as [AgentRunBackendInputDispatch])[0];
  const send = async (text: string) => {
    const before = dispatchUserInput.mock.calls.length;
    await run.postUserMessage(new AgentInputUserMessage(text, SenderType.USER, null, {}));
    await vi.waitFor(() => expect(dispatchUserInput.mock.calls.length).toBe(before + 1));
    return sent(before);
  };
  /** The runtime completes its turn (AgentRun learns it from the event). */
  const endTurn = async () => {
    const turnId = activeTurn;
    activeTurn = null;
    for (const listener of sourceListeners) {
      await listener([{ eventType: AgentRunEventType.TURN_COMPLETED, runId: input.runId, payload: { turn_id: turnId }, statusHint: null }]);
    }
    await vi.waitFor(() => expect(run.getStatusSnapshot().status).not.toBe("running"));
  };
  const notices = () => published.filter((value) => value.eventType === AgentRunEventType.SYSTEM_TASK_NOTIFICATION);
  return { run, dispatchUserInput, published, sent, send, endTurn, notices };
};

const readRecord = async (memoryDir: string) =>
  JSON.parse(await fs.readFile(path.join(memoryDir, SEEN_TOOL_NAMES_FILE_NAME), "utf8")) as { version: number; toolNames: string[] };

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

describe("ToolListUpdateService", () => {
  it("records a new run's tools, then gives an idle immediate run its notice with its next input", async () => {
    const world = await createWorld();
    world.definitions.set("def", ["alpha"]);
    const memoryDir = path.join(world.root, "memory", "run-1");
    const agent = createAgentRun({
      runId: "run-1", definitionId: "def", memoryDir, inputPreface: world.service,
      runtime: createRuntime(["alpha"], "immediate"),
    });
    world.service.runPublished(agent.run, "new");
    await vi.waitFor(async () => expect(await readRecord(memoryDir)).toEqual({ version: 1, toolNames: ["alpha"] }));

    await world.save("def", ["alpha", "beta"]);
    const first = await agent.send("Use beta now.");
    expect(first.message.content).toBe(
      `${TOOL_LIST_UPDATE_NOTICE_HEADER}\n\nYour tools changed. Now available: beta.\n\nUse beta now.`,
    );
    expect(readPlatformInputPreface(first.message.metadata)?.originalContent).toBe("Use beta now.");
    await vi.waitFor(() => expect(agent.notices()).toHaveLength(1));
    expect(agent.notices()[0]!.payload).toMatchObject({ sender_id: TOOL_LIST_UPDATE_NOTICE_SENDER_ID, turn_id: "turn-1" });
    await vi.waitFor(async () => expect((await readRecord(memoryDir)).toolNames).toEqual(["alpha", "beta"]));

    await agent.endTurn();
    expect((await agent.send("Thanks.")).message.content).toBe("Thanks.");
  });

  it("names added and removed tools in one short notice", async () => {
    const world = await createWorld();
    world.definitions.set("def", ["alpha", "search_memory"]);
    const agent = createAgentRun({
      runId: "run-2", definitionId: "def", memoryDir: path.join(world.root, "memory", "run-2"),
      inputPreface: world.service, runtime: createRuntime(["alpha", "search_memory"], "immediate"),
    });
    world.service.runPublished(agent.run, "new");
    await settle();
    await world.save("def", ["alpha", "get_project_task", "send_message_to"]);
    expect((await agent.send("Go.")).message.content).toContain(
      "Your tools changed. Now available: get_project_task, send_message_to. No longer available: search_memory.",
    );
  });

  it("gives no notice for a save without tool changes, or a change reverted before the next input (AC-005)", async () => {
    const world = await createWorld();
    world.definitions.set("def", ["alpha"]);
    const runtime = createRuntime(["alpha"], "immediate");
    const agent = createAgentRun({
      runId: "run-3", definitionId: "def", memoryDir: path.join(world.root, "memory", "run-3"), inputPreface: world.service, runtime,
    });
    world.service.runPublished(agent.run, "new");
    await settle();
    await world.save("def", ["alpha"]);
    await world.save("def", ["alpha", "beta"]);
    await world.save("def", ["alpha"]);
    expect((await agent.send("Hello.")).message.content).toBe("Hello.");
    expect(agent.notices()).toEqual([]);
  });

  it("posts the notice at once to a busy immediate run, and keeps it pending when the post fails", async () => {
    const world = await createWorld();
    world.definitions.set("def", ["alpha"]);
    const runtime = createRuntime(["alpha"], "immediate");
    const state = { status: "running", outcome: "failed" as "failed" | "forwarded" };
    const posted: AgentInputUserMessage[] = [];
    const published: AgentRunEvent[] = [];
    const run = {
      runId: "run-busy",
      config: { agentDefinitionId: "def", memoryDir: null },
      getStatusSnapshot: () => ({ status: state.status }),
      getToolNames: runtime.getToolNames,
      applyDefinitionTools: runtime.applyDefinitionTools,
      publishEvent: vi.fn(async (value: AgentRunEvent) => { published.push(value); }),
      postUserMessage: vi.fn(async (message: AgentInputUserMessage, opts: { lifecycleObserver?: (fact: AgentRunInputLifecycle) => void }) => {
        posted.push(message);
        queueMicrotask(() => opts.lifecycleObserver?.(state.outcome === "forwarded"
          ? { kind: "forwarded", turnId: "turn-9" } as AgentRunInputLifecycle
          : { kind: "failed", error: "down" } as unknown as AgentRunInputLifecycle));
        return { accepted: true };
      }),
    } as unknown as AgentRun;
    world.service.runPublished(run, "new");
    await settle();

    await world.save("def", ["alpha", "beta"]);
    await vi.waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0]!.senderType).toBe(SenderType.SYSTEM);
    expect(posted[0]!.content).toContain("Now available: beta.");
    await settle();
    expect(published).toEqual([]);
    // Still pending: the next input carries it.
    expect(await world.service.takePreface(run, { dispatchKind: "start_turn" })).not.toBeNull();
  });

  it("waits for a turn start on a reopen runtime: an append carries nothing, the turn start carries the notice", async () => {
    const world = await createWorld();
    world.definitions.set("def", ["alpha"]);
    const runtime = createRuntime(["alpha"], "on_next_turn");
    const agent = createAgentRun({
      runId: "run-codex", definitionId: "def", memoryDir: path.join(world.root, "memory", "run-codex"),
      inputPreface: world.service, runtime, activeTurnAppend: true,
    });
    world.service.runPublished(agent.run, "new");
    await settle();
    expect((await agent.send("Start working.")).kind).toBe("start_turn");

    await world.save("def", ["alpha", "beta"]);
    const append = await agent.send("Also check this.");
    expect(append.kind).toBe("append_to_active_turn");
    expect(append.message.content).toBe("Also check this.");
    expect(runtime.has).toEqual(["alpha"]);

    await agent.endTurn();
    const start = await agent.send("Now use beta.");
    expect(start.kind).toBe("start_turn");
    expect(start.message.content).toContain("Now available: beta.");
    expect(runtime.has).toEqual(["alpha", "beta"]);
  });

  it("tells a restored run what changed since it last ran, and records a restored run without a record silently (AC-006)", async () => {
    const world = await createWorld();
    const memoryDir = path.join(world.root, "memory", "run-restored");
    mkdirSync(memoryDir, { recursive: true });
    await fs.writeFile(path.join(memoryDir, SEEN_TOOL_NAMES_FILE_NAME), JSON.stringify({ version: 1, toolNames: ["alpha"] }));
    const restored = createAgentRun({
      runId: "run-restored", definitionId: "def", memoryDir, inputPreface: world.service,
      runtime: createRuntime(["alpha", "beta"], "immediate"),
    });
    world.service.runPublished(restored.run, "restore");
    expect((await restored.send("Back again.")).message.content).toContain("Now available: beta.");

    const legacyDir = path.join(world.root, "memory", "run-legacy");
    const legacy = createAgentRun({
      runId: "run-legacy", definitionId: "def", memoryDir: legacyDir, inputPreface: world.service,
      runtime: createRuntime(["alpha", "beta"], "immediate"),
    });
    world.service.runPublished(legacy.run, "restore");
    expect((await legacy.send("Hello.")).message.content).toBe("Hello.");
    await vi.waitFor(async () => expect((await readRecord(legacyDir)).toolNames).toEqual(["alpha", "beta"]));
  });

  it("re-reads each tracked run's own definition, skips a missing one, and coalesces a burst of changes", async () => {
    const world = await createWorld();
    world.definitions.set("def-a", ["alpha"]);
    world.definitions.set("def-b", ["alpha"]);
    const runtimeA = createRuntime(["alpha"], "immediate");
    const runtimeB = createRuntime(["alpha"], "immediate");
    const a = createAgentRun({ runId: "run-a", definitionId: "def-a", memoryDir: null, inputPreface: world.service, runtime: runtimeA });
    const b = createAgentRun({ runId: "run-b", definitionId: "def-b", memoryDir: null, inputPreface: world.service, runtime: runtimeB });
    world.service.runPublished(a.run, "new");
    world.service.runPublished(b.run, "new");
    await settle();

    world.definitions.set("def-a", ["alpha", "beta"]);
    world.definitions.delete("def-b");
    for (let index = 0; index < 10; index += 1) world.signal.notifyChanged();
    await world.service.onDefinitionsChanged();
    expect(runtimeA.applyCalls).toBeLessThanOrEqual(2);
    expect(runtimeA.has).toEqual(["alpha", "beta"]);
    expect(runtimeB.applyCalls).toBe(0);
    expect(world.reads).toHaveBeenCalledWith("def-b");
  });

  it("stops applying once a run is released", async () => {
    const world = await createWorld();
    world.definitions.set("def", ["alpha"]);
    const runtime = createRuntime(["alpha"], "immediate");
    const agent = createAgentRun({ runId: "run-gone", definitionId: "def", memoryDir: null, inputPreface: world.service, runtime });
    world.service.runPublished(agent.run, "new");
    await settle();
    world.service.runReleased(agent.run);
    await world.save("def", ["alpha", "beta"]);
    expect(runtime.applyCalls).toBe(0);
  });
});

describe("AgentRunPlatformNotices: tool list and skill notices behind one slot", () => {
  const skillWorld = async (root: string) => {
    const skillDir = path.join(root, "skills", "code-review");
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(path.join(skillDir, "SKILL.md"), "v1");
    const skills: SkillUpdateNotices = createSkillUpdateNotices({
      agentDefinitionService: { getAgentDefinitionById: async (id: string) => ({ id }) as never },
      skillService: { resolveConfiguredSkillsForAgent: () => [{ name: "code-review", rootPath: skillDir }] as never },
      createWatch: () => ({ on: () => undefined, close: async () => undefined }),
    });
    closers.push(() => skills.close());
    return { skills, skillDir };
  };

  it("keeps the skill notice unchanged behind the composite", async () => {
    const world = await createWorld();
    world.definitions.set("def", ["alpha"]);
    const { skills, skillDir } = await skillWorld(world.root);
    const notices = new AgentRunPlatformNotices([world.service, skills.service]);
    const memoryDir = path.join(world.root, "memory", "run-skill");
    const agent = createAgentRun({
      runId: "run-skill", definitionId: "def", memoryDir, inputPreface: notices, runtime: createRuntime(["alpha"], "immediate"),
    });
    notices.runPublished(agent.run, "new");
    await skills.tracker.whenTracked("run-skill");
    await settle();

    await fs.writeFile(path.join(skillDir, "SKILL.md"), "v2");
    await skills.service.onSkillFoldersChanged([skillDir]);
    const sent = await agent.send("Review PR 12.");
    expect(sent.message.content.startsWith("[Platform notice — skill updated]")).toBe(true);
    expect(sent.message.content.endsWith("\n\nReview PR 12.")).toBe(true);
    await vi.waitFor(() => expect(agent.notices()).toHaveLength(1));
    expect(agent.notices()[0]!.payload).toMatchObject({ sender_id: SKILL_UPDATE_NOTICE_SENDER_ID, turn_id: "turn-1" });
  });

  it("carries one notice per input: tools first, the skill notice with the next input (DEC-006)", async () => {
    const world = await createWorld();
    world.definitions.set("def", ["alpha"]);
    const { skills, skillDir } = await skillWorld(world.root);
    const notices = new AgentRunPlatformNotices([world.service, skills.service]);
    const agent = createAgentRun({
      runId: "run-both", definitionId: "def", memoryDir: path.join(world.root, "memory", "run-both"),
      inputPreface: notices, runtime: createRuntime(["alpha"], "immediate"),
    });
    notices.runPublished(agent.run, "new");
    await skills.tracker.whenTracked("run-both");
    await settle();

    await fs.writeFile(path.join(skillDir, "SKILL.md"), "v2");
    await skills.service.onSkillFoldersChanged([skillDir]);
    await world.save("def", ["alpha", "beta"]);

    const first = await agent.send("One.");
    expect(first.message.content.startsWith(TOOL_LIST_UPDATE_NOTICE_HEADER)).toBe(true);
    expect(first.message.content).not.toContain("skill updated");
    await agent.endTurn();
    const second = await agent.send("Two.");
    expect(second.message.content.startsWith("[Platform notice — skill updated]")).toBe(true);
    await agent.endTurn();
    expect((await agent.send("Three.")).message.content).toBe("Three.");
    await vi.waitFor(() => expect(agent.notices().map((event) => event.payload.sender_id))
      .toEqual([TOOL_LIST_UPDATE_NOTICE_SENDER_ID, SKILL_UPDATE_NOTICE_SENDER_ID]));
  });

  it("settles only the source that gave the notice, and keeps going past a failing source", async () => {
    const failing = {
      takePreface: vi.fn(async () => { throw new Error("source down"); }),
      prefaceDelivered: vi.fn(), prefaceReturned: vi.fn(),
      runPublished: vi.fn(() => { throw new Error("observer down"); }), runReleased: vi.fn(),
    };
    const giving = {
      takePreface: vi.fn(async () => ({ id: "p-1", text: "notice", presentation: { senderId: "s", content: "notice" } })),
      prefaceDelivered: vi.fn(), prefaceReturned: vi.fn(), runPublished: vi.fn(), runReleased: vi.fn(),
    };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const notices = new AgentRunPlatformNotices([failing, giving]);
    const run = { runId: "run-x" } as AgentRun;
    notices.runPublished(run, "new");
    expect(giving.runPublished).toHaveBeenCalledWith(run, "new");
    const preface = await notices.takePreface(run, { dispatchKind: "start_turn" });
    expect(preface?.id).toBe("p-1");
    notices.prefaceReturned(run, preface!);
    expect(giving.prefaceReturned).toHaveBeenCalledOnce();
    expect(failing.prefaceReturned).not.toHaveBeenCalled();
    notices.prefaceDelivered(run, preface!, "turn-1");
    expect(giving.prefaceDelivered).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
