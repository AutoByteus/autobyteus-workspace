import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { CollaborationStreamServerMessageSchema, type CollaborationStreamServerMessage } from "@autobyteus/collaboration-stream-contracts";
import { AgentOrgStreamHandler } from "../../../src/services/agent-streaming/agent-org-stream-handler.js";
import { projectAgentOrgConfiguredAgentNode, projectAgentOrgConfiguredTeamNode } from "../../../src/agent-org-execution/services/agent-org-runtime-config-projector.js";
import type { TeamRunAgentTeamNode } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentOrgRun } from "../../../src/agent-org-execution/domain/agent-org-run.js";
import type { AgentOrgRunEvent } from "../../../src/agent-org-execution/domain/agent-org-run-event.js";
import { AgentOrgTeamExecutionDirectory } from "../../../src/agent-org-execution/services/agent-org-team-execution-directory.js";
import { AgentOrgRootAgentExecutionRegistry } from "../../../src/agent-org-execution/services/agent-org-root-agent-execution-registry.js";
import { AgentOrgRunPersistenceCoordinator } from "../../../src/agent-org-execution/services/agent-org-run-persistence-coordinator.js";
import { AgentOrgRunExecutionTreeStore } from "../../../src/run-history/store/agent-org-run-execution-tree-store.js";
import { AgentOrgTaskDelegationRecordsV1Store } from "../../../src/agent-org-execution/persistence/agent-org-task-delegation-records-v1-store.js";
import { AgentOrgCommunicationMessagesV1Store } from "../../../src/agent-org-execution/persistence/agent-org-communication-messages-v1-store.js";
import { AgentOrgExecutionIndex } from "../../../src/agent-org-execution/services/agent-org-execution-index.js";
import { FlatTeamExecutionFactory } from "../../../src/agent-team-execution/local/flat-team-execution-factory.js";
import type { FlatTeamExecutionCallbacks } from "../../../src/agent-team-execution/local/flat-team-execution-callbacks.js";
import { RootEventPublisher } from "../../../src/agent-collaboration/execution/services/root-event-publisher.js";
import { createAgentOrgRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { TokenUsageMigrationReadiness } from "../../../src/token-usage/providers/token-usage-migration-readiness.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgTeamNode } from "../../fixtures/current-agent-org-run-fixtures.js";
import { flushMicrotasks, observeConfiguredHandles } from "./helpers/task-publication-handles.js";

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { resolve, promise };
};
const directories: string[] = [];
afterEach(async () => { vi.restoreAllMocks(); await Promise.all(directories.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true }))); });

