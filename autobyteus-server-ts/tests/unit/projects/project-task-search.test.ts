import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { getProjectService, resetProjectServiceForTests, ProjectService } from "../../../src/projects/services/project-service.js";
import { ProjectTaskService, resetProjectTaskServiceForTests } from "../../../src/projects/services/project-task-service.js";
import { resetProjectStoreForTests } from "../../../src/projects/stores/project-store.js";
import { resetProjectTaskContextStoreForTests } from "../../../src/projects/context/project-task-context-store.js";
import {
  initializeProjectTaskSearchService, processProjectTaskSearchCleanup, ProjectTaskSearchService, releaseProjectTaskSearchService,
} from "../../../src/projects/search/project-task-search-service.js";
import { createFakeEmbeddingIndex } from "../../helpers/fake-embedding-model.js";

const reset = () => { resetProjectServiceForTests(); resetProjectTaskServiceForTests(); resetProjectStoreForTests(); resetProjectTaskContextStoreForTests(); };
const ids = (result: { matches: Array<{ task: { description: string }; match: string }> }) =>
  result.matches.map(({ task, match }) => `${match}:${task.description}`);

describe("ProjectTaskSearchService", () => {
  let root: string, projectId: string, tasks: ProjectTaskService, fake: Awaited<ReturnType<typeof createFakeEmbeddingIndex>>, search: ProjectTaskSearchService;
  const create = (description: string) => tasks.createTask({ projectId, description });
  const ready = async () => {
    for (let i = 0; i < 200; i++) {
      if ((await search.search(projectId, "docker")).meaningSearch.state === "ready") return;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    throw new Error("meaning search did not become ready");
  };
  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "project-task-search-"));
    appConfigProvider.resetForTests(); appConfigProvider.initialize({ appDataDir: root });
    reset();
    projectId = (await getProjectService().createProject({ name: "Search fixture" })).projectId;
    fake = await createFakeEmbeddingIndex();
    tasks = new ProjectTaskService({ searchCleanup: processProjectTaskSearchCleanup });
    search = initializeProjectTaskSearchService({ listTasks: (id) => tasks.listTasks(id), index: () => fake.index });
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    releaseProjectTaskSearchService();
    await fake.index.shutdown();
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(fake.rootDir, { recursive: true, force: true });
    appConfigProvider.resetForTests(); reset();
  });

  it("returns exact matches at once while meaning search prepares, then exact matches first and meaning matches after", async () => {
    await create("Docker image fails on ARM servers");
    await create("Sidebar collapse state is lost after restart");
    await create("Publish the docker container for arm64 hosts");
    await create("Show token usage and cost per conversation");
    const first = await search.search(projectId, "docker");
    expect(first.meaningSearch.state).toBe("preparing");
    expect(ids(first).sort()).toEqual(["exact:Docker image fails on ARM servers", "exact:Publish the docker container for arm64 hosts"]);
    await ready();
    // Case-insensitive containment of the trimmed text is the exact tier; the related Task follows as a meaning match.
    expect(ids(await search.search(projectId, "  DOCKER image "))).toEqual([
      "exact:Docker image fails on ARM servers", "meaning:Publish the docker container for arm64 hosts",
    ]);
    // Both Tasks have the same concept vector here (a tie is ordered by Task id, which is random in this test).
    expect(ids(await search.search(projectId, "container on raspberry pi")).sort()).toEqual([
      "meaning:Docker image fails on ARM servers", "meaning:Publish the docker container for arm64 hosts",
    ]);
    expect(ids(await search.search(projectId, "docker", { limit: 1 }))).toHaveLength(1);
  });

  it("orders exact matches by meaning score, then by latest update", async () => {
    await create("token docker");
    await create("docker docker container image");
    await ready();
    expect(ids(await search.search(projectId, "docker"))).toEqual(["exact:docker docker container image", "exact:token docker"]);
  });

  it("finds an edited Task by its new text and never by its old one; a deleted Task never appears", async () => {
    const task = await create("Sidebar collapse state is lost after restart");
    const other = await create("Show token usage and cost per conversation");
    await ready();
    await tasks.updateTask({ projectId, taskId: task.taskId, description: "Docker container crashes on arm64" });
    expect(ids(await search.search(projectId, "folded navigation panel"))).toEqual([]);
    await ready();
    expect(ids(await search.search(projectId, "container on raspberry"))).toEqual(["meaning:Docker container crashes on arm64"]);
    await tasks.deleteTask({ projectId, taskId: other.taskId });
    expect(ids(await search.search(projectId, "what did it cost in tokens"))).toEqual([]);
  });

  it("keeps exact matches working when meaning search fails, with the reason", async () => {
    await create("Docker image fails on ARM servers");
    vi.spyOn(fake.index, "search").mockRejectedValue(new Error("database disk image is malformed"));
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const result = await search.search(projectId, "docker");
    expect(ids(result)).toEqual(["exact:Docker image fails on ARM servers"]);
    expect(result.meaningSearch).toEqual({ state: "unavailable", reason: "database disk image is malformed" });
  });

  it("rejects blank text and unknown Projects like the other Project operations", async () => {
    await expect(search.search(projectId, "   ")).rejects.toMatchObject({ code: "TASK_SEARCH_QUERY_REQUIRED" });
    await expect(search.search("project_missing", "docker")).rejects.toMatchObject({ code: "PROJECT_NOT_FOUND" });
  });

  it("removes a deleted Task's and a deleted Project's index entries without waiting, and never fails the delete", async () => {
    const task = await create("Docker image fails on ARM servers");
    await ready();
    const removeItems = vi.spyOn(fake.index, "removeItems");
    const dropCollection = vi.spyOn(fake.index, "dropCollection");
    fake.runner().holdDocuments();
    await create("Docker container for arm64");
    await search.search(projectId, "docker");
    // A batch is in flight: the delete must not wait for it.
    expect(await tasks.deleteTask({ projectId, taskId: task.taskId })).toBe(true);
    expect(removeItems).toHaveBeenCalledWith(`project-tasks/${projectId}`, [task.taskId]);
    expect(await getProjectService().deleteProject(projectId)).toBe(true);
    expect(dropCollection).toHaveBeenCalledWith(`project-tasks/${projectId}`);
    fake.runner().release();

    dropCollection.mockImplementation(() => { throw new Error("disk full"); });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const second = (await getProjectService().createProject({ name: "Second" })).projectId;
    expect(await new ProjectService().deleteProject(second)).toBe(true);
    expect(warn).toHaveBeenCalledWith("PROJECT_TASK_SEARCH_CLEANUP_FAILED", expect.objectContaining({ projectId: second, error: "disk full" }));
  });
});
