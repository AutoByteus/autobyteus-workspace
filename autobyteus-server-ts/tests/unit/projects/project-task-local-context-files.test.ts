import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectStore } from "../../../src/projects/stores/project-store.js";
import { ProjectsLayout } from "../../../src/projects/stores/projects-layout.js";
import { AdHocTasksLayout } from "../../../src/projects/stores/ad-hoc-tasks-layout.js";
import { AdHocTaskStore } from "../../../src/projects/stores/ad-hoc-task-store.js";
import { ProjectService } from "../../../src/projects/services/project-service.js";
import { ProjectTaskService } from "../../../src/projects/services/project-task-service.js";
import { ProjectTaskContextStore } from "../../../src/projects/context/project-task-context-store.js";
import { CONTEXT_FILE_MAX_BYTES, contextFileMimeTypeForPath } from "../../../src/context-files/domain/context-file-upload-policy.js";
import { createRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskExecutionReleaseRequest } from "../../../src/agent-collaboration/execution/task/task-execution-resource-port.js";

const hostRoot = createRootExecutionIdentity({ rootSubjectKind: "agent", rootRunId: "host-root" });
const originalCopyFile = fs.copyFile.bind(fs);

/** Agent-attached context files: node-local sources copied into a Project Task's saved context (no draft). */
describe("Project Task local context files", () => {
  let appData: string, sources: string, layout: ProjectsLayout, store: ProjectStore, context: ProjectTaskContextStore, tasks: ProjectTaskService, projectId: string;
  let release: ReturnType<typeof vi.fn<TaskExecutionReleaseRequest>>;
  const source = async (name: string, content: string | Buffer = `bytes of ${name}`) => {
    const file = path.join(sources, name);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, content);
    return file;
  };
  const taskJson = (taskId: string) => fs.readFile(layout.taskFile(projectId, taskId), "utf8").then(JSON.parse);
  const contextEntries = (taskId: string) => fs.readdir(layout.contextDir(projectId, taskId)).catch(() => [] as string[]);
  const taskDirs = () => fs.readdir(layout.tasksDir(projectId)).catch(() => [] as string[]);
  const uiTask = async (description = "UI task") => {
    const draft = await tasks.beginContextDraft(projectId);
    const upload = await tasks.uploadContextFile(projectId, draft.draftId,
      { filename: "ui.txt", mimetype: "text/plain", file: Readable.from([Buffer.from("ui bytes")]) } as never);
    return tasks.createTask({ projectId, description, contextDraft: { draftId: draft.draftId, storedFilenames: [upload.storedFilename] } });
  };

  beforeEach(async () => {
    appData = await fs.mkdtemp(path.join(os.tmpdir(), "task-local-context-"));
    sources = path.join(appData, "agent-sources");
    layout = new ProjectsLayout(path.join(appData, "projects"));
    store = new ProjectStore(layout);
    context = new ProjectTaskContextStore(layout);
    release = vi.fn<TaskExecutionReleaseRequest>(async (_root, agentRuns) => agentRuns.map(execution => ({ execution, stopped: true })));
    tasks = new ProjectTaskService({ store, contextStore: context, requestRelease: release,
      adHocTasks: new AdHocTaskStore(new AdHocTasksLayout(path.join(appData, "ad-hoc-tasks"))) });
    await tasks.load();
    projectId = (await new ProjectService({ store, workspaceLookup: { listRegisteredWorkspaceRootPaths: async () => [] } }).createProject({ name: "P" })).projectId;
  });
  afterEach(async () => {
    await tasks.drainRuntimeReleases();
    vi.restoreAllMocks();
    await fs.chmod(path.join(sources, "locked.txt"), 0o600).catch(() => undefined);
    await fs.rm(appData, { recursive: true, force: true });
  });

  it("maps a path to an app-accepted MIME type by extension only", () => {
    expect(contextFileMimeTypeForPath("/a/shot.PNG")).toBe("image/png");
    expect(contextFileMimeTypeForPath("/a/notes.md")).toBe("text/markdown");
    expect(contextFileMimeTypeForPath("/a/server.log")).toBe("text/plain");
    for (const rejected of ["/a/code.ts", "/a/conf.yaml", "/a/run.sh", "/a/Makefile", "/a/archive.zip"]) {
      expect(contextFileMimeTypeForPath(rejected)).toBeNull();
    }
  });

  it("creates a TODO Task with copies of every file, original display names, and bytes that outlive the sources (AC-001, AC-006)", async () => {
    const png = await source("shots/shot1.png", Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]));
    const md = await source("notes.md", "# Notes");
    const linked = path.join(sources, "linked.txt");
    await fs.symlink(await source("target.txt", "via link"), linked);
    const view = await tasks.createTaskWithLocalContextFiles({ projectId, description: "Fix green status", localContextFiles: [png, md, linked] });
    expect(view.status).toBe("TODO");
    expect(view.contextFiles.map(f => [f.displayName, f.mimeType, f.sizeBytes])).toEqual([
      ["shot1.png", "image/png", 7], ["notes.md", "text/markdown", 7], ["linked.txt", "text/plain", 8]]);
    for (const f of view.contextFiles) expect(f.storedFilename).toMatch(/^ctx_[a-f0-9]{12}__/);
    expect(await fs.readFile(view.contextFiles[0]!.localPath!)).toEqual(await fs.readFile(png));
    const persisted = await taskJson(view.taskId);
    expect(persisted.contextFiles).toEqual(view.contextFiles.map(({ storedFilename, displayName, mimeType, sizeBytes }) => ({ storedFilename, displayName, mimeType, sizeBytes })));
    // Sources are only read; later changes or deletion do not affect the saved copies.
    expect(await fs.readFile(md, "utf8")).toBe("# Notes");
    await fs.writeFile(md, "changed later"); await fs.rm(sources, { recursive: true, force: true });
    const reread = await tasks.readSavedContextFile(projectId, view.taskId, view.contextFiles[1]!.storedFilename);
    expect(await fs.readFile(reread.filePath, "utf8")).toBe("# Notes");
    // A linked delegation hands the saved copies to the worker (AC-010).
    expect((await tasks.resolveAssignment(view.taskId)).referenceFiles).toEqual(view.contextFiles.map(f => f.localPath));
  });

  it("creates a Task with no files and no context directory for an empty list (AC-004 alternate)", async () => {
    const view = await tasks.createTaskWithLocalContextFiles({ projectId, description: "Text only", localContextFiles: [] });
    expect(view.contextFiles).toEqual([]);
    expect(await contextEntries(view.taskId)).toEqual([]);
  });

  it.each([
    ["relative", () => "notes.md", "TASK_CONTEXT_INVALID"],
    ["non-normalized", (dir: string) => `${dir}/../agent-sources/notes.md`, "TASK_CONTEXT_INVALID"],
    ["missing", (dir: string) => path.join(dir, "missing.md"), "TASK_CONTEXT_FILE_UNAVAILABLE"],
    ["a directory", (dir: string) => path.join(dir, "folder.md"), "TASK_CONTEXT_FILE_UNAVAILABLE"],
    ["an unsupported type", (dir: string) => path.join(dir, "code.ts"), "TASK_CONTEXT_INVALID"],
    ["extensionless", (dir: string) => path.join(dir, "README"), "TASK_CONTEXT_INVALID"],
    ["larger than 25 MiB", (dir: string) => path.join(dir, "huge.txt"), "TASK_CONTEXT_INVALID"],
  ])("rejects a create whose second file is %s, naming the path and creating nothing (AC-005)", async (_case, bad, code) => {
    const good = await source("notes.md");
    await fs.mkdir(path.join(sources, "folder.md"));
    await source("code.ts"); await source("README");
    await fs.truncate(await source("huge.txt", ""), CONTEXT_FILE_MAX_BYTES + 1);
    const badPath = bad(sources);
    const error = await tasks.createTaskWithLocalContextFiles({ projectId, description: "Never", localContextFiles: [good, badPath] }).catch(e => e);
    expect(error).toMatchObject({ code, message: expect.stringContaining(`'${badPath}'`) });
    expect(await tasks.listTasks(projectId)).toEqual([]);
    expect(await taskDirs()).toEqual([]);
  });

  it("rejects a duplicate path within one call and an unreadable file (AC-005)", async () => {
    const good = await source("notes.md");
    await expect(tasks.createTaskWithLocalContextFiles({ projectId, description: "Never", localContextFiles: [good, good] }))
      .rejects.toMatchObject({ code: "TASK_CONTEXT_INVALID", message: expect.stringContaining(good) });
    const locked = await source("locked.txt");
    await fs.chmod(locked, 0o000);
    if (process.getuid?.() !== 0) {
      await expect(tasks.createTaskWithLocalContextFiles({ projectId, description: "Never", localContextFiles: [good, locked] }))
        .rejects.toMatchObject({ code: "TASK_CONTEXT_FILE_UNAVAILABLE", message: expect.stringContaining(locked) });
    }
    expect(await taskDirs()).toEqual([]);
  });

  it("removes this call's copies and names the path when a copy fails after validation (R-3)", async () => {
    const first = await source("first.md"), second = await source("second.md");
    vi.spyOn(fs, "copyFile").mockImplementation(async (from, to, mode) => {
      if (String(from) === second) { await fs.writeFile(String(to), "partial"); throw Object.assign(new Error("EIO"), { code: "EIO" }); }
      return originalCopyFile(from, to, mode);
    });
    const error = await tasks.createTaskWithLocalContextFiles({ projectId, description: "Never", localContextFiles: [first, second] }).catch(e => e);
    expect(error).toMatchObject({ code: "TASK_CONTEXT_FILE_UNAVAILABLE", message: `Context file '${second}' could not be copied.` });
    expect(await tasks.listTasks(projectId)).toEqual([]);
    const [taskDir] = await taskDirs();
    expect(await fs.readdir(path.join(layout.tasksDir(projectId), taskDir!, "context"))).toEqual([]);
    expect(await fs.readFile(first, "utf8")).toBe("bytes of first.md");
  });

  it("records the copied size, so a source still growing during the copy stays readable (P-001), and re-checks the cap", async () => {
    const log = await source("server.log", "line 1\n");
    vi.spyOn(fs, "copyFile").mockImplementation(async (from, to, mode) => {
      await originalCopyFile(from, to, mode);
      await fs.appendFile(String(to), "line 2\n");
    });
    const view = await tasks.createTaskWithLocalContextFiles({ projectId, description: "Logs", localContextFiles: [log] });
    expect(view.contextFiles[0]).toMatchObject({ displayName: "server.log", sizeBytes: 14, localPath: expect.any(String) });
    vi.mocked(fs.copyFile).mockImplementation(async (from, to, mode) => {
      await originalCopyFile(from, to, mode);
      await fs.truncate(String(to), CONTEXT_FILE_MAX_BYTES + 1);
    });
    await expect(tasks.updateTaskById({ taskId: view.taskId, localContextFiles: [log] }))
      .rejects.toMatchObject({ code: "TASK_CONTEXT_INVALID", message: expect.stringContaining(log) });
    expect(await contextEntries(view.taskId)).toEqual([view.contextFiles[0]!.storedFilename]);
  });

  it("appends files on a files-only patch, keeps existing files, text and status, and returns only the new files (AC-002, R-2)", async () => {
    const task = await uiTask();
    const before = await taskJson(task.taskId);
    const shot = await source("shot2.png");
    const ack = await tasks.updateTaskById({ taskId: task.taskId, localContextFiles: [shot] });
    const after = await taskJson(task.taskId);
    expect(after.contextFiles).toHaveLength(2);
    expect(after.contextFiles[0]).toEqual(before.contextFiles[0]);
    expect(after.contextFiles[1]).toMatchObject({ displayName: "shot2.png", mimeType: "image/png" });
    expect(after).toMatchObject({ description: before.description, status: "TODO" });
    expect(ack).toEqual({ projectId, taskId: task.taskId, status: "TODO", attachedContextFiles: [after.contextFiles[1]] });
    // Attaching the same source again creates another saved copy (no dedupe).
    const again = await tasks.updateTaskById({ taskId: task.taskId, localContextFiles: [shot] });
    expect(again.attachedContextFiles![0]!.storedFilename).not.toBe(after.contextFiles[1].storedFilename);
    expect((await taskJson(task.taskId)).contextFiles).toHaveLength(3);
    expect(await contextEntries(task.taskId)).toHaveLength(3);
  });

  it("applies description, status and files in one patch; DONE with files adds them and closes runs as today (AC-003)", async () => {
    const task = await uiTask();
    const notes = await source("notes.md");
    await tasks.updateTaskById({ taskId: task.taskId, description: "Revised", status: "IN_PROGRESS", localContextFiles: [notes] });
    expect(await taskJson(task.taskId)).toMatchObject({ description: "Revised", status: "IN_PROGRESS", contextFiles: [expect.anything(), expect.objectContaining({ displayName: "notes.md" })] });
    await tasks.linkNewTaskExecution({ role: "assigned", taskId: task.taskId, assignedBy: "manager", hostRoot, execution: { agentRunId: "worker" } });
    const done = await tasks.updateTaskById({ taskId: task.taskId, status: "DONE", localContextFiles: [await source("result.txt")] });
    expect(done).toMatchObject({ status: "DONE", attachedContextFiles: [expect.objectContaining({ displayName: "result.txt" })] });
    await tasks.drainRuntimeReleases();
    expect((await taskJson(task.taskId)).contextFiles).toHaveLength(3);
    expect(tasks.isOpen({ agentRunId: "worker" })).toBe(false);
    expect(release).toHaveBeenCalledWith(hostRoot, [{ agentRunId: "worker" }]);
  });

  it("changes nothing, including no DONE closure, when a patch names an invalid file (AC-005)", async () => {
    const task = await uiTask();
    await tasks.linkNewTaskExecution({ role: "assigned", taskId: task.taskId, assignedBy: "manager", hostRoot, execution: { agentRunId: "worker" } });
    const before = await taskJson(task.taskId), entries = await contextEntries(task.taskId);
    const missing = path.join(sources, "gone.png");
    await expect(tasks.updateTaskById({ taskId: task.taskId, description: "Never", status: "DONE", localContextFiles: [await source("ok.md"), missing] }))
      .rejects.toMatchObject({ code: "TASK_CONTEXT_FILE_UNAVAILABLE", message: expect.stringContaining(missing) });
    expect(await taskJson(task.taskId)).toEqual(before);
    expect(await contextEntries(task.taskId)).toEqual(entries);
    expect(tasks.isOpen({ agentRunId: "worker" })).toBe(true);
    expect(release).not.toHaveBeenCalled();
  });

  it("requires a change: an empty files list alone is TASK_PATCH_REQUIRED; a patch without files keeps the plain acknowledgement (AC-004, AC-009)", async () => {
    const task = await uiTask();
    await expect(tasks.updateTaskById({ taskId: task.taskId, localContextFiles: [] })).rejects.toMatchObject({ code: "TASK_PATCH_REQUIRED" });
    await expect(tasks.updateTaskById({ taskId: task.taskId, description: "Plain" })).resolves.toEqual({ projectId, taskId: task.taskId, status: "TODO" });
  });

  it("rejects files on a Task with no Project before any write; its text/status patch still works (AC-007)", async () => {
    const { taskId } = await tasks.linkNewTaskExecution({ role: "assigned", assignedBy: "delegator", hostRoot, execution: { agentRunId: "copy" },
      adHocTask: { description: "Ad-hoc", referenceFiles: [] } });
    await expect(tasks.updateTaskById({ taskId, status: "DONE", localContextFiles: [await source("notes.md")] }))
      .rejects.toMatchObject({ code: "TASK_CONTEXT_INVALID", message: "Context files can be attached only to Project Tasks; this Task has no Project." });
    expect(tasks.isOpen({ agentRunId: "copy" })).toBe(true);
    await expect(tasks.updateTaskById({ taskId, description: "Still editable" })).resolves.toEqual({ projectId: null, taskId, status: "TODO" });
  });
});
