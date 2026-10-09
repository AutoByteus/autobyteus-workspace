import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { CollaborationStreamServerMessageSchema, type CollaborationStreamServerMessage } from "@autobyteus/collaboration-stream-contracts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentOrgStreamHandler } from "../../../src/services/agent-streaming/agent-org-stream-handler.js";
import { projectAgentOrgConfiguredAgentNode, projectAgentOrgConfiguredTeamNode } from "../../../src/agent-org-execution/services/agent-org-runtime-config-projector.js";
import type { TeamRunAgentTeamNode } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { AgentOrgRun } from "../../../src/agent-org-execution/domain/agent-org-run.js";
import type { AgentOrgRunEvent } from "../../../src/agent-org-execution/domain/agent-org-run-event.js";
import { RootTeamExecutionDirectory } from "../../../src/agent-collaboration/execution/backends/root-team-execution-directory.js";
import { RootAgentExecutionRegistry } from "../../../src/agent-collaboration/execution/backends/root-agent-execution-registry.js";
import { AgentOrgRunPersistenceCoordinator } from "../../../src/agent-org-execution/services/agent-org-run-persistence-coordinator.js";
import { AgentOrgRunExecutionTreeStore } from "../../../src/run-history/store/agent-org-run-execution-tree-store.js";
import { AgentOrgCommunicationMessagesV1Store } from "../../../src/agent-org-execution/persistence/agent-org-communication-messages-v1-store.js";
import { AgentOrgExecutionIndex } from "../../../src/agent-org-execution/services/agent-org-execution-index.js";
import { FlatTeamExecutionFactory } from "../../../src/agent-team-execution/local/flat-team-execution-factory.js";
import type { FlatTeamExecutionCallbacks } from "../../../src/agent-team-execution/local/flat-team-execution-callbacks.js";
import { RootEventPublisher } from "../../../src/agent-collaboration/execution/services/root-event-publisher.js";
import { createAgentOrgRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { InMemoryTaskExecutionResources } from "../../fixtures/task-execution-resource-fixtures.js";
import type { TaskExecutionIdleTimers } from "../../../src/agent-collaboration/execution/task/task-execution-idle-shutdown-schedule.js";
import { TokenUsageMigrationReadiness } from "../../../src/token-usage/providers/token-usage-migration-readiness.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgTeamNode } from "../../fixtures/current-agent-org-run-fixtures.js";
import { flushMicrotasks, observeConfiguredHandles } from "./helpers/task-publication-handles.js";
import { AgentRunEventType } from "../../../src/agent-execution/domain/agent-run-event.js";
import { buildBackgroundTaskUpdatedPayload, type AgentBackgroundTaskStatus } from "../../../src/agent-execution/domain/agent-background-task.js";

const directories: string[] = [];
afterEach(async () => { vi.restoreAllMocks(); await Promise.all(directories.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true }))); });

/** Controllable clock for the idle grace period. */
const manualTimers = () => {
  const pending = new Map<number, { callback: () => void; delayMs: number }>();
  let next = 0;
  const timers: TaskExecutionIdleTimers = {
    setTimeout: (callback, delayMs) => { const id = ++next; pending.set(id, { callback, delayMs }); return id; },
    clearTimeout: (handle) => { pending.delete(handle as number); },
  };
  return {
    timers,
    pendingCount: () => pending.size,
    delays: () => [...pending.values()].map((entry) => entry.delayMs),
    fireAll: () => { const due = [...pending.values()]; pending.clear(); due.forEach((entry) => entry.callback()); },
  };
};

