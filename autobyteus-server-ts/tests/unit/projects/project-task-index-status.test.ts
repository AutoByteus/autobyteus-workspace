import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { ProjectError } from "../../../src/projects/domain/project-errors.js";
import { getProjectService, resetProjectServiceForTests } from "../../../src/projects/services/project-service.js";
import { ProjectTaskService, resetProjectTaskServiceForTests } from "../../../src/projects/services/project-task-service.js";
import { resetProjectStoreForTests } from "../../../src/projects/stores/project-store.js";
import { resetProjectTaskContextStoreForTests } from "../../../src/projects/context/project-task-context-store.js";
import {
  initializeProjectTaskSearchService, processProjectTaskSearchCleanup, processProjectTaskSearchMarks, releaseProjectTaskSearchService,
  type ProjectTaskSearchService,
} from "../../../src/projects/search/project-task-search-service.js";
import { createFakeEmbeddingIndex, fakeModel } from "../../helpers/fake-embedding-model.js";

// SR-007: Settings' index status caches only inputs (fingerprints) and is computed fresh at every read; Task writes
// index their Project in the background when the active model is on disk (REQ-011). Real Project files and Task
// service (with its post-commit marks wired as in production); only the model is the deterministic stand-in.
const reset = () => { resetProjectServiceForTests(); resetProjectTaskServiceForTests(); resetProjectStoreForTests(); resetProjectTaskContextStoreForTests(); };
const MODEL_A = fakeModel("fake-model-a");
const MODEL_B = fakeModel("fake-model-b");
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Project index status and index after writes", () => {
  let root: string, tasks: ProjectTaskService, search: ProjectTaskSearchService;
  let fake: Awaited<ReturnType<typeof createFakeEmbeddingIndex>>;
  let active = MODEL_A;
  let listFailure: Error | null = null;
  const listed: string[] = [];
  const start = (indexAfterWriteMs = 60_000) => {
    releaseProjectTaskSearchService();
    search = initializeProjectTaskSearchService({
      listProjects: () => getProjectService().listProjectSummaries(),
      listTasks: async (projectId) => {
        listed.push(projectId);
        if (listFailure) throw listFailure;
        return tasks.listTasks(projectId);
      },
      index: () => fake.index,
      indexAfterWriteMs,
    });
  };
  const project = async (name: string) => (await getProjectService().createProject({ name })).projectId;
  const status = async (projectId: string) => (await search.indexStatus()).find((entry) => entry.projectId === projectId)!;
  const until = async (check: () => Promise<boolean>, ms = 2_000) => {
    for (const deadline = Date.now() + ms; Date.now() < deadline;) {
      if (await check()) return;
      await sleep(5);
    }
    throw new Error("condition not reached");
  };
  /** The model files on disk (a first preparation done), without any collection indexed. */
  const modelOnDisk = async () => {
    fake.index.prepareActiveModel();
    await until(async () => fake.index.activeModelOnDisk() && (await fake.index.modelsStatus()).models[0]!.activeDisplay?.state === "ready");
  };

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "project-index-status-"));
    appConfigProvider.resetForTests(); appConfigProvider.initialize({ appDataDir: root });
    reset();
    active = MODEL_A;
    listFailure = null;
    fake = await createFakeEmbeddingIndex({ model: () => active, catalog: [MODEL_A, MODEL_B] });
    tasks = new ProjectTaskService({ searchCleanup: processProjectTaskSearchCleanup, changes: {
      ...processProjectTaskSearchMarks, workerStatusChanged: () => undefined, projectChanged: () => undefined, projectRemoved: () => undefined,
    } });
    start();
    listed.length = 0;
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    releaseProjectTaskSearchService();
    await fake.index.shutdown();
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(fake.rootDir, { recursive: true, force: true });
    appConfigProvider.resetForTests(); reset();
  });

  it("reads a Project's Tasks only when they changed, it is new, or the model switched (warm poll: no listTasks)", async () => {
    const alpha = await project("Alpha");
    const beta = await project("Beta");
    const first = await tasks.createTask({ projectId: alpha, title: "Docker image fails on ARM servers", description: "Docker image fails on ARM servers" });
    const second = await tasks.createTask({ projectId: beta, title: "Show token usage and cost per conversation", description: "Show token usage and cost per conversation" });
    listed.length = 0;
    await search.indexStatus();
    expect(listed.sort()).toEqual([alpha, beta].sort());
    listed.length = 0;
    expect((await search.indexStatus()).map((entry) => entry.state)).toEqual(["notIndexed", "notIndexed"]);
    expect(listed).toEqual([]);

    await tasks.updateTask({ projectId: alpha, taskId: first.taskId, description: "Docker container crashes on arm64" });
    await search.indexStatus();
    expect(listed).toEqual([alpha]);
    listed.length = 0;
    await tasks.deleteTask({ projectId: beta, taskId: second.taskId });
    expect((await status(beta))).toMatchObject({ state: "ready", total: 0 });
    expect(listed).toEqual([beta]);

    listed.length = 0;
    active = MODEL_B;
    await search.indexStatus();
    expect(listed.sort()).toEqual([alpha, beta].sort());
    listed.length = 0;
    await getProjectService().deleteProject(beta);
    expect((await search.indexStatus()).map((entry) => entry.projectId)).toEqual([alpha]);
    expect(listed).toEqual([]);
  });

  it("MP-005: after a finished job, an edit shows Needs update on every poll, and Index all includes the Project", async () => {
    const alpha = await project("Alpha");
    const task = await tasks.createTask({ projectId: alpha, title: "Docker image fails on ARM servers", description: "Docker image fails on ARM servers" });
    await tasks.createTask({ projectId: alpha, title: "Sidebar collapse state is lost after restart", description: "Sidebar collapse state is lost after restart" });
    await search.indexProject(alpha);
    await until(async () => (await status(alpha)).state === "ready");
    await tasks.updateTask({ projectId: alpha, taskId: task.taskId, description: "Docker container crashes on arm64" });
    expect(await status(alpha)).toMatchObject({ state: "needsUpdate", changed: 1, total: 2 });
    expect(await status(alpha)).toMatchObject({ state: "needsUpdate", changed: 1, total: 2 });
    const sync = vi.spyOn(fake.index, "sync");
    expect(await search.indexAllProjects()).toBe(1);
    expect(sync.mock.calls.map(([collection]) => collection)).toEqual([`project-tasks/${alpha}`]);
  });

  it("MP-006: the poll after the job finishes shows Ready", async () => {
    const alpha = await project("Alpha");
    await tasks.createTask({ projectId: alpha, title: "Docker image fails on ARM servers", description: "Docker image fails on ARM servers" });
    await modelOnDisk();
    fake.runner().holdDocuments();
    await search.indexProject(alpha);
    await until(async () => (await status(alpha)).state === "indexing");
    expect(await status(alpha)).toEqual({ projectId: alpha, name: "Alpha", state: "indexing", done: 0, total: 1 });
    fake.runner().release();
    await until(async () => (await status(alpha)).state === "ready");
    expect(await status(alpha)).toEqual({ projectId: alpha, name: "Alpha", state: "ready", total: 1 });
  });

  it("MP-007: a board search that indexes the Project between polls shows as Ready on the next poll", async () => {
    const alpha = await project("Alpha");
    await tasks.createTask({ projectId: alpha, title: "Docker image fails on ARM servers", description: "Docker image fails on ARM servers" });
    expect((await status(alpha)).state).toBe("notIndexed");
    await until(async () => (await search.search(alpha, "docker")).meaningSearch.state === "ready");
    expect(await status(alpha)).toMatchObject({ state: "ready", total: 1 });
  });

  it("indexes a Project soon after a Task create or edit with no search, one run per burst (REQ-011, AC-015)", async () => {
    await modelOnDisk();
    // The window restarts on every write; it must outlast the gaps between the three writes below even on a loaded
    // machine (with 40 ms a slow write split the burst into two runs).
    start(250);
    const alpha = await project("Alpha");
    const sync = vi.spyOn(fake.index, "sync");
    const search_ = vi.spyOn(fake.index, "search");
    const task = await tasks.createTask({ projectId: alpha, title: "Docker image fails on ARM servers", description: "Docker image fails on ARM servers" });
    await tasks.updateTask({ projectId: alpha, taskId: task.taskId, description: "Docker container crashes on arm64" });
    await tasks.createTask({ projectId: alpha, title: "Sidebar collapse state is lost after restart", description: "Sidebar collapse state is lost after restart" });
    expect(sync).not.toHaveBeenCalled();
    await until(async () => {
      const current = await status(alpha);
      return current.state === "ready" && current.total === 2;
    });
    expect(sync).toHaveBeenCalledTimes(1);
    expect(search_).not.toHaveBeenCalled();
    expect(fake.runner().documents.sort()).toEqual(["Docker container crashes on arm64", "Sidebar collapse state is lost after restart"]);
  });

  it("loads no model for a write that changes no description (CR-003), and indexes a description edit", async () => {
    const alpha = await project("Alpha");
    const task = await tasks.createTask({ projectId: alpha, title: "Docker image fails on ARM servers", description: "Docker image fails on ARM servers" });
    await search.indexProject(alpha);
    await until(async () => (await status(alpha)).state === "ready");
    // A restart: the model files are on disk, the model is idle (not loaded), and nothing is pending.
    await fake.index.shutdown();
    start(40);
    const runnersBefore = fake.runners.length;
    const sync = vi.spyOn(fake.index, "sync");
    const prepare = vi.spyOn(fake.index, "prepareActiveModel");
    await tasks.updateTask({ projectId: alpha, taskId: task.taskId, status: "IN_PROGRESS" });
    await sleep(150);
    expect(sync).not.toHaveBeenCalled();
    expect(prepare).not.toHaveBeenCalled();
    expect(fake.runners).toHaveLength(runnersBefore);
    expect((await fake.index.modelsStatus()).models[0]!.activeDisplay).toEqual({ state: "ready" });
    expect(await status(alpha)).toMatchObject({ state: "ready", total: 1 });

    await tasks.updateTask({ projectId: alpha, taskId: task.taskId, description: "Docker container crashes on arm64" });
    await until(async () => sync.mock.calls.length === 1);
    await until(async () => (await status(alpha)).state === "ready");
    expect(fake.runners).toHaveLength(runnersBefore + 1);
    expect(fake.runner().documents).toEqual(["Docker container crashes on arm64"]);
  });

  it("never starts a download after a write: nothing is scheduled when the model is not on disk, nor run after a switch to one", async () => {
    start(40);
    const alpha = await project("Alpha");
    const sync = vi.spyOn(fake.index, "sync");
    await tasks.createTask({ projectId: alpha, title: "Docker image fails on ARM servers", description: "Docker image fails on ARM servers" });
    await sleep(120);
    expect(sync).not.toHaveBeenCalled();
    expect(fake.downloads).toEqual([]);
    expect((await status(alpha)).state).toBe("notIndexed");

    // R-14: on disk when scheduled, switched to a model that is not when the run starts.
    await modelOnDisk();
    const downloads = fake.downloads.length;
    await tasks.createTask({ projectId: alpha, title: "Show token usage and cost per conversation", description: "Show token usage and cost per conversation" });
    active = MODEL_B;
    await sleep(120);
    expect(sync).not.toHaveBeenCalled();
    expect(fake.downloads).toHaveLength(downloads);
  });

  it("keeps background runs away from writers: failures are contained, a deleted Project is skipped, shutdown drops pending runs", async () => {
    await modelOnDisk();
    start(40);
    const alpha = await project("Alpha");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    // R-15: a Project gone by the time the run starts (PROJECT_NOT_FOUND) is skipped silently.
    listFailure = new ProjectError("PROJECT_NOT_FOUND", "Project not found.");
    await expect(tasks.createTask({ projectId: alpha, title: "Docker image fails on ARM servers", description: "Docker image fails on ARM servers" })).resolves.toBeTruthy();
    await sleep(120);
    expect(warn).not.toHaveBeenCalled();
    // Any other failure is logged, never thrown.
    listFailure = new Error("disk unavailable");
    await tasks.createTask({ projectId: alpha, title: "Sidebar collapse state is lost after restart", description: "Sidebar collapse state is lost after restart" });
    await until(async () => warn.mock.calls.length > 0);
    expect(warn).toHaveBeenCalledWith("PROJECT_TASK_INDEX_AFTER_WRITE_FAILED", { projectId: alpha, error: "disk unavailable" });
    listFailure = null;
    // Shutdown (and a deleted Project) drop a pending run.
    const sync = vi.spyOn(fake.index, "sync");
    await tasks.createTask({ projectId: alpha, title: "Show token usage and cost per conversation", description: "Show token usage and cost per conversation" });
    releaseProjectTaskSearchService();
    await sleep(120);
    expect(sync).not.toHaveBeenCalled();
  });
});