describe("Org-root task publication through durable activation and idle settlement", () => {
  it.each(["agent", "team", "recursive-team"] as const)("settles accepted-but-finishing %s on its own idle event, without unrelated work", async (kind) => {
    vi.spyOn(TokenUsageMigrationReadiness.prototype, "assertCurrentSchemaReady").mockImplementation(() => undefined);
    const handles = observeConfiguredHandles();
    const root = createAgentOrgRootExecutionIdentity(`org-idle-${kind}`);
    const orgMemoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "org-idle-settlement-")); directories.push(orgMemoryDir);
    const tree = testAgentOrgExecutionTree({ orgRunId: root.rootRunId, members: [
      testOrgAgentNode("/director", "director"), testOrgAgentNode("/worker", "configured-worker"),
      testOrgTeamNode({ address: "/target", teamRunId: "configured-team", coordinatorAddress: "/target/lead",
        members: [testOrgAgentNode("/target/lead", "configured-lead")] }),
    ] });
    const tasks = { schemaVersion: 1 as const, subjectKind: "agent_org" as const, orgRunId: root.rootRunId, records: [] };
    const messages = { schemaVersion: 1 as const, subjectKind: "agent_org" as const, orgRunId: root.rootRunId, messages: [] };
    const executionTreeStore = new AgentOrgRunExecutionTreeStore();
    const taskRecordsStore = new AgentOrgTaskDelegationRecordsV1Store();
    const failStop = vi.fn();
    const persistence = new AgentOrgRunPersistenceCoordinator({ orgRunId: root.rootRunId, orgMemoryDir,
      executionTreeStore, taskRecordsStore, communicationStore: new AgentOrgCommunicationMessagesV1Store(),
      enterPersistenceFailStop: failStop });
    await persistence.commitInitial({ tree, tasks, messages });
    let run: AgentOrgRun | undefined;
    const callbacks: FlatTeamExecutionCallbacks = {
      buildMemberExecutionContext: vi.fn(async () => ({} as never)), commitPlatformBindingChange: vi.fn(),
      publishAgentEvent: (identity, event) => run?.onAgentExecutionEvent(identity, event),
    };
    const rootAgents = new AgentOrgRootAgentExecutionRegistry({ root, callbacks });
    const teams = new AgentOrgTeamExecutionDirectory(new FlatTeamExecutionFactory());
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
    let allocation = 0;
    run = new AgentOrgRun({ root, tree, tasks, messages, rootAgents, teams, callbacks, persistence, publisher,
      taskExecutionIdentity: {
        agentRuns: { allocateForAgentDefinition: async () => `task-agent-${++allocation}` },
        taskTeams: { create: async ({ source }: { source: TeamRunAgentTeamNode }) => {
          const id = `task-team-${++allocation}`;
          return { teamNode: { ...source, teamRunId: id,
            children: source.children.map((child) => ({ ...child, agentRunId: `${id}-lead`, platformAgentRunId: null })) } };
        } },
      } as never,
    });
    run.activate();
    const owner = run;
    const taskQueue = (owner as unknown as { taskEngine: { drain(): Promise<void> } }).taskEngine;
    const drain = async () => { await flushMicrotasks(); await taskQueue.drain(); await flushMicrotasks(); await taskQueue.drain(); };
    const director = { identity: handles.get("director")!.input.identity };
    const wire: CollaborationStreamServerMessage[] = [];
    const close = vi.fn();
    const stream = new AgentOrgStreamHandler({ getActive: () => owner, recordRunActivity: vi.fn() });
    const session = await stream.connect({ send: (raw) => wire.push(CollaborationStreamServerMessageSchema.parse(JSON.parse(raw))), close }, root.rootRunId);
    expect(session).toBeTruthy();
    const freshStatuses = (start: number, id: string) => wire.slice(start).flatMap((frame) => {
      if (frame.type !== "ROOT_EXECUTION_EVENT" || frame.payload.event.kind !== "agent_presentation") return [];
      const event = frame.payload.event;
      if (event.agent_run_id !== id || event.message.type !== "AGENT_STATUS") return [];
      expect(frame.payload.root_subject_kind).toBe("agent_org"); expect(frame.payload.root_run_id).toBe(root.rootRunId);
      expect(event.member_address).toBe(handles.get(id)!.input.identity.memberAddress);
      return [event.message.payload.status];
    });

    // Hold the real sidecar write's return: no activation/publication/input before complete durability.
    const written = deferred(); const release = deferred();
    const write = taskRecordsStore.write.bind(taskRecordsStore);
    vi.spyOn(taskRecordsStore, "write").mockImplementationOnce(async (...args) => {
      const result = await write(...args); written.resolve(); await release.promise; return result;
    });
    const delegation = owner.delegateTask(director, { recipient_address: kind === "agent" ? "/worker" : "/target", description: "Complete the task" });
    await written.promise;
    const parentId = kind === "agent" ? "task-agent-1" : "task-team-1-lead";
    const parent = handles.get(parentId)!;
    expect(published).toEqual([]); expect(parent.handle.postMessage).not.toHaveBeenCalled();
    expect((await taskRecordsStore.read(orgMemoryDir, root.rootRunId))!.records).toHaveLength(1);
    expect(teams.list().map((team) => team.teamRunId)).toEqual(["configured-team"]);
    release.resolve(); const delegated = await delegation;
    expect(delegated.status).toBe("active"); if (delegated.status !== "active") throw new Error("Not activated");
    await drain();
    expect(published[0]).toMatchObject({ kind: "task", event: { kind: "activated" } });
    expect(parent.handle.postMessage).toHaveBeenCalledOnce();
    expect(published.filter((e) => e.kind === "agent_presentation" && e.execution.agentRunId === parentId)).toHaveLength(3);
    const afterRelease = wire.length;
    parent.emit("idle"); parent.emit("running");
    expect(freshStatuses(afterRelease, parentId)).toEqual(["idle", "running"]);
    const parentContext = { identity: parent.input.identity };

    let finishing = parent; let taskId = delegated.task_id;
    let reviewer = director;
    if (kind === "recursive-team") {
      const child = await owner.delegateTask(parentContext, { recipient_address: "/target", description: "Recursive subtask" });
      expect(child.status).toBe("active"); if (child.status !== "active") throw new Error("Child not activated");
      await drain();
      finishing = handles.get("task-team-2-lead")!; taskId = child.task_id; reviewer = parentContext;
      expect(finishing.input.physicalScope.ancestorTeamRunIds).toEqual(["task-team-1", "task-team-2"]);
      const afterChildRelease = wire.length;
      finishing.emit("idle"); finishing.emit("running");
      expect(freshStatuses(afterChildRelease, finishing.input.identity.agentRunId)).toEqual(["idle", "running"]);
      // Parent is terminal but remains ineligible while its accepted child is not durably settled.
      await owner.submitTaskResult(parentContext, { message: "Parent result" });
      await owner.reviewTaskResult(director, { task_id: delegated.task_id, decision: "accept" });
      parent.emit("idle"); await drain();
      expect(parent.commit).not.toHaveBeenCalled();
    }
    await owner.submitTaskResult({ identity: finishing.input.identity }, { message: "Task result" });
    await owner.reviewTaskResult(reviewer, { task_id: taskId, decision: "accept" });
    if (kind === "recursive-team") parent.emit("idle");
    await drain();
    // Explicit first unsuccessful guard: real registry/flat manager queried the finishing handle; null has no teardown/write.
    expect(finishing.handle.tryPrepareTerminationIfQuiescent).toHaveBeenCalled();
    expect(await finishing.handle.tryPrepareTerminationIfQuiescent.mock.results[0]!.value).toBeNull();
    expect(finishing.commit).not.toHaveBeenCalled(); expect(finishing.finish).not.toHaveBeenCalled();
    let durable = (await executionTreeStore.read(orgMemoryDir, root.rootRunId))!;
    const reference = kind === "agent" ? { agentRunId: parentId } : { teamRunId: kind === "recursive-team" ? "task-team-2" : "task-team-1" };
    expect(new AgentOrgExecutionIndex(durable).getTaskExecution(reference)!.source.settledAt).toBeNull();
    expect((await taskRecordsStore.read(orgMemoryDir, root.rootRunId))!.records.find((r) => r.taskId === taskId)!.status).toBe("accepted");

    const parentInputs = parent.handle.postMessage.mock.calls.length;
    // Only this exact post-release event wakes the existing non-waiting terminal sweep.
    const beforeTerminalIdle = wire.length;
    finishing.emit("idle"); await drain();
    expect(freshStatuses(beforeTerminalIdle, finishing.input.identity.agentRunId)).toEqual(["idle"]);
    durable = (await executionTreeStore.read(orgMemoryDir, root.rootRunId))!;
    expect(new AgentOrgExecutionIndex(durable).getTaskExecution(reference)!.source.settledAt).toEqual(expect.any(String));
    expect(durable).toEqual(owner.getExecutionTreeSnapshot());
    expect(finishing.finish).toHaveBeenCalledOnce(); expect(finishing.commit).toHaveBeenCalledOnce();
    expect(parent.handle.postMessage).toHaveBeenCalledTimes(parentInputs);
    const settled = published.filter((e) => e.kind === "task" && e.event.kind === "settled");
    expect(settled.map((e) => e.kind === "task" ? e.event.task.taskId : null)).toEqual(kind === "recursive-team" ? [taskId, delegated.task_id] : [taskId]);
    expect(teams.get("task-team-1")).toBeNull();
    // The flat directory retains the inactive child identity for frozen root ownership;
    // local parent task registry removal and strict settledAt govern live authority.
    expect(teams.list().map((team) => team.teamRunId)).toEqual(kind === "recursive-team" ? ["configured-team", "task-team-2"] : ["configured-team"]);
    if (kind === "recursive-team") expect(teams.require("task-team-2").isActive()).toBe(false);
    expect(wire.filter((frame) => frame.type === "ROOT_EXECUTION_VIEW_SNAPSHOT")).toHaveLength(1);
    expect(wire.some((frame) => frame.type === "ERROR")).toBe(false); expect(close).not.toHaveBeenCalled();
    stream.disconnect(session!);
    if (kind === "agent") expect(rootAgents.get(parentId)).toBeNull();
    else expect(parent.finish).toHaveBeenCalledOnce();
    expect(failStop).not.toHaveBeenCalled(); expect(owner.isActive()).toBe(true);
  });
});