const buildOrg = async (kind: "agent" | "team") => {
  vi.spyOn(TokenUsageMigrationReadiness.prototype, "assertCurrentSchemaReady").mockImplementation(() => undefined);
  const handles = observeConfiguredHandles();
  const root = createAgentOrgRootExecutionIdentity(`org-idle-shutdown-${kind}`);
  const orgMemoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "org-idle-shutdown-")); directories.push(orgMemoryDir);
  const tree = testAgentOrgExecutionTree({ orgRunId: root.rootRunId, members: [
    testOrgAgentNode("/director", "director"), testOrgAgentNode("/worker", "configured-worker"),
    testOrgTeamNode({ address: "/target", teamRunId: "configured-team", coordinatorAddress: "/target/lead",
      members: [testOrgAgentNode("/target/lead", "configured-lead")] }),
  ] });
  const messages = { schemaVersion: 1 as const, subjectKind: "agent_org" as const, orgRunId: root.rootRunId, messages: [] };
  const executionTreeStore = new AgentOrgRunExecutionTreeStore();
  const failStop = vi.fn();
  const persistence = new AgentOrgRunPersistenceCoordinator({ orgRunId: root.rootRunId, orgMemoryDir,
    executionTreeStore, communicationStore: new AgentOrgCommunicationMessagesV1Store(), enterPersistenceFailStop: failStop });
  await persistence.commitInitial({ tree, messages });
  let run: AgentOrgRun | undefined;
  const callbacks: FlatTeamExecutionCallbacks = {
    buildMemberExecutionContext: vi.fn(async () => ({} as never)), commitPlatformBindingChange: vi.fn(),
    publishAgentEvent: (identity, event) => run?.onAgentExecutionEvent(identity, event),
  };
  const rootAgents = new RootAgentExecutionRegistry({ root, callbacks });
  const teams = new RootTeamExecutionDirectory(new FlatTeamExecutionFactory());
  for (const member of tree.rootOrg.members) {
    if ("agentRunId" in member) {
      (await rootAgents.prepareConfigured(projectAgentOrgConfiguredAgentNode(member), "fresh")).commitAfterDurability();
    } else {
      (await teams.prepareConfigured({ teamNode: projectAgentOrgConfiguredTeamNode(member), handoffs: [],
        physicalScope: { root, ancestorTeamRunIds: [member.teamRunId] }, callbacks, activationMode: "fresh" })).commitAfterDurability();
    }
  }
  const publisher = new RootEventPublisher<AgentOrgRunEvent>();
  const published: AgentOrgRunEvent[] = [];
  publisher.subscribe(({ event }) => published.push(event));
  const clock = manualTimers();
  const inspect = vi.fn(() => ({ kind: "present" as const }));
  let allocation = 0;
  run = new AgentOrgRun({ root, tree, messages, rootAgents, teams, callbacks, persistence, publisher,
    taskExecutionIdentity: {
      agentRuns: { allocateForAgentDefinition: async () => `task-agent-${++allocation}` },
      taskTeams: { create: async ({ source }: { source: TeamRunAgentTeamNode }) => {
        const id = `task-team-${++allocation}`;
        return { teamNode: { ...source, teamRunId: id,
          children: source.children.map((child) => ({ ...child, agentRunId: `${id}-lead`, platformAgentRunId: null })) } };
      } },
    } as never,
    activityInspector: { inspect } as never,
    taskExecutionIdleShutdown: { gracePeriodMs: () => 600_000, timers: clock.timers },
    taskExecutionResources: new InMemoryTaskExecutionResources(),
  });
  run.activate();
  const owner = run;
  const lifecycle = (owner as unknown as { taskExecutions: { drain(): Promise<void> } }).taskExecutions;
  const drain = async () => {
    for (let i = 0; i < 3; i += 1) { await flushMicrotasks(); await lifecycle.drain(); }
  };
  return { handles, root, orgMemoryDir, executionTreeStore, failStop, rootAgents, teams, published, clock, inspect, owner, drain };
};

