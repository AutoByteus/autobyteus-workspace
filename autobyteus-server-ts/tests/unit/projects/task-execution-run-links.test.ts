/**
 * `TaskExecutionResourceService.runLinksOf` (projects-left-navigation, REQ-003, REQ-008, DEC-013, QR-001): which host
 * roots and which delegated copies belong to a Project (or to Tasks with no Project), answered from the in-memory view.
 * The store is an in-memory fake of the Task files, so the rule is checked on exact entry shapes.
 * Run: pnpm -C autobyteus-server-ts exec vitest run tests/unit/projects/task-execution-run-links.test.ts --no-watch
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { TaskExecutionResourceService } from "../../../src/projects/services/task-execution-resource-service.js";
import type { TaskExecutionResourceStore } from "../../../src/projects/stores/task-execution-resource-store.js";
import type { TaskExecutionResource, TaskExecutionResourceFile } from "../../../src/projects/domain/task-execution-resources.js";
import type { TaskLocation } from "../../../src/projects/domain/models.js";
import { createRootExecutionIdentity, rootExecutionIdentityKey, type RootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskExecutionReference } from "../../../src/agent-collaboration/execution/task/task-execution-reference.js";

const manager = createRootExecutionIdentity({ rootSubjectKind: "agent", rootRunId: "manager-1" });
const other = createRootExecutionIdentity({ rootSubjectKind: "agent", rootRunId: "manager-2" });
const org = createRootExecutionIdentity({ rootSubjectKind: "agent_org", rootRunId: "org-1" });

type FakeTask = Readonly<{ location: TaskLocation; entries: TaskExecutionResource[] }>;

const entry = (input: Readonly<{
  hostRoot?: RootExecutionIdentity; execution: TaskExecutionReference; linkedAt: string; closedAt?: string | null; role?: "assigned" | "delegated";
}>): TaskExecutionResource => ({
  role: input.role ?? "assigned",
  ...(input.role === "delegated" ? {} : { assignedBy: "manager-agent" }),
  hostRoot: input.hostRoot ?? manager,
  execution: input.execution,
  linkedAt: input.linkedAt,
  start: "started",
  closedAt: input.closedAt ?? null,
});

const serviceOver = async (tasks: FakeTask[], damaged: TaskLocation[] = []) => {
  const files = new Map<string, TaskExecutionResourceFile>(tasks.map((task) => [task.location.taskId, { taskId: task.location.taskId, executionResources: task.entries }]));
  const read = vi.fn(async (location: TaskLocation) => {
    if (damaged.some((item) => item.taskId === location.taskId)) throw new Error("bad json");
    return files.get(location.taskId)!;
  });
  const store = {
    list: async () => [...tasks.map((task) => task.location), ...damaged],
    read,
    filePath: (location: TaskLocation) => `/data/${location.projectId ?? "ad-hoc"}/${location.taskId}/agent_run_resources.json`,
  } as unknown as TaskExecutionResourceStore;
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  const service = new TaskExecutionResourceService(store);
  await service.load();
  return { service, read };
};

const executionsOf = (links: Awaited<ReturnType<TaskExecutionResourceService["runLinksOf"]>>, root: RootExecutionIdentity) =>
  links.executionsByHostRoot.get(rootExecutionIdentityKey(root)) ?? [];

describe("TaskExecutionResourceService.runLinksOf", () => {
  afterEach(() => vi.restoreAllMocks());

  it("lists each Project's hosts and only its own copies; Temp-task copies under null (AC-002, AC-007)", async () => {
    const { service } = await serviceOver([
      { location: { projectId: "P", taskId: "a" }, entries: [entry({ execution: { teamRunId: "team-a" }, linkedAt: "2026-10-01T00:00:00Z" })] },
      { location: { projectId: "Q", taskId: "b" }, entries: [entry({ execution: { agentRunId: "copy-b" }, linkedAt: "2026-10-02T00:00:00Z" })] },
      { location: { projectId: null, taskId: "ad_hoc_task_1" }, entries: [entry({ execution: { agentRunId: "copy-t" }, linkedAt: "2026-10-03T00:00:00Z" })] },
      { location: { projectId: "P", taskId: "c" }, entries: [entry({ hostRoot: org, execution: { agentRunId: "copy-org" }, linkedAt: "2026-10-04T00:00:00Z" })] },
    ]);
    const p = await service.runLinksOf("P");
    expect(p.hostRoots).toEqual([{ hostRoot: manager, hasOpenWork: true }, { hostRoot: org, hasOpenWork: true }]);
    expect(executionsOf(p, manager)).toEqual([{ teamRunId: "team-a" }]);
    expect(executionsOf(p, org)).toEqual([{ agentRunId: "copy-org" }]);
    const q = await service.runLinksOf("Q");
    expect(q.hostRoots).toEqual([{ hostRoot: manager, hasOpenWork: true }]);
    expect(executionsOf(q, manager)).toEqual([{ agentRunId: "copy-b" }]);
    expect(executionsOf(await service.runLinksOf(null), manager)).toEqual([{ agentRunId: "copy-t" }]);
    expect((await service.runLinksOf("unknown")).hostRoots).toEqual([]);
  });

  it("a copy holding open Tasks of P and Q belongs to both; once P's closes, only to Q; once both close, to Q (its latest) (REQ-008)", async () => {
    const copy = { teamRunId: "set-1" };
    const both = await serviceOver([
      { location: { projectId: "P", taskId: "a" }, entries: [entry({ execution: copy, linkedAt: "2026-10-01T00:00:00Z" })] },
      { location: { projectId: "Q", taskId: "b" }, entries: [entry({ execution: copy, linkedAt: "2026-10-02T00:00:00Z" })] },
    ]);
    expect(executionsOf(await both.service.runLinksOf("P"), manager)).toEqual([copy]);
    expect(executionsOf(await both.service.runLinksOf("Q"), manager)).toEqual([copy]);

    const pClosed = await serviceOver([
      { location: { projectId: "P", taskId: "a" }, entries: [entry({ execution: copy, linkedAt: "2026-10-01T00:00:00Z", closedAt: "2026-10-03T00:00:00Z" })] },
      { location: { projectId: "Q", taskId: "b" }, entries: [entry({ execution: copy, linkedAt: "2026-10-02T00:00:00Z" })] },
    ]);
    const p = await pClosed.service.runLinksOf("P");
    expect(executionsOf(p, manager)).toEqual([]);
    expect(p.hostRoots).toEqual([{ hostRoot: manager, hasOpenWork: false }]);
    expect(executionsOf(await pClosed.service.runLinksOf("Q"), manager)).toEqual([copy]);

    const allClosed = await serviceOver([
      { location: { projectId: "P", taskId: "a" }, entries: [entry({ execution: copy, linkedAt: "2026-10-01T00:00:00Z", closedAt: "2026-10-03T00:00:00Z" })] },
      { location: { projectId: "Q", taskId: "b" }, entries: [entry({ execution: copy, linkedAt: "2026-10-02T00:00:00Z", closedAt: "2026-10-04T00:00:00Z" })] },
    ]);
    expect(executionsOf(await allClosed.service.runLinksOf("P"), manager)).toEqual([]);
    expect(executionsOf(await allClosed.service.runLinksOf("Q"), manager)).toEqual([copy]);
  });

  it("sub-work joins its delegator's Task and belongs to that Task's Project; a copy with several open Tasks of P is listed once", async () => {
    const worker = { agentRunId: "worker-1" };
    const { service } = await serviceOver([
      { location: { projectId: "P", taskId: "a" }, entries: [
        entry({ execution: worker, linkedAt: "2026-10-01T00:00:00Z" }),
        entry({ execution: { agentRunId: "sub-1" }, linkedAt: "2026-10-01T01:00:00Z", role: "delegated" }),
      ] },
      { location: { projectId: "P", taskId: "b" }, entries: [entry({ execution: worker, linkedAt: "2026-10-02T00:00:00Z" })] },
    ]);
    expect(executionsOf(await service.runLinksOf("P"), manager)).toEqual([worker, { agentRunId: "sub-1" }]);
  });

  it("leaves damaged Task files out and names them once per read (DESIGN rule 7)", async () => {
    const { service } = await serviceOver(
      [{ location: { projectId: "P", taskId: "a" }, entries: [entry({ execution: { agentRunId: "c" }, linkedAt: "2026-10-01T00:00:00Z" })] }],
      [{ projectId: "P", taskId: "broken" }],
    );
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const links = await service.runLinksOf("P");
    expect(executionsOf(links, manager)).toEqual([{ agentRunId: "c" }]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith("TASK_AGENT_RESOURCES_UNAVAILABLE", expect.objectContaining({ taskId: "broken", projectId: "P" }));
    await service.runLinksOf("Q");
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("answers a 350-Task Project from memory: no Task file is read after load (QR-001)", async () => {
    const tasks: FakeTask[] = Array.from({ length: 350 }, (_, index) => ({
      location: { projectId: "P", taskId: `t${index}` },
      entries: index % 2 === 0 ? [entry({
        hostRoot: index % 4 === 0 ? manager : other,
        execution: { agentRunId: `copy-${index}` },
        linkedAt: `2026-10-01T00:00:${String(index % 60).padStart(2, "0")}Z`,
        closedAt: index % 3 === 0 ? "2026-10-02T00:00:00Z" : null,
      })] : [],
    }));
    const { service, read } = await serviceOver(tasks);
    read.mockClear();
    const started = performance.now();
    const links = await service.runLinksOf("P");
    expect(performance.now() - started).toBeLessThan(250);
    expect(read).not.toHaveBeenCalled();
    expect(links.hostRoots.map((host) => host.hostRoot.rootRunId).sort()).toEqual(["manager-1", "manager-2"]);
    expect(executionsOf(links, manager).length + executionsOf(links, other).length).toBe(175);
  });
});
