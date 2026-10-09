import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseTaskExecutionResourceFile, serializeTaskExecutionResourceFile } from "../../../src/projects/stores/task-execution-resource-schema.js";
import { AdHocTasksLayout } from "../../../src/projects/stores/ad-hoc-tasks-layout.js";
import { AdHocTaskStore } from "../../../src/projects/stores/ad-hoc-task-store.js";
import { ProjectStore } from "../../../src/projects/stores/project-store.js";
import { ProjectsLayout } from "../../../src/projects/stores/projects-layout.js";
import { ProjectTaskService } from "../../../src/projects/services/project-task-service.js";
import { TaskExecutionResourceService } from "../../../src/projects/services/task-execution-resource-service.js";
import { TaskExecutionResourceStore } from "../../../src/projects/stores/task-execution-resource-store.js";
import { ProjectTaskContextStore } from "../../../src/projects/context/project-task-context-store.js";
import { ProjectChangePublisher } from "../../../src/projects/changes/project-change-publisher.js";
import { buildTaskRootView, latestAssignedEntry } from "../../../src/projects/services/task-root-view-builder.js";
import { createRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";

const hostRoot = createRootExecutionIdentity({ rootSubjectKind: "agent_team", rootRunId: "team-root" });
const stored = (extra: Record<string, unknown> = {}) => ({
  role: "assigned", assignedBy: "manager", hostRoot: { kind: "agent_team", runId: "team-root" },
  agentRun: { kind: "agent", agentRunId: "worker" }, linkedAt: "t", start: "started", closedAt: null, ...extra,
});

describe("Task roots: recorded address, reader/writer, and views", () => {
  it("reads old entries without the address and new ones with it; writes it exactly when present (Directly Usable)", () => {
    const file = parseTaskExecutionResourceFile({ taskId: "t", agentRunResources: [
      stored(),
      { ...stored({ recipientAddress: "/product_team" }), agentRun: { kind: "team", teamRunId: "team-1", coordinatorAgentRunId: "lead" } },
    ] }, "t");
    expect(file.executionResources.map((entry) => entry.recipientAddress)).toEqual([undefined, "/product_team"]);
    const written = serializeTaskExecutionResourceFile(file).agentRunResources;
    expect(Object.keys(written[0]!)).not.toContain("recipientAddress");
    expect(written[1]).toMatchObject({ recipientAddress: "/product_team" });
    expect(parseTaskExecutionResourceFile(serializeTaskExecutionResourceFile(file), "t")).toEqual(file);
    // Only a nonblank address, only on assigned.
    const helper = { role: "delegated", hostRoot: { kind: "agent", runId: "r" }, agentRun: { kind: "agent", agentRunId: "h" }, linkedAt: "t", start: "starting", closedAt: null };
    expect(() => parseTaskExecutionResourceFile({ taskId: "t", agentRunResources: [{ ...helper, recipientAddress: "/x" }] }, "t")).toThrow("recipientAddress");
    expect(() => parseTaskExecutionResourceFile({ taskId: "t", agentRunResources: [stored({ recipientAddress: " " })] }, "t")).toThrow("recipientAddress");
  });

  it("the root is the latest assigned entry; closed or failed roots are offline without asking the root", () => {
    const file = parseTaskExecutionResourceFile({ taskId: "t", agentRunResources: [
      stored({ recipientAddress: "/first", agentRun: { kind: "agent", agentRunId: "first" } }),
      { role: "delegated", hostRoot: { kind: "agent_team", runId: "team-root" }, agentRun: { kind: "agent", agentRunId: "h" }, linkedAt: "t", start: "started", closedAt: null },
      stored({ recipientAddress: "/second", agentRun: { kind: "agent", agentRunId: "second" }, start: "failed", startError: { code: "NO_MODEL", message: "No model is set." } }),
    ] }, "t");
    const resolve = vi.fn(() => "running" as const);
    const root = latestAssignedEntry(file)!;
    expect(buildTaskRootView(root, resolve)).toEqual({ kind: "agent", recipientAddress: "/second", ingressAgentRunId: "second", teamRunId: null,
      hostRoot: { kind: "agent_team", runId: "team-root" }, start: "failed", startError: { code: "NO_MODEL", message: "No model is set." },
      closed: false, status: "offline" });
    expect(resolve).not.toHaveBeenCalled();
    expect(buildTaskRootView({ ...root, start: "started", startError: undefined, closedAt: "x" }, resolve).status).toBe("offline");
    expect(buildTaskRootView({ ...root, start: "started", startError: undefined }, resolve).status).toBe("running");
    expect(resolve).toHaveBeenCalledWith(root.hostRoot, { agentRunId: "second" });
    // Starting: Initializing while its active host has no live run yet; its own status once live;
    // Offline when the host is not active (a start left behind by a stopped root).
    const starting = { ...root, start: "starting" as const, startError: undefined };
    expect(buildTaskRootView(starting, () => "offline").status).toBe("initializing");
    expect(buildTaskRootView(starting, () => "idle").status).toBe("idle");
    expect(buildTaskRootView(starting, () => null).status).toBe("offline");
    expect(buildTaskRootView({ ...root, start: "started", startError: undefined }, () => null).status).toBe("offline");
  });

  describe("on disk", () => {
    let appData: string, adHocLayout: AdHocTasksLayout, tasks: ProjectTaskService;
    beforeEach(async () => {
      appData = await fs.mkdtemp(path.join(os.tmpdir(), "task-roots-"));
      const layout = new ProjectsLayout(path.join(appData, "projects"));
      adHocLayout = new AdHocTasksLayout(path.join(appData, "ad-hoc-tasks"));
      tasks = new ProjectTaskService({ store: new ProjectStore(layout), adHocTasks: new AdHocTaskStore(adHocLayout), contextStore: new ProjectTaskContextStore(layout),
        taskExecutionResources: new TaskExecutionResourceService(new TaskExecutionResourceStore(layout, adHocLayout)),
        changes: new ProjectChangePublisher(), workerStatus: () => "running" });
      await tasks.load();
    });
    afterEach(async () => { vi.restoreAllMocks(); await fs.rm(appData, { recursive: true, force: true }); });

    it("lists Temp tasks latest change first, each with its root; damaged folders are skipped and logged", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      expect(await tasks.listTasksWithoutProject()).toEqual([]);
      const first = await tasks.linkNewTaskExecution({ role: "assigned", assignedBy: "manager", recipientAddress: "/product_team", hostRoot,
        execution: { teamRunId: "team-1" }, teamCoordinatorAgentRunId: "lead", adHocTask: { description: "Design it", referenceFiles: ["/w/brief.md"] } });
      await tasks.markStarted({ teamRunId: "team-1" });
      await new Promise((r) => setTimeout(r, 5));
      const second = await tasks.linkNewTaskExecution({ role: "assigned", assignedBy: "manager", recipientAddress: "/writer", hostRoot,
        execution: { agentRunId: "writer" }, adHocTask: { description: "Write it", referenceFiles: [] } });
      await fs.mkdir(path.join(adHocLayout.root, "not-a-task"), { recursive: true });
      const listed = await tasks.listTasksWithoutProject();
      expect(listed.map((task) => task.taskId)).toEqual([second.taskId, first.taskId]);
      expect(listed[1]).toMatchObject({ description: "Design it", status: "TODO", referenceFiles: ["/w/brief.md"], root: {
        kind: "team", recipientAddress: "/product_team", ingressAgentRunId: "lead", teamRunId: "team-1", start: "started", status: "running" } });
      // `starting` reports the worker's live status (Initializing while it activates); not openable on the web.
      expect(listed[0]!.root).toMatchObject({ start: "starting", recipientAddress: "/writer" });
      expect(warn).toHaveBeenCalledWith("AD_HOC_TASK_UNREADABLE", { folder: "not-a-task" });
    });
  });
});