describe("Org-root delegated executions: pure spawn, idle shutdown, and wake-on-message", () => {
  it.each(["agent", "team"] as const)("spawns a %s with one tree write, shuts it down after the grace period, and restores it on a message", async (kind) => {
    const f = await buildOrg(kind);
    const director = { identity: f.handles.get("director")!.input.identity };
    const wire: CollaborationStreamServerMessage[] = [];
    const stream = new AgentOrgStreamHandler({ getActive: () => f.owner, recordRunActivity: vi.fn() });
    const session = await stream.connect({ send: (raw) => wire.push(CollaborationStreamServerMessageSchema.parse(JSON.parse(raw))), close: vi.fn() }, f.root.rootRunId);
    expect(session).toBeTruthy();
    const treeWrites = vi.spyOn(f.executionTreeStore, "write");

    const delegated = await f.owner.delegateTask(director, { recipient_address: kind === "agent" ? "/worker" : "/target", description: "Complete the task" });
    const childId = kind === "agent" ? "task-agent-1" : "task-team-1-lead";
    expect(delegated).toEqual({ target_agent_run_id: childId, target_kind: kind === "agent" ? "agent" : "team", task_id: expect.stringMatching(/^ad_hoc_task_/) });
    await f.drain();

    // One durable tree write carries the execution and its delegator; no records sidecar exists.
    expect(treeWrites).toHaveBeenCalledOnce();
    const durable = (await f.executionTreeStore.read(f.orgMemoryDir, f.root.rootRunId))!;
    const reference = kind === "agent" ? { agentRunId: childId } : { teamRunId: "task-team-1" };
    expect(new AgentOrgExecutionIndex(durable).getTaskExecution(reference)!.source).toMatchObject({ delegatorAgentRunId: "director" });
    expect(new AgentOrgExecutionIndex(durable).getTaskExecution(reference)!.source).not.toHaveProperty("settledAt");
    expect(await fs.readdir(f.orgMemoryDir)).not.toContain("agent_org_task_delegation_records.json");
    expect(f.published[0]).toMatchObject({ kind: "task_execution_started", host: { hostKind: "root", hostRunId: f.root.rootRunId }, taskExecution: reference });
    const child = f.handles.get(childId)!;
    expect(child.handle.postMessage).toHaveBeenCalledOnce();

    // idle arms, running cancels, idle re-arms with the configured grace read at arm time.
    child.emit("idle");
    expect(f.clock.pendingCount()).toBe(1);
    child.emit("running");
    expect(f.clock.pendingCount()).toBe(0);
    child.emit("idle");
    expect(f.clock.delays()).toEqual([600_000]);

    const firstHandle = child.handle;
    f.clock.fireAll();
    await f.drain();
    expect(child.finish).toHaveBeenCalledOnce();
    expect(child.commit).toHaveBeenCalledOnce();
    // Shutdown keeps the execution in the tree and on screen: it is simply offline.
    const afterShutdown = (await f.executionTreeStore.read(f.orgMemoryDir, f.root.rootRunId))!;
    expect(new AgentOrgExecutionIndex(afterShutdown).getTaskExecution(reference)).not.toBeNull();
    expect(f.owner.hasAgentExecution(childId)).toBe(true);
    expect(f.owner.getAgentStatusSnapshots().find((entry) => entry.execution.agentRunId === childId)!.details.status).toBe("offline");
    // AR-005: a task Agent's handle stays registered with no active run; a task Team is unregistered.
    if (kind === "agent") {
      expect(f.rootAgents.get(childId)).toBe(firstHandle);
      expect(f.rootAgents.isTaskLive(childId)).toBe(false);
    } else expect(f.teams.get("task-team-1")).toBeNull();
    expect(f.owner.hasOpenExecutionWork()).toBe(false);

    // A message to the run ID restores the child with its conversation and then delivers.
    const delivered = await f.owner.deliverExactAgentMessage({
      sender: { kind: "agent", identity: director.identity, displayName: "director" },
      targetAgentRunId: childId,
      content: "Follow-up question",
    });
    expect(delivered).toMatchObject({ accepted: true });
    await f.drain();
    expect(f.inspect).toHaveBeenCalled();
    const restored = f.handles.get(childId)!;
    if (kind === "agent") {
      // The retained handle is re-activated in restore mode inside the lease, before input.
      expect(restored.handle).toBe(firstHandle);
      expect(restored.handle.getOrCreateAgentRun).toHaveBeenCalled();
      expect(f.rootAgents.isTaskLive(childId)).toBe(true);
    } else {
      expect(restored.handle).not.toBe(firstHandle);
      expect(f.teams.get("task-team-1")).not.toBeNull();
    }
    expect(restored.handle.reserveInput).toHaveBeenCalledOnce();
    // Release after delivery arms the idle timer again for the restored child.
    restored.emit("idle");
    expect(f.clock.pendingCount()).toBeGreaterThan(0);

    expect(wire.some((frame) => frame.type === "ERROR")).toBe(false);
    stream.disconnect(session!);
    expect(f.failStop).not.toHaveBeenCalled();
    expect(f.owner.isActive()).toBe(true);
  });

  it("rejects wake with TASK_EXECUTION_CONTEXT_UNAVAILABLE when the saved conversation is missing", async () => {
    const f = await buildOrg("agent");
    const director = { identity: f.handles.get("director")!.input.identity };
    await f.owner.delegateTask(director, { recipient_address: "/worker", description: "Complete the task" });
    await f.drain();
    f.handles.get("task-agent-1")!.emit("idle");
    f.clock.fireAll();
    await f.drain();
    f.inspect.mockReturnValue({ kind: "absent" } as never);
    const created = f.handles.size;

    await expect(f.owner.deliverExactAgentMessage({
      sender: { kind: "agent", identity: director.identity, displayName: "director" },
      targetAgentRunId: "task-agent-1",
      content: "Anyone there?",
    })).resolves.toMatchObject({ accepted: false, code: "TASK_EXECUTION_CONTEXT_UNAVAILABLE" });
    expect(f.handles.size).toBe(created);
    // The retained handle is not re-activated when its saved conversation is unavailable.
    expect(f.rootAgents.isTaskLive("task-agent-1")).toBe(false);
    expect(f.handles.get("task-agent-1")!.handle.getOrCreateAgentRun).not.toHaveBeenCalled();
    expect(f.owner.isActive()).toBe(true);
  });

  it.each(["agent", "team"] as const)("treats an errored delegated %s as quiet: no root open work, shut down after the grace period (AC-015)", async (kind) => {
    const f = await buildOrg(kind);
    const director = { identity: f.handles.get("director")!.input.identity };
    await f.owner.delegateTask(director, { recipient_address: kind === "agent" ? "/worker" : "/target", description: "Complete the task" });
    await f.drain();
    const childId = kind === "agent" ? "task-agent-1" : "task-team-1-lead";
    const child = f.handles.get(childId)!;
    f.handles.get("director")!.emit("idle");

    child.emit("running");
    expect(f.owner.hasOpenExecutionWork()).toBe(true);
    expect(f.clock.pendingCount()).toBe(0);

    // The failed turn leaves the child in error: it holds no open work and the grace countdown arms.
    child.emit("error");
    expect(f.owner.hasOpenExecutionWork()).toBe(false);
    expect(f.owner.getExecutionCheckpoint().hasOpenExecutionWork).toBe(false);
    expect(f.clock.delays()).toEqual([600_000]);

    f.clock.fireAll();
    await f.drain();
    expect(child.finish).toHaveBeenCalledOnce();
    expect(f.owner.hasAgentExecution(childId)).toBe(true);
    expect(f.owner.getAgentStatusSnapshots().find((entry) => entry.execution.agentRunId === childId)!.details.status).toBe("offline");
    expect(f.owner.hasOpenExecutionWork()).toBe(false);

    // Configured members keep their own predicate: an errored configured member is still open work.
    f.handles.get("configured-worker")!.emit("error");
    expect(f.owner.hasOpenExecutionWork()).toBe(true);
  });

  it.each(["agent", "team"] as const)("keeps a delegated %s with a running background task past the grace period; the task's end re-arms it (AC-002/003/004)", async (kind) => {
    const f = await buildOrg(kind);
    const director = { identity: f.handles.get("director")!.input.identity };
    await f.owner.delegateTask(director, { recipient_address: kind === "agent" ? "/worker" : "/target", description: "Start the dev server" });
    await f.drain();
    const childId = kind === "agent" ? "task-agent-1" : "task-team-1-lead";
    const child = f.handles.get(childId)!;
    const backgroundTask = (status: AgentBackgroundTaskStatus) => child.input.callbacks.publishAgentEvent(child.input.identity, {
      kind: "agent_run", event: { eventType: AgentRunEventType.BACKGROUND_TASK_UPDATED, runId: childId, statusHint: null,
        payload: buildBackgroundTaskUpdatedPayload({ taskId: "bg-1", kind: "shell", description: "python3 -m http.server",
          command: "python3 -m http.server", status, summary: null, startedAt: "2026-10-08T07:41:00.000Z" }) },
    });
    // While the task runs, the runtime's quiet check refuses (AgentRunTermination with hasRunningBackgroundTasks()).
    let backgroundRunning = true;
    const quietWhenIdle = child.handle.tryPrepareTerminationIfQuiescent.getMockImplementation()!;
    child.handle.tryPrepareTerminationIfQuiescent.mockImplementation(async () => backgroundRunning ? null : quietWhenIdle());

    backgroundTask("running");
    child.emit("idle");
    expect(f.clock.pendingCount()).toBe(1);
    f.clock.fireAll();
    await f.drain();
    // Not shut down, and no timer: no time limit while the task runs; a "running" update arms nothing.
    expect(child.finish).not.toHaveBeenCalled();
    expect(f.clock.pendingCount()).toBe(0);
    backgroundTask("running");
    expect(f.clock.pendingCount()).toBe(0);

    // The task ends without a following turn: the grace period starts again and the quiet copy is shut down.
    backgroundRunning = false;
    backgroundTask("completed");
    expect(f.clock.delays()).toEqual([600_000]);
    f.clock.fireAll();
    await f.drain();
    expect(child.finish).toHaveBeenCalledOnce();
    expect(f.owner.getAgentStatusSnapshots().find((entry) => entry.execution.agentRunId === childId)!.details.status).toBe("offline");
  });

  it("disposes pending idle timers when the root terminates", async () => {
    const f = await buildOrg("agent");
    const director = { identity: f.handles.get("director")!.input.identity };
    await f.owner.delegateTask(director, { recipient_address: "/worker", description: "Complete the task" });
    await f.drain();
    f.handles.get("task-agent-1")!.emit("idle");
    expect(f.clock.pendingCount()).toBe(1);

    await expect(f.owner.terminate()).resolves.toEqual({ accepted: true });
    expect(f.clock.pendingCount()).toBe(0);
  });
});
