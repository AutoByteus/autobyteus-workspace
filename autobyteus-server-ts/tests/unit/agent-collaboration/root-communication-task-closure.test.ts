import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createCollaborationMemberExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { RootEventPublisher } from "../../../src/agent-collaboration/execution/services/root-event-publisher.js";
import type { AgentOperationResult } from "../../../src/agent-execution/domain/agent-operation-result.js";
import { AgentConversationActivityInspector } from "../../../src/agent-memory/services/agent-conversation-activity-inspector.js";
import { AgentOrgCommunicationMessagesStore } from "../../../src/agent-org-execution/persistence/agent-org-communication-messages-store.js";
import { AgentOrgRunMessageDelivery } from "../../../src/agent-org-execution/services/agent-org-run-message-delivery.js";
import { TeamRunEventSourceType } from "../../../src/agent-team-execution/domain/team-run-event.js";
import type { RunPackageFileWriteResult } from "../../../src/run-history/store/atomic-run-package-file-commit-writer.js";
import { TeamCommunicationStore } from "../../../src/services/team-communication/team-communication-store.js";
import { StandaloneRootPackageStore } from "../../../src/standalone-agent-run-root/persistence/standalone-root-package-store.js";
import { StandaloneRootMessageDelivery } from "../../../src/standalone-agent-run-root/services/standalone-root-message-delivery.js";
import { InMemoryTaskExecutionResources, ingressOfOutcome } from "../../fixtures/task-execution-resource-fixtures.js";
import { flushMicrotasks } from "../agent-org-execution/helpers/task-publication-handles.js";
import { buildOrg, cleanupDirectories as cleanupOrgDirectories } from "../agent-org-execution/helpers/org-collaborator-harness.js";
import { cleanupDirectories as cleanupTeamDirectories, harness as teamHarness } from "../agent-team-execution/helpers/team-root-collaborator-harness.js";
import { HOST, buildManager, cleanupDirectories as cleanupStandaloneDirectories } from "../standalone-agent-run-root/helpers/standalone-root-harness.js";

/**
 * REQ-012 / DEC-005 through each real root (standalone, AgentOrg, Team): its port, its real persistence
 * coordinator and its on-disk message logs (agent-input-delivery-simplification V-4). The recipient is a copy
 * delegated for Task A; a second copy for Task B proves the root keeps writing. Each recipient slot is the
 * test's own, so every step on it is visible.
 */
type Slot = Readonly<{ cancel: ReturnType<typeof vi.fn>; commit: ReturnType<typeof vi.fn>; release: ReturnType<typeof vi.fn> }>;
type RootSubject = Readonly<{
  /** The store class and method that append a message to the root's logs. */
  appendStore: Readonly<{ prototype: object; method: string }>;
  copyRunId: string;
  closeTaskA(): void;
  /** Releases Task A's executions as a DONE Task does: the copy's runtime is force-released (its slot dropped). */
  releaseTaskA(): Promise<void>;
  holdSlot(options?: { commitError?: Error; dropped?: boolean }): Slot;
  send(content: string): Promise<AgentOperationResult>;
  sendToTaskB(content: string): Promise<AgentOperationResult>;
  rootViewMessages(): string[];
  failStopped(): boolean;
  isActive(): boolean;
  failNextPresentation(error: Error): void;
  persistedContents(): Promise<string[]>;
}>;

