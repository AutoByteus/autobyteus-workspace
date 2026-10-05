import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import type { MultipartFile } from "@fastify/multipart";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { ProjectStore } from "../../../src/projects/stores/project-store.js";
import { ProjectService } from "../../../src/projects/services/project-service.js";
import { ProjectTaskService } from "../../../src/projects/services/project-task-service.js";
import { ProjectTaskContextStore } from "../../../src/projects/context/project-task-context-store.js";
import { ProjectsLayout } from "../../../src/projects/stores/projects-layout.js";
import { CONTEXT_FILE_DRAFT_TTL_MS } from "../../../src/context-files/domain/context-file-upload-policy.js";
const upload = (text = "hello", mimetype = "text/plain", truncated = false): MultipartFile => ({
  filename: "note.txt", mimetype, file: Object.assign(Readable.from([Buffer.from(text)]), {truncated}),
}) as unknown as MultipartFile;
describe("Task-owned context transaction", () => {
  let root: string, layout: ProjectsLayout, store: ProjectStore, context: ProjectTaskContextStore, projects: ProjectService, tasks: ProjectTaskService, projectId: string;
  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "task-context-unit-"));
    layout = new ProjectsLayout(path.join(root, "projects"));
    store = new ProjectStore(layout);
    context = new ProjectTaskContextStore(layout);
    projects = new ProjectService({store, workspaceLookup: {getRegisteredWorkspaceRootPath: async () => null}});
    tasks = new ProjectTaskService({store, contextStore: context});
    projectId = (await projects.createProject({name: "Unit fixture"})).projectId;
  });
  afterEach(async () => { vi.restoreAllMocks(); await fs.rm(root, {recursive: true, force: true}); });
  const save = async () => {
    const draft = await tasks.beginContextDraft(projectId);
    const file = await tasks.uploadContextFile(projectId, draft.draftId, upload());
    const task = await tasks.createTask({projectId, description: "Saved", contextDraft: {draftId: draft.draftId, storedFilenames: [file.storedFilename]}});
    return {task, draft, file};
  };
  it("copies real bytes, persists metadata only, projects restart references and retains on Done", async () => {
    const {task} = await save();
    const file = task.contextFiles[0]!;
    expect(await fs.readFile(file.localPath!, "utf8")).toBe("hello");
    const persisted = (await store.listTasks(projectId))[0]!.contextFiles![0]!;
    expect(Object.keys(persisted).sort()).toEqual(["displayName", "mimeType", "sizeBytes", "storedFilename"]);
    const reopened = new ProjectTaskService({store: new ProjectStore(new ProjectsLayout(path.join(root, "projects"))), contextStore: context});
    expect((await reopened.listTasks(projectId))[0]!.contextFiles).toEqual(task.contextFiles);
    await reopened.updateTask({projectId, taskId: task.taskId, status: "DONE"});
    expect(await fs.readFile(file.localPath!, "utf8")).toBe("hello");
    expect((await projects.getProject(projectId))?.taskCount).toBe(1);
    expect((await projects.getProject(projectId))?.openTaskCount).toBe(0);
  });
  it("Cancel touches only draft copies; explicit edit removal deletes saved copies after commit", async () => {
    const {task} = await save();
    const draft = await tasks.beginContextDraft(projectId, task.taskId);
    await tasks.uploadContextFile(projectId, draft.draftId, upload("discard"));
    await tasks.discardContextDraft(projectId, draft.draftId);
    const saved = task.contextFiles[0]!;
    expect(await fs.readFile(saved.localPath!, "utf8")).toBe("hello");
    await tasks.updateTask({projectId, taskId: task.taskId, description: task.description, contextChanges: {removeStoredFilenames: [saved.storedFilename]}});
    expect((await tasks.listTasks(projectId))[0]!.contextFiles).toEqual([]);
    await expect(fs.stat(saved.localPath!)).rejects.toMatchObject({code: "ENOENT"});
  });
  it("rejects wrong owner, traversal, symlink descendants, MIME and truncated streams", async () => {
    const {task} = await save(); const file = task.contextFiles[0]!;
    const other = await tasks.createTask({projectId, description: "Other"});
    await expect(tasks.readSavedContextFile(projectId, other.taskId, file.storedFilename)).rejects.toMatchObject({code: "TASK_CONTEXT_NOT_FOUND"});
    await expect(tasks.readSavedContextFile(projectId, task.taskId, "../note.txt")).rejects.toMatchObject({code: "TASK_CONTEXT_NOT_FOUND"});
    const draft = await tasks.beginContextDraft(projectId, other.taskId);
    const added = await tasks.uploadContextFile(projectId, draft.draftId, upload());
    await expect(tasks.updateTask({projectId, taskId: task.taskId, contextChanges: {draftId: draft.draftId, addStoredFilenames: [added.storedFilename]}})).rejects.toMatchObject({code: "TASK_CONTEXT_INVALID"});
    await expect(tasks.uploadContextFile(projectId, draft.draftId, upload("x", "application/octet-stream"))).rejects.toMatchObject({code: "TASK_CONTEXT_INVALID"});
    await expect(tasks.uploadContextFile(projectId, draft.draftId, upload("x", "text/plain", true))).rejects.toMatchObject({code: "TASK_CONTEXT_INVALID"});
    await fs.writeFile(path.join(root, "outside.txt"), "outside");
    await fs.unlink(file.localPath!); await fs.symlink(path.join(root, "outside.txt"), file.localPath!);
    await expect(tasks.readSavedContextFile(projectId, task.taskId, file.storedFilename)).rejects.toMatchObject({code: "TASK_CONTEXT_NOT_FOUND"});
    expect((await tasks.listTasks(projectId))[0]!.contextFiles.find((f) => f.storedFilename === file.storedFilename)?.localPath).toBeUndefined();
  });
  it("preserves old bytes and original drafts after failure before metadata rename", async () => {
    const {task} = await save(); const old = task.contextFiles[0]!;
    const draft = await tasks.beginContextDraft(projectId, task.taskId);
    const file = await tasks.uploadContextFile(projectId, draft.draftId, upload("new"));
    let commits = 0;
    const rename = vi.spyOn(fs, "rename");
    rename.mockImplementation(async (from, to) => { if (String(to) === layout.taskFile(projectId, task.taskId) && ++commits === 2) throw new Error("precommit failure"); return originalRename(from, to); });
    // First rename is locked housekeeping; fail the second, after immutable copies are prepared.
    await expect(tasks.updateTask({projectId, taskId: task.taskId, contextChanges: {draftId: draft.draftId, addStoredFilenames: [file.storedFilename], removeStoredFilenames: [old.storedFilename]}})).rejects.toThrow("precommit failure");
    expect(await fs.readFile(old.localPath!, "utf8")).toBe("hello");
    expect((await fs.readdir(context.layout.contextDir(projectId, task.taskId))).length).toBe(2);
    expect((await store.listTasks(projectId))[0]!.contextFiles).toHaveLength(1);
    expect(await fs.readFile((await tasks.readDraftContextFile(projectId, draft.draftId, file.storedFilename)).filePath, "utf8")).toBe("new");
  });
  it("returns proven committed metadata even when subsequent lock finalization fails", async () => {
    const draft = await tasks.beginContextDraft(projectId);
    const file = await tasks.uploadContextFile(projectId, draft.draftId, upload("committed bytes"));
    const originalUnlink = fs.unlink.bind(fs);
    const unlink = vi.spyOn(fs, "unlink").mockImplementation(async (file) => {
      if (String(file).endsWith(`${path.sep}task.json.lock`)) throw new Error("release failure");
      return originalUnlink(file);
    });
    const task = await tasks.createTask({projectId, description: "Committed", contextDraft: {draftId: draft.draftId, storedFilenames: [file.storedFilename]}});
    expect((await store.listTasks(projectId))[0]!.taskId).toBe(task.taskId);
    expect(await fs.readFile(task.contextFiles[0]!.localPath!, "utf8")).toBe("committed bytes");
    unlink.mockRestore(); await fs.unlink(`${layout.taskFile(projectId, task.taskId)}.lock`);
  });
  it("expires draft files but never TTL-expires saved references", async () => {
    const {task} = await save(); const saved = task.contextFiles[0]!;
    const draft = await tasks.beginContextDraft(projectId, task.taskId);
    const file = await tasks.uploadContextFile(projectId, draft.draftId, upload());
    const draftPath = (await tasks.readDraftContextFile(projectId, draft.draftId, file.storedFilename)).filePath;
    const old = new Date(Date.now() - CONTEXT_FILE_DRAFT_TTL_MS - 1000);
    await fs.utimes(draftPath, old, old); await fs.utimes(saved.localPath!, old, old);
    await expect(tasks.readDraftContextFile(projectId, draft.draftId, file.storedFilename)).rejects.toMatchObject({code: "TASK_CONTEXT_NOT_FOUND"});
    expect(await fs.readFile((await tasks.readSavedContextFile(projectId, task.taskId, saved.storedFilename)).filePath, "utf8")).toBe("hello");
  });
  it("Task/Project deletion removes only its owned namespace, never original workspace files", async () => {
    const original = path.join(root, "original.txt"); await fs.writeFile(original, "original");
    const {task} = await save();
    await tasks.deleteTask({projectId, taskId: task.taskId});
    await expect(fs.stat(task.contextFiles[0]!.localPath!)).rejects.toMatchObject({code: "ENOENT"});
    const second = await save(); await projects.deleteProject(projectId);
    await expect(fs.stat(second.task.contextFiles[0]!.localPath!)).rejects.toMatchObject({code: "ENOENT"});
    expect(await fs.readFile(original, "utf8")).toBe("original");
  });
  it("cleanup failure cannot turn a confirmed file-removal commit into rollback", async () => {
    const {task} = await save(); const file = task.contextFiles[0]!;
    vi.spyOn(context, "cleanupRemoved").mockRejectedValueOnce(new Error("cleanup unavailable"));
    const result = await tasks.updateTask({projectId, taskId: task.taskId, contextChanges: {removeStoredFilenames: [file.storedFilename]}});
    expect(result.contextFiles).toEqual([]);
    expect(await fs.readFile(file.localPath!, "utf8")).toBe("hello");
    await expect(tasks.readSavedContextFile(projectId, task.taskId, file.storedFilename)).rejects.toMatchObject({code: "TASK_CONTEXT_NOT_FOUND"});
  });
  it("scoped locked housekeeping reclaims old unpublished copies, never current saved references", async () => {
    const {task} = await save(); const file = task.contextFiles[0]!;
    const unpublished = path.join(path.dirname(file.localPath!), "ctx_unused__old.txt");
    await fs.writeFile(unpublished, "unpublished");
    const old = new Date(Date.now() - CONTEXT_FILE_DRAFT_TTL_MS - 1000);
    await fs.utimes(file.localPath!, old, old); await fs.utimes(unpublished, old, old);
    await tasks.beginContextDraft(projectId, task.taskId);
    expect(await fs.readFile(file.localPath!, "utf8")).toBe("hello");
    await expect(fs.stat(unpublished)).rejects.toMatchObject({code: "ENOENT"});
  });

});
const originalRename = fs.rename.bind(fs);
