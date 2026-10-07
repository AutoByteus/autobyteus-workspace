import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectsPerFolderV1AppDataMigration, PROJECTS_PER_FOLDER_V1_MIGRATION_ID } from "../../../src/app-data-migrations/migrations/projects-per-folder-v1/projects-per-folder-v1-app-data-migration.js";
import { AppDataMigrationRegistry } from "../../../src/app-data-migrations/app-data-migration-registry.js";
import { ProjectStore } from "../../../src/projects/stores/project-store.js";
import { ProjectsLayout } from "../../../src/projects/stores/projects-layout.js";
import { ProjectTaskContextStore } from "../../../src/projects/context/project-task-context-store.js";

const fixture = (name: string) => fs.readFile(new URL(`../../fixtures/projects-per-folder-v1/${name}`, import.meta.url), "utf8");
const DRAFT = "3f2a9c1e-0b4d-4e6f-8a7b-9c0d1e2f3a4b";
const detail = (result: Awaited<ReturnType<ProjectsPerFolderV1AppDataMigration["execute"]>>, id: string) =>
  result.summary.details.find(d => d.itemId === id);

describe("projects-per-folder-v1 migration (SR-024)", () => {
  let appData: string, projects: string, layout: ProjectsLayout, migration: ProjectsPerFolderV1AppDataMigration;
  beforeEach(async () => {
    appData = await fs.mkdtemp(path.join(os.tmpdir(), "projects-per-folder-"));
    projects = path.join(appData, "projects");
    layout = new ProjectsLayout(projects);
    migration = new ProjectsPerFolderV1AppDataMigration(appData);
  });
  afterEach(async () => { vi.restoreAllMocks(); await fs.rm(appData, { recursive: true, force: true }); });
  const writeSource = async (content: string) => {
    await fs.mkdir(projects, { recursive: true });
    await fs.writeFile(path.join(projects, "projects.json"), content);
  };
  const writeFile = async (file: string, content: string) => { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, content); };
  const readJson = async (file: string) => JSON.parse(await fs.readFile(file, "utf8"));

  it("is a registered required STARTUP_ONLY definition", () => {
    const definition = new AppDataMigrationRegistry().listDefinitions().find(d => d.id === PROJECTS_PER_FOLDER_V1_MIGRATION_ID);
    expect(definition).toMatchObject({ requiredOnStartup: true, executionPolicy: "STARTUP_ONLY" });
  });

  it("moves the real-shape released sample (1 Project, 2 TODO Tasks, no files) to the exact target and retains the original", async () => {
    const source = await fixture("released-real-shape.json");
    await writeSource(source);
    const result = await migration.execute();
    expect(result).toMatchObject({ status: "SUCCEEDED", summary: { scannedCount: 1, migratedCount: 1, failedCount: 0 } });
    const [released] = JSON.parse(source);
    const { tasks, ...projectFields } = released;
    expect(await readJson(layout.projectFile(released.projectId))).toEqual(projectFields);
    for (const task of tasks) expect(await readJson(layout.taskFile(released.projectId, task.taskId))).toEqual({ ...task, projectId: released.projectId });
    expect(await fs.readFile(path.join(projects, "projects.pre-folders.json"), "utf8")).toBe(source);
    await expect(fs.access(path.join(projects, "projects.json"))).rejects.toThrow();
    // The current store now admits exactly the released Projects and Tasks.
    const store = new ProjectStore(layout);
    expect(await store.listProjects()).toEqual([projectFields]);
    expect((await store.listTasks(released.projectId)).sort((a, b) => a.taskId.localeCompare(b.taskId)))
      .toEqual([...tasks].sort((a: { taskId: string }, b: { taskId: string }) => a.taskId.localeCompare(b.taskId)));
    // Already migrated: a no-op that touches nothing.
    expect(await migration.execute()).toMatchObject({ status: "SUCCEEDED", summary: { scannedCount: 0, migratedCount: 0 } });
  });

  it("renames context and draft directories, skips residue/invalid/duplicate rows with bounded warnings, and removes empty sources", async () => {
    const source = await fixture("released-with-context-drafts-and-residue.json");
    await writeSource(source);
    await writeFile(path.join(projects, "task_context_files", "project_ctx", "project_task_ctx", "ctx_0ad25cc6cad1__requirements.txt"), "requirements");
    await writeFile(path.join(projects, "task_context_drafts", "project_ctx", DRAFT, "manifest.json"),
      JSON.stringify({ projectId: "project_ctx", draftId: DRAFT, files: [] }));
    const result = await migration.execute();
    expect(result.status).toBe("SUCCEEDED_WITH_WARNINGS");
    expect(result.summary).toMatchObject({ scannedCount: 4, migratedCount: 2, failedCount: 0 });
    expect(detail(result, "SKIPPED_INVALID_ROW_WARNING")?.message).toContain("Count: 1");
    expect(detail(result, "SKIPPED_DUPLICATE_PROJECT_WARNING")?.message).toContain("project_ctx");
    expect(detail(result, "SKIPPED_INVALID_TASK_WARNING")?.message).toContain("Count: 1");
    expect(detail(result, "MISSING_CONTEXT_FILE_WARNING")?.message).toContain("ctx_1be36dd7dbe2__missing.txt");
    expect(JSON.stringify(result.summary.details)).not.toContain("dev-lifetime");

    const migrated = await readJson(layout.projectFile("project_ctx"));
    const releasedLink = JSON.parse(source)[0].workspaces[0];
    expect(migrated.workspaces).toEqual([releasedLink]); // exact four-field historical output
    expect((await new ProjectStore(layout).readProject("project_ctx"))!.workspaces).toEqual([
      {workspaceRootPath: releasedLink.workspaceRootPath, description: releasedLink.description},
    ]);
    expect(await readJson(layout.projectFile("project_ctx"))).toEqual(migrated);
    expect(await readJson(layout.taskFile("project_ctx", "project_task_done"))).toMatchObject({ status: "DONE", contextFiles: [] });
    expect(await readJson(layout.projectFile("project_plain"))).toMatchObject({ name: "No tasks key" });
    expect(await fs.readFile(path.join(layout.contextDir("project_ctx", "project_task_ctx"), "ctx_0ad25cc6cad1__requirements.txt"), "utf8")).toBe("requirements");
    await expect(fs.access(path.join(layout.draftDir("project_ctx", DRAFT), "manifest.json"))).resolves.toBeUndefined();
    await expect(fs.access(path.join(projects, "task_context_files"))).rejects.toThrow();
    await expect(fs.access(path.join(projects, "task_context_drafts"))).rejects.toThrow();
    expect(await fs.readFile(path.join(projects, "projects.pre-folders.json"), "utf8")).toBe(source);
    // Current readers see the moved bytes through the new layout.
    const context = new ProjectTaskContextStore(layout);
    const [task] = (await new ProjectStore(layout).listTasks("project_ctx")).filter(t => t.taskId === "project_task_ctx");
    expect(await fs.readFile(await context.savedFile("project_ctx", "project_task_ctx", task!.contextFiles![0]!), "utf8")).toBe("requirements");
    expect((await context.describe("project_ctx", DRAFT)).draftId).toBe(DRAFT);
  });

  it.each(["workspaceId", "addedAt"] as const)("keeps historical %s target conflicts distinct from the tolerant runtime projection", async field => {
    const [released] = JSON.parse(await fixture("released-with-context-drafts-and-residue.json"));
    const {tasks, ...target} = released;
    const conflicting = {...target, workspaces: target.workspaces.map((link: Record<string, unknown>) => ({...link, [field]: "different"}))};
    await writeSource(JSON.stringify([released]));
    const bytes = JSON.stringify(conflicting);
    await writeFile(layout.projectFile(released.projectId), bytes);
    const result = await migration.execute();
    expect(detail(result, "SKIPPED_TARGET_CONFLICT_WARNING")).toBeDefined();
    expect(await fs.readFile(layout.projectFile(released.projectId), "utf8")).toBe(bytes);
    await expect(fs.access(layout.tasksDir(released.projectId))).rejects.toThrow();
  });

  it("an unparsable or non-array source is FAILED with every source untouched and the Projects gate kept", async () => {
    for (const content of ["{ not json", JSON.stringify({ projects: [] })]) {
      await writeSource(content);
      const result = await migration.execute();
      expect(result.status).toBe("FAILED");
      expect(result.errorMessage).toBeTruthy();
      expect(await fs.readFile(path.join(projects, "projects.json"), "utf8")).toBe(content);
      await expect(new ProjectStore(layout).listProjects()).rejects.toMatchObject({ code: "PROJECTS_MIGRATION_PENDING" });
    }
  });

  it("retries after an interruption mid-way (some directories moved) without duplication", async () => {
    const source = await fixture("released-with-context-drafts-and-residue.json");
    await writeSource(source);
    await writeFile(path.join(projects, "task_context_files", "project_ctx", "project_task_ctx", "ctx_0ad25cc6cad1__requirements.txt"), "requirements");
    await writeFile(path.join(projects, "task_context_drafts", "project_ctx", DRAFT, "manifest.json"), JSON.stringify({ projectId: "project_ctx", draftId: DRAFT, files: [] }));
    const rename = fs.rename.bind(fs);
    vi.spyOn(fs, "rename").mockImplementation(async (from, to) => {
      if (String(from).includes(`task_context_drafts${path.sep}project_ctx${path.sep}${DRAFT}`)) throw new Error("interrupted");
      return rename(from, to);
    });
    const first = await migration.execute();
    expect(first.status).toBe("FAILED");
    await expect(fs.access(path.join(projects, "projects.json"))).resolves.toBeUndefined();
    await expect(fs.access(layout.contextDir("project_ctx", "project_task_ctx"))).resolves.toBeUndefined();
    vi.restoreAllMocks();
    const second = await migration.execute();
    expect(second.status).toBe("SUCCEEDED_WITH_WARNINGS");
    expect(second.summary.failedCount).toBe(0);
    await expect(fs.access(path.join(layout.draftDir("project_ctx", DRAFT), "manifest.json"))).resolves.toBeUndefined();
    expect(await fs.readdir(layout.contextDir("project_ctx", "project_task_ctx"))).toEqual(["ctx_0ad25cc6cad1__requirements.txt"]);
    expect((await new ProjectStore(layout).listProjects()).map(p => p.projectId).sort()).toEqual(["project_ctx", "project_plain"]);
  });

  it("a fresh install is a no-op", async () => {
    expect(await migration.execute()).toMatchObject({ status: "SUCCEEDED", summary: { scannedCount: 0 } });
    await expect(fs.access(projects)).rejects.toThrow();
  });

  it("preserves a conflicting existing target and skips an unsafe id (N8) with warnings, never overwriting", async () => {
    const [released] = JSON.parse(await fixture("released-real-shape.json"));
    await writeSource(JSON.stringify([released, { ...released, projectId: "a/b" }]));
    await writeFile(layout.projectFile(released.projectId), JSON.stringify({ projectId: released.projectId, name: "Different", description: "",
      createdAt: "x", updatedAt: "x", workspaces: [] }));
    const result = await migration.execute();
    expect(result.status).toBe("SUCCEEDED_WITH_WARNINGS");
    expect(detail(result, "SKIPPED_TARGET_CONFLICT_WARNING")?.message).toContain(released.projectId);
    expect(detail(result, "SKIPPED_UNSAFE_ID_WARNING")).toBeDefined();
    expect((await readJson(layout.projectFile(released.projectId))).name).toBe("Different");
    await expect(fs.access(layout.tasksDir(released.projectId))).rejects.toThrow();
    await expect(fs.access(path.join(projects, "a"))).rejects.toThrow();
  });
});
