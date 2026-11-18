/**
 * IMP-09 (autobyteus-260, REQ-010 / AC-008 / QR-001): before/after result sizes on SYNTHESIZED data with the user's shapes.
 * No user data is read. Run from autobyteus-server-ts (copy this file into tests/unit/ first, it imports the server source):
 *   cp <ticket>/evidence/IMP-09-after-sizes.measure.ts tests/unit/zz-imp09.test.ts
 *   TEST_IMP09_SHAPES=<ticket>/evidence/IMP-09-shape-parameters-output.json TEST_IMP09_OUTPUT=<ticket>/evidence/IMP-09-after-sizes-output.txt \
 *     pnpm exec vitest run tests/unit/zz-imp09.test.ts --no-watch; rm tests/unit/zz-imp09.test.ts
 *
 * Synthesized Project: one Task per row of `IMP-09-shape-parameters-output.json` (read-only lengths and counts of the
 * user's open AutoByteus Tasks: status, first-line length, description length, comment count, dependency count, parent,
 * open team assignments; never text), with generated words of those lengths and titles by the migration's rule
 * (first line, ≤200). Context files are not synthesized (they are not in the default list after the change).
 * "Before" is the base commit's list entry rebuilt field for field (`project-task-tool-manifest.ts` at fc06a7355d:
 * projectId, taskId, description, status, dependsOn, partOf, parts, contextFiles, comments?, assignments, closedAssignments;
 * compact JSON); "after" is this build's real tool output.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { it, vi } from "vitest";
import { toToolResultJson } from "autobyteus-ts/tools/tool-result-json.js";
import { ProjectStore } from "../../src/projects/stores/project-store.js";
import { ProjectsLayout } from "../../src/projects/stores/projects-layout.js";
import { ProjectService } from "../../src/projects/services/project-service.js";
import * as taskServices from "../../src/projects/services/project-task-service.js";
import { ProjectTaskService } from "../../src/projects/services/project-task-service.js";
import { ProjectTaskContextStore } from "../../src/projects/context/project-task-context-store.js";
import { AdHocTaskStore } from "../../src/projects/stores/ad-hoc-task-store.js";
import { AdHocTasksLayout } from "../../src/projects/stores/ad-hoc-tasks-layout.js";
import { createRootExecutionIdentity } from "../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { ProjectTaskToolsMcpAdapterProvider } from "../../src/agent-tools/mcp/providers/project-task-tools-mcp-adapter-provider.js";
import { titleFromFirstLine } from "../../src/app-data-migrations/migrations/project-task-titles/title-from-first-line.js";
import { serializeSendMessageToResult, sendMessageToRejection } from "../../src/agent-communication/services/send-message-to-tool-result-contract.js";

const bytes = (text: string) => Buffer.byteLength(text, "utf8");

it("measures before/after sizes", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "imp09-"));
  const layout = new ProjectsLayout(path.join(dir, "projects"));
  const store = new ProjectStore(layout);
  const changes = { taskChanged() {}, taskRemoved() {}, workerStatusChanged() {}, projectChanged() {}, projectRemoved() {} };
  const tasks = new ProjectTaskService({ store, changes, contextStore: new ProjectTaskContextStore(layout),
    adHocTasks: new AdHocTaskStore(new AdHocTasksLayout(path.join(dir, "ad-hoc-tasks"))) });
  await tasks.load();
  vi.spyOn(taskServices, "getProjectTaskService").mockImplementation(() => tasks);
  const projectId = (await new ProjectService({ store, changes, workspaceLookup: { listRegisteredWorkspaceRootPaths: async () => [] } })
    .createProject({ name: "AutoByteus" })).projectId;
  const hostRoot = createRootExecutionIdentity({ rootSubjectKind: "agent_team", rootRunId: "manager-root-0000000000000000000000000" });
  // One synthesized Task per row of IMP-09-shape-parameters-output.json (lengths and counts of the user's open Tasks).
  const shapes = JSON.parse(await fs.readFile(process.env["TEST_IMP09_SHAPES"]!, "utf8")) as { tasks: Array<{ status: string; firstLineChars: number;
    descriptionBytes: number; comments: number; dependsOn: number; partOf: boolean; openTeamAssignments: number }> };
  const text = (chars: number, seed: number) => { let out = ""; for (let i = 0; out.length < chars; i += 1) out += `word${(seed * 31 + i * 7) % 997} `; return out.slice(0, chars).trimEnd() || "x"; };
  const created: Array<{ taskId: string; taskKey: string }> = [];
  for (const [i, shape] of shapes.tasks.entries()) {
    const firstLine = text(Math.max(1, shape.firstLineChars), i);
    const description = `${firstLine}\n\n${text(Math.max(1, shape.descriptionBytes - firstLine.length - 2), i + 1000)}`;
    const view = await tasks.createTask({ projectId, title: titleFromFirstLine(description)!, description,
      ...(shape.dependsOn && created.length ? { dependsOnTaskIds: created.slice(-shape.dependsOn).map((t) => t.taskId) } : {}),
      ...(shape.partOf && created.length ? { partOfTaskId: created[0]!.taskId } : {}) });
    created.push(view);
    for (let c = 0; c < shape.comments; c += 1) await tasks.addComment({ projectId, taskId: view.taskId, text: text(180, i * 10 + c) });
    if (shape.status === "IN_PROGRESS") await tasks.updateTask({ projectId, taskId: view.taskId, status: "IN_PROGRESS" });
    for (let k = 0; k < shape.openTeamAssignments; k += 1) {
      const team = { teamRunId: `team_${"x".repeat(32)}${i}_${k}` };
      await tasks.linkNewTaskExecution({ role: "assigned", taskId: view.taskId, assignedBy: `manager-${"z".repeat(44)}`, hostRoot,
        execution: team, teamCoordinatorAgentRunId: `coordinator_${"y".repeat(38)}${i}` });
      await tasks.markStarted(team);
    }
  }
  const all = await tasks.listTasks(projectId);
  const assignments = await tasks.assignments(all.map((t) => t.taskId));
  const keyOf = new Map(all.map((t) => [t.taskId, t.taskKey]));
  const partsOf = (id: string) => all.filter((t) => t.partOfTaskId === id).map((t) => t.taskKey);
  // Before: the base commit's full entry for each Task, compact JSON (list_project_tasks returned every Task in full).
  const beforeEntry = (t: (typeof all)[number]) => {
    const a = assignments.get(t.taskId);
    return { projectId, taskId: t.taskKey, description: t.description, status: t.status,
      dependsOn: t.dependsOnTaskIds.map((id) => keyOf.get(id)!), partOf: t.partOfTaskId ? keyOf.get(t.partOfTaskId)! : null, parts: partsOf(t.taskId),
      contextFiles: t.contextFiles, ...(t.comments.length ? { comments: t.comments.map((c) => c.text) } : {}),
      ...(a === "unavailable" ? { assignmentsUnavailable: true } : { assignments: a?.open ?? [], closedAssignments: a?.closed ?? [] }) };
  };
  const listBefore = JSON.stringify({ projectId, tasks: all.map(beforeEntry) });
  const mcp = async (name: string, args: Record<string, unknown>) => {
    const result = await new ProjectTaskToolsMcpAdapterProvider().getAdapters().find((a) => a.definition.name === name)!
      .execute({ rawArguments: args, session: {} as never });
    return (result as { result: { content: Array<{ text: string }> } }).result.content[0]!.text;
  };
  const listAfter = await mcp("list_project_tasks", { project_id: projectId });
  const one = all.find((t) => t.comments.length && t.status === "IN_PROGRESS")!;
  const getAfter = await mcp("get_project_task", { project_id: projectId, task_id: one.taskKey });
  const oneBefore = JSON.stringify(beforeEntry(one));
  // An acknowledgement of a Task with no relations; after, it carries the title (REQ-009), which the base did not have.
  const plain = all.find((t) => !t.dependsOnTaskIds.length && !t.partOfTaskId && t.taskKey !== created[0]!.taskKey && t.status === "TODO")!;
  const ackBefore = JSON.stringify({ task: { projectId, taskId: plain.taskKey, status: "TODO", dependsOn: [], partOf: null } });
  const ackAfter = await mcp("update_task", { task_id: plain.taskKey, status: "TODO" });
  const refusalBefore = JSON.stringify({ accepted: false, code: "COLLABORATION_TARGET_NOT_FOUND", message: "Collaboration target '/missing' was not found.", target_agent_run_id: null });
  const refusalAfter = serializeSendMessageToResult(sendMessageToRejection("COLLABORATION_TARGET_NOT_FOUND", "Collaboration target '/missing' was not found."));
  const dom = { tab_id: "t-1", elements: Array.from({ length: 200 }, (_, i) => ({ element_id: `e${i}`, tag: "button", role: "button", name: `Action ${i}`,
    text: i % 3 ? null : "Click", selector: `#main > div:nth-child(${i}) > button`, bounding_box: { x: 10 + i, y: 20 + i, width: 120, height: 32 } })) };
  const domBefore = JSON.stringify(dom, null, 2), domAfter = toToolResultJson(dom);
  const pct = (b: number, a: number) => `${(((a - b) / b) * 100).toFixed(1)}%`;
  const row = (label: string, before: string, after: string) => `${label} | ${bytes(before)} | ${bytes(after)} | ${pct(bytes(before), bytes(after))}`;
  const lines = [
    "IMP-09 after-sizes on synthesized data (no user data); commit: see implementation-handoff.md Checks Run",
    `synthesized open Tasks: ${all.length}; description bytes total: ${all.reduce((n, t) => n + bytes(t.description), 0)}`,
    "result | before B | after B | change",
    row(`list_project_tasks (${all.length} open Tasks)`, listBefore, listAfter),
    row(`one Task in full (base list entry vs get_project_task; after adds a ${bytes(one.title)}-byte title)`, oneBefore, getAfter),
    row(`update_task acknowledgement (after adds a ${bytes(plain.title)}-byte title)`, ackBefore, ackAfter),
    row("send_message_to refusal", refusalBefore, refusalAfter),
    row("dom_snapshot (200 elements; before pretty)", domBefore, domAfter),
    `QR-001 list after/before: ${((bytes(listAfter) / bytes(listBefore)) * 100).toFixed(1)}% (≤ 10% required)`,
  ];
  await fs.writeFile(process.env["TEST_IMP09_OUTPUT"] ?? path.join(dir, "out.txt"), `${lines.join("\n")}\n`);
  console.log(lines.join("\n"));
  await fs.rm(dir, { recursive: true, force: true });
}, 120_000);
