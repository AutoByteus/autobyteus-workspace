import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectsLayout } from "../../../src/projects/stores/projects-layout.js";
import { AdHocTasksLayout } from "../../../src/projects/stores/ad-hoc-tasks-layout.js";
import { TaskExecutionResourceService } from "../../../src/projects/services/task-execution-resource-service.js";
import { TaskExecutionResourceStore } from "../../../src/projects/stores/task-execution-resource-store.js";
import { taskRunResources } from "../../helpers/task-run-resources.js";

/**
 * autobyteus-461 (contract §2.6, design "Ordering Without A Shared Queue", AR-017): the Task side gives `DelegationIndex`
 * each Task's entries from memory, and tells it synchronously inside the Task's ordered change.
 */
const from = (kind: string, runId: string, delegatorAgentRunId: string) => ({ delegatingRun: { kind, runId }, delegatorAgentRunId });
const entry = (agentRun: Record<string, string>, extra: Record<string, unknown> = {}) => ({
  role: "assigned", delegatedFrom: from("agent", "manager", "manager"), recipientAddress: "/eng_team", agentRun,
  linkedAt: "2026-11-01T10:00:00.000Z", start: "started", closedAt: null, ...extra });

describe("Task side: entries for the DelegationIndex (autobyteus-461)", () => {
  let appData: string, layout: ProjectsLayout, service: TaskExecutionResourceService;
  const write = async (taskId: string, agentRunResources: unknown) => {
    const file = layout.taskExecutionResourcesFile("project_P", taskId);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, typeof agentRunResources === "string" ? agentRunResources : JSON.stringify({ taskId, agentRunResources }));
  };
  const boot = async () => {
    service = taskRunResources(new TaskExecutionResourceStore(layout, new AdHocTasksLayout(path.join(appData, "ad-hoc-tasks"))));
    await service.load();
  };

  beforeEach(async () => {
    appData = await fs.mkdtemp(path.join(os.tmpdir(), "task-run-entries-"));
    layout = new ProjectsLayout(path.join(appData, "projects"));
  });
  afterEach(async () => { vi.restoreAllMocks(); await fs.rm(appData, { recursive: true, force: true }); });

  it("throws before the Task records are loaded", () => {
    service = taskRunResources(new TaskExecutionResourceStore(layout, new AdHocTasksLayout(path.join(appData, "ad-hoc-tasks"))));
    expect(() => service.taskIdsWithEntries()).toThrow("not loaded");
  });

  it("gives each run's last entry per Task, with its entry agent and a peer run's nodeId and members; a damaged Task gives none", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await write("T1", [
      entry({ kind: "agent", agentRunId: "worker" }, { closedAt: "2026-11-01T11:00:00.000Z" }),
      entry({ kind: "agent", agentRunId: "worker" }, { linkedAt: "2026-11-02T10:00:00.000Z" }),
      entry({ kind: "team", teamRunId: "remote", coordinatorAgentRunId: "lead" }, { nodeId: "node-b", members: [{ address: "/r/lead", agentRunId: "lead" }] }),
    ]);
    await write("T_damaged", "{ not json");
    await boot();
    expect(service.taskIdsWithEntries()).toEqual(["T1"]);
    expect(service.entriesOf("T1")).toEqual([
      { taskId: "T1", role: "assigned", delegatedFrom: { delegatingRun: { rootSubjectKind: "agent", rootRunId: "manager" }, delegatorAgentRunId: "manager" },
        run: { agentRunId: "worker" }, entryAgentRunId: "worker", open: true, start: "started", linkedAt: "2026-11-02T10:00:00.000Z", recipientAddress: "/eng_team" },
      expect.objectContaining({ run: { teamRunId: "remote" }, entryAgentRunId: "lead", nodeId: "node-b", members: [{ address: "/r/lead", agentRunId: "lead" }] }),
    ]);
    expect(service.entriesOf("T_damaged")).toEqual([]);
    expect(service.entriesOf("unknown")).toEqual([]);
  });

  it("tells the listener synchronously inside the Task's ordered change, after the view swap and before the change resolves (AR-017)", async () => {
    await write("T1", [entry({ kind: "agent", agentRunId: "worker" })]);
    await boot();
    const seen: string[] = [];
    service.setEntriesListener({ entriesChanged: (taskId) => seen.push(`${taskId}:${service.isOpen({ agentRunId: "worker" })}`) });
    const closing = service.closeTask({ projectId: "project_P", taskId: "T1" }, async () => { seen.push("afterClose"); });
    await closing;
    expect(seen).toEqual(["T1:false", "afterClose"]);
    // A listener failure never fails the committed write.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    service.setEntriesListener({ entriesChanged: () => { throw new Error("boom"); } });
    await expect(service.reopenAssignment({ projectId: "project_P", taskId: "T1" }, { agentRunId: "worker" }, "manager")).resolves.toBe(true);
    expect(warn).toHaveBeenCalledWith("DELEGATION_TREE_UPDATE_FAILED", expect.objectContaining({ taskId: "T1" }));
    // A forgotten (deleted) Task is told too.
    const forgotten: string[] = [];
    service.setEntriesListener({ entriesChanged: (taskId) => forgotten.push(taskId) });
    service.forget({ projectId: "project_P", taskId: "T1" });
    expect(forgotten).toEqual(["T1"]);
    expect(service.entriesOf("T1")).toEqual([]);
  });

  it("a Task change with no entries listener set fails before it writes (SR-047, ARCH-REV-022)", async () => {
    await write("T1", [entry({ kind: "agent", agentRunId: "worker" })]);
    const file = layout.taskExecutionResourcesFile("project_P", "T1");
    const before = await fs.readFile(file, "utf8");
    service = new TaskExecutionResourceService(new TaskExecutionResourceStore(layout, new AdHocTasksLayout(path.join(appData, "ad-hoc-tasks"))));
    await service.load();
    await expect(service.closeTask({ projectId: "project_P", taskId: "T1" }, async () => undefined)).rejects.toThrow("TASK_ENTRIES_LISTENER_UNSET");
    expect(await fs.readFile(file, "utf8")).toBe(before);
    expect(service.isOpen({ agentRunId: "worker" })).toBe(true);
  });
});