/** The message contents in every message log under a root directory (log lines are JSON objects). */
const logContents = async (dir: string): Promise<string[]> => {
  const contents: string[] = [];
  const walk = async (current: string): Promise<void> => {
    for (const entry of (await fs.readdir(current, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) { await walk(full); continue; }
      if (!entry.name.endsWith(".jsonl")) continue;
      for (const line of (await fs.readFile(full, "utf8")).split("\n").filter(Boolean)) {
        const content = (JSON.parse(line) as { content?: unknown }).content;
        if (typeof content === "string") contents.push(content);
      }
    }
  };
  await walk(dir);
  return [...new Set(contents)];
};

const slotFor = (handle: { reserveInput: ReturnType<typeof vi.fn> }, agentRunId: string, options: { commitError?: Error; dropped?: boolean } = {}): Slot => {
  const release = vi.fn();
  const slot = {
    release,
    cancel: vi.fn(() => { if (options.dropped) throw new Error("AgentRun input reservation '2' cannot be cancelled."); }),
    commit: vi.fn(() => { if (options.commitError) throw options.commitError; return { release }; }),
  };
  handle.reserveInput.mockImplementationOnce(async () => ({ reserved: true as const, reservation: { agentRunId, cancel: slot.cancel, commit: slot.commit } }));
  return slot;
};

const standalone = async (): Promise<RootSubject> => {
  const resources = new InMemoryTaskExecutionResources();
  resources.addTask("A");
  resources.addTask("B");
  const f = await buildManager(resources);
  const root = (await f.manager.resolveRoot(HOST))!;
  const views: string[] = [];
  root.subscribeToEvents(({ event }) => { if (event.kind === "communication") views.push(event.message.content); });
  const copyRunId = ingressOfOutcome(await root.delegateToNewCopy({ identity: f.hostIdentity }, { recipient_address: "/code_reviewer", task_id: "A" }));
  const otherRunId = ingressOfOutcome(await root.delegateToNewCopy({ identity: f.hostIdentity }, { recipient_address: "/lead", task_id: "B" }));
  await flushMicrotasks();
  const failStop = vi.spyOn(root, "enterPersistenceFailStop");
  const sender = { kind: "agent" as const, identity: f.hostIdentity, displayName: "research_assistant" };
  return {
    appendStore: { prototype: StandaloneRootPackageStore.prototype, method: "appendMessage" },
    copyRunId,
    closeTaskA: () => { resources.close("A"); },
    releaseTaskA: async () => { await root.releaseTaskExecutions(resources.close("A")); },
    holdSlot: (options) => slotFor(f.handles.get(copyRunId)!.handle as never, copyRunId, options),
    send: (content) => root.deliverExactAgentMessage({ sender, targetAgentRunId: copyRunId, content }),
    sendToTaskB: (content) => root.deliverExactAgentMessage({ sender, targetAgentRunId: otherRunId, content }),
    rootViewMessages: () => views,
    failStopped: () => failStop.mock.calls.length > 0,
    isActive: () => root.isActive(),
    failNextPresentation: (error) => {
      vi.spyOn(StandaloneRootMessageDelivery.prototype, "presentCommittedCommunication").mockImplementationOnce(() => { throw error; });
    },
    persistedContents: () => logContents(f.memoryDir),
  };
};

const org = async (): Promise<RootSubject> => {
  const o = await buildOrg();
  o.resources.addTask("A");
  o.resources.addTask("B");
  const views: string[] = [];
  o.publisher.subscribe(({ event }) => { if (event.kind === "communication") views.push(event.message.content); });
  const director = createCollaborationMemberExecutionIdentity({ root: o.root, memberAddress: "/director", agentRunId: "director" });
  const copyRunId = ingressOfOutcome(await o.owner.delegateToNewCopy({ identity: director }, { recipient_address: "/code_reviewer", task_id: "A" }));
  const otherRunId = ingressOfOutcome(await o.owner.delegateToNewCopy({ identity: director }, { recipient_address: "/code_reviewer", task_id: "B" }));
  await flushMicrotasks();
  const sender = { kind: "agent" as const, identity: director, displayName: "director" };
  return {
    appendStore: { prototype: AgentOrgCommunicationMessagesStore.prototype, method: "appendMessage" },
    copyRunId,
    closeTaskA: () => { o.resources.close("A"); },
    releaseTaskA: async () => { await o.owner.releaseTaskExecutions(o.resources.close("A")); },
    holdSlot: (options) => slotFor(o.handles.get(copyRunId)!.handle as never, copyRunId, options),
    send: (content) => o.owner.deliverExactAgentMessage({ sender, targetAgentRunId: copyRunId, content }),
    sendToTaskB: (content) => o.owner.deliverExactAgentMessage({ sender, targetAgentRunId: otherRunId, content }),
    rootViewMessages: () => views,
    failStopped: () => o.enterPersistenceFailStop.mock.calls.length > 0,
    isActive: () => o.owner.isActive(),
    failNextPresentation: (error) => {
      vi.spyOn(AgentOrgRunMessageDelivery.prototype, "presentCommittedCommunication").mockImplementationOnce(() => { throw error; });
    },
    persistedContents: () => logContents(o.orgMemoryDir),
  };
};

const team = async (): Promise<RootSubject> => {
  vi.spyOn(AgentConversationActivityInspector.prototype, "inspect").mockReturnValue({ kind: "present" } as never);
  const h = await teamHarness();
  const resources = h.dependencies.taskExecutionResources;
  resources.addTask("A");
  resources.addTask("B");
  const views: string[] = [];
  h.root.subscribeToEvents(({ event }) => {
    if (event.eventSourceType === TeamRunEventSourceType.COMMUNICATION) views.push((event.payload as { content: string }).content);
  });
  const coordinator = h.identity("/coordinator", "run-coordinator");
  const copyRunId = ingressOfOutcome(await h.root.delegateToNewCopy({ identity: coordinator }, { recipient_address: "/code_reviewer", task_id: "A" }));
  const otherRunId = ingressOfOutcome(await h.root.delegateToNewCopy({ identity: coordinator }, { recipient_address: "/code_reviewer", task_id: "B" }));
  await flushMicrotasks();
  const failStop = vi.spyOn(h.root, "enterPersistenceFailStop");
  const sender = { kind: "agent" as const, identity: coordinator, displayName: "coordinator" };
  return {
    appendStore: { prototype: TeamCommunicationStore.prototype, method: "appendMessage" },
    copyRunId,
    closeTaskA: () => { resources.close("A"); },
    releaseTaskA: async () => { await h.root.releaseTaskExecutions(resources.close("A")); },
    holdSlot: (options) => slotFor(h.handles.get(copyRunId)!.handle as never, copyRunId, options),
    send: (content) => h.root.deliverExactAgentMessage({ sender, targetAgentRunId: copyRunId, content }),
    sendToTaskB: (content) => h.root.deliverExactAgentMessage({ sender, targetAgentRunId: otherRunId, content }),
    rootViewMessages: () => views,
    failStopped: () => failStop.mock.calls.length > 0,
    isActive: () => h.root.isActive(),
    failNextPresentation: (error) => {
      const publish = RootEventPublisher.prototype.publish;
      const spy = vi.spyOn(RootEventPublisher.prototype, "publish").mockImplementation(function (this: RootEventPublisher<unknown>, event: unknown) {
        if ((event as { eventSourceType?: unknown }).eventSourceType === TeamRunEventSourceType.MEMBER_INPUT) { spy.mockRestore(); throw error; }
        return publish.call(this, event as never);
      });
    },
    persistedContents: () => logContents(h.memoryDir),
  };
};

/** Holds the next message-log append open until `finish`; the line is then really written. */
const holdNextAppend = (store: RootSubject["appendStore"]) => {
  const target = store.prototype as Record<string, (...args: unknown[]) => Promise<RunPackageFileWriteResult>>;
  const original = target[store.method]!;
  let started!: () => void;
  let finish!: () => void;
  const writeStarted = new Promise<void>((resolve) => { started = resolve; });
  const gate = new Promise<void>((resolve) => { finish = resolve; });
  vi.spyOn(target, store.method).mockImplementationOnce(async function (this: unknown, ...args: unknown[]) {
    started();
    await gate;
    return original.apply(this, args);
  });
  return { writeStarted, finish: () => finish() };
};

const taskClosed = expect.objectContaining({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED" });

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all([cleanupStandaloneDirectories(), cleanupOrgDirectories(), cleanupTeamDirectories()]);
});

describe.each([
  ["standalone Agent root", standalone],
  ["AgentOrg root", org],
  ["Team root", team],
] as const)("message delivery through the %s", (_label, build) => {
  it("REQ-012: a Task closed during the log write gives the Task-closed refusal, keeps and shows the record, never delivers it, and the root keeps working", async () => {
    const s = await build();
    const slot = s.holdSlot();
    const write = holdNextAppend(s.appendStore);
    const delivery = s.send("Final report.");
    await write.writeStarted;
    s.closeTaskA();
    write.finish();

    await expect(delivery).resolves.toEqual(taskClosed);
    expect(s.failStopped()).toBe(false);
    expect(s.isActive()).toBe(true);
    expect(slot.commit).not.toHaveBeenCalled();
    expect(slot.release).not.toHaveBeenCalled();
    expect(slot.cancel).toHaveBeenCalledOnce();
    expect(await s.persistedContents()).toContain("Final report.");
    expect(s.rootViewMessages()).toEqual(["Final report."]);

    await expect(s.sendToTaskB("Later work.")).resolves.toMatchObject({ accepted: true });
    expect(await s.persistedContents()).toEqual(expect.arrayContaining(["Final report.", "Later work."]));
    expect(s.failStopped()).toBe(false);
  });

  it("REQ-012: a recipient that stopped accepting input during the write gets AGENT_RUN_NOT_ACCEPTING_INPUT, not a fail-stop", async () => {
    const s = await build();
    const slot = s.holdSlot({ commitError: new Error("AgentRun input reservation '1' cannot be committed.") });
    await expect(s.send("Final report.")).resolves.toEqual({
      accepted: false, code: "AGENT_RUN_NOT_ACCEPTING_INPUT", message: "AgentRun is not accepting input.",
    });
    expect(s.failStopped()).toBe(false);
    expect(s.isActive()).toBe(true);
    expect(slot.release).not.toHaveBeenCalled();
    expect(await s.persistedContents()).toContain("Final report.");
    await expect(s.sendToTaskB("Later work.")).resolves.toMatchObject({ accepted: true });
  });

  it("DEC-005: a Task closed (and its copy released, dropping the held slot) while a message waits for the lock gives the same refusal and writes nothing", async () => {
    const s = await build();
    s.holdSlot();
    const queuedSlot = s.holdSlot({ dropped: true });
    const write = holdNextAppend(s.appendStore);
    const first = s.send("Final report.");
    await write.writeStarted;
    const queued = s.send("Queued follow-up.");
    await flushMicrotasks();
    await s.releaseTaskA();
    write.finish();

    await expect(first).resolves.toEqual(taskClosed);
    await expect(queued).resolves.toEqual(taskClosed);
    expect(queuedSlot.commit).not.toHaveBeenCalled();
    expect(s.failStopped()).toBe(false);
    expect(s.isActive()).toBe(true);
    expect(await s.persistedContents()).not.toContain("Queued follow-up.");
  });

  it("REQ-012 counterpart: a genuine failure after the write (the recipient presentation throws) still fail-stops the root", async () => {
    const s = await build();
    const slot = s.holdSlot();
    s.failNextPresentation(new Error("Controlled presentation failure"));
    await expect(s.send("Shown words.")).rejects.toThrow("Controlled presentation failure");
    expect(s.failStopped()).toBe(true);
    expect(slot.commit).toHaveBeenCalledOnce();
    expect(slot.release).toHaveBeenCalledOnce();
    expect(await s.persistedContents()).toContain("Shown words.");
  });
});
