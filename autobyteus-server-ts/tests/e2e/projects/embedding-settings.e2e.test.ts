import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { EMBEDDING_MODEL_CATALOG } from "../../../src/embeddings/catalog/embedding-model-catalog.js";
import { resolveActiveEmbeddingModel } from "../../../src/embeddings/catalog/embedding-model-setting.js";
import { resetEmbeddingIndexForTests } from "../../../src/embeddings/embedding-index.js";
import { resetProjectTaskServiceForTests } from "../../../src/projects/services/project-task-service.js";
import { resetProjectServiceForTests } from "../../../src/projects/services/project-service.js";
import { resetProjectStoreForTests } from "../../../src/projects/stores/project-store.js";
import { resetProjectTaskContextStoreForTests } from "../../../src/projects/context/project-task-context-store.js";
import { createFakeEmbeddingIndex, fakeModel } from "../../helpers/fake-embedding-model.js";

// Settings → Server Settings → Embedding over the real Studio HTTP (GraphQL) and the real composition, over
// test-owned files. The catalog keeps its real ids, names and sizes; only downloads and the model runtime are
// deterministic stand-ins (no model is downloaded). The active model follows the real server setting.
const reset = () => { resetProjectTaskServiceForTests(); resetProjectServiceForTests(); resetProjectStoreForTests(); resetProjectTaskContextStoreForTests(); };
const STATUS = `query EmbeddingSettings {
  embeddingModelsStatus { activeModelId defaultModelId onDiskBytes
    models { id displayName languages downloadBytes file { state done total reason } activeDisplay { state phase done total reason } } }
  projectTaskIndexes { projectId name state done total changed }
}`;
type Model = { id: string; downloadBytes: number; file: { state: string; done: number | null; total: number | null; reason: string | null };
  activeDisplay: { state: string; phase: string | null; done: number | null; total: number | null; reason: string | null } | null };
type Status = {
  embeddingModelsStatus: { activeModelId: string; defaultModelId: string; onDiskBytes: number; models: Model[] };
  projectTaskIndexes: Array<{ projectId: string; name: string; state: string; done: number | null; total: number | null; changed: number | null }>;
};
const GRANITE = "granite-embedding-small-english-r2";
const LEAF = "mdbr-leaf-ir";

describe("Embedding settings over the production GraphQL boundary", () => {
  let root: string, origin: string, app: FastifyInstance, flags: Record<string, string>;
  let fake: Awaited<ReturnType<typeof createFakeEmbeddingIndex>>;
  let failure: Error | null = null;
  let projectId: string, emptyProjectId: string;
  const gql = async <T>(query: string, variables: Record<string, unknown> = {}) => {
    const response = await fetch(`${origin}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    expect(response.status).toBe(200);
    return await response.json() as { data: T; errors?: Array<{ message: string; extensions?: { code?: string } }> };
  };
  const ok = async <T>(query: string, variables: Record<string, unknown> = {}) => {
    const body = await gql<T>(query, variables);
    expect(body.errors).toBeUndefined();
    return body.data;
  };
  const refusal = async (query: string, variables: Record<string, unknown> = {}) => {
    const body = await gql(query, variables);
    return { code: body.errors?.[0]?.extensions?.code, message: body.errors?.[0]?.message };
  };
  const status = () => ok<Status>(STATUS);
  const active = async () => {
    const current = (await status()).embeddingModelsStatus;
    return current.models.find((model) => model.id === current.activeModelId)!;
  };
  const until = async (check: (current: Status) => boolean) => {
    for (let i = 0; i < 400; i++) {
      if (check(await status())) return;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error("state never reached");
  };
  const indexOf = (current: Status, id: string) => current.projectTaskIndexes.find((project) => project.projectId === id)!;
  const createTask = (description: string) => ok("mutation($i:CreateProjectTaskInput!){createProjectTask(input:$i){taskId}}", { i: { projectId, title: description, description } });

  beforeAll(async () => {
    flags = Object.fromEntries(Object.entries(process.env).filter(([k, v]) => (k.startsWith("ENABLE_") || k.startsWith("AUTOBYTEUS_")) && v !== undefined)) as Record<string, string>;
    for (const key of Object.keys(flags)) delete process.env[key];
    root = await fs.mkdtemp(path.join(os.tmpdir(), "embedding-settings-e2e-"));
    process.env.AUTOBYTEUS_TEMP_WORKSPACE_DIR = path.join(root, "temp_workspace");
    await fs.writeFile(path.join(root, ".env"), "APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\n");
    appConfigProvider.resetForTests(); appConfigProvider.config.setCustomAppDataDir(root); reset();
    const catalog = EMBEDDING_MODEL_CATALOG.map((model) => fakeModel(model.id, { displayName: model.displayName, languages: model.languages, files: model.files }));
    fake = await createFakeEmbeddingIndex({
      rootDir: path.join(root, "embeddings"), catalog, failDownload: () => failure,
      model: () => catalog.find((model) => model.id === resolveActiveEmbeddingModel().id)!,
    });
    resetEmbeddingIndexForTests(fake.index);
    const started = await startStudioE2eRuntimeServer(); app = started.fastify; origin = started.mainUrl.origin;
    const create = async (name: string) => (await ok<{ createProject: { projectId: string } }>(
      "mutation($i:CreateProjectInput!){createProject(input:$i){projectId}}", { i: { name } })).createProject.projectId;
    projectId = await create("Billing");
    emptyProjectId = await create("Archive");
  }, 120000);
  afterAll(async () => {
    if (app) await app.close(); reset(); resetEmbeddingIndexForTests(); appConfigProvider.resetForTests();
    for (const key of Object.keys(process.env)) if (key.startsWith("ENABLE_") || key.startsWith("AUTOBYTEUS_")) delete process.env[key];
    Object.assign(process.env, flags);
    if (root) await fs.rm(root, { recursive: true, force: true });
  });

  it("answers models and Project indexes in one read-only document: fresh install is Not downloaded and Not indexed (AC-011)", async () => {
    await createTask("Docker image fails on ARM servers");
    await createTask("Sidebar collapse state is lost after restart");
    const current = await status();
    expect(current.embeddingModelsStatus).toMatchObject({ activeModelId: GRANITE, defaultModelId: GRANITE, onDiskBytes: 0 });
    expect(current.embeddingModelsStatus.models.map((model) => [model.id, model.file.state, model.activeDisplay?.state ?? null])).toEqual([
      [GRANITE, "NOT_DOWNLOADED", "NOT_DOWNLOADED"], [LEAF, "NOT_DOWNLOADED", null], ["embeddinggemma-2", "NOT_DOWNLOADED", null],
    ]);
    expect(current.embeddingModelsStatus.models[0]!.downloadBytes).toBe(EMBEDDING_MODEL_CATALOG[0]!.files.reduce((sum, file) => sum + file.bytes, 0));
    expect(current.projectTaskIndexes).toEqual([
      { projectId: emptyProjectId, name: "Archive", state: "READY", done: null, total: 0, changed: null },
      { projectId, name: "Billing", state: "NOT_INDEXED", done: null, total: 2, changed: null },
    ]);
    await status();
    expect(fake.downloads).toEqual([]);
    expect(fake.runners).toEqual([]);
  });

  it("downloads the active model (Preparing with bytes, not cancellable), then indexes on request", async () => {
    fake.holdDownloads();
    expect((await ok<{ downloadEmbeddingModel: boolean }>("mutation($m:String!){downloadEmbeddingModel(modelId:$m)}", { m: GRANITE })).downloadEmbeddingModel).toBe(true);
    expect((await active()).activeDisplay).toEqual({ state: "PREPARING", phase: "DOWNLOADING", done: 1, total: 2, reason: null });
    expect(await refusal("mutation($m:String!){cancelEmbeddingModelDownload(modelId:$m)}", { m: GRANITE })).toMatchObject({ code: "EMBEDDING_DOWNLOAD_NOT_CANCELLABLE" });
    fake.releaseDownloads();
    await until((current) => current.embeddingModelsStatus.models[0]!.activeDisplay?.state === "READY");
    expect(indexOf(await status(), projectId).state).toBe("NOT_INDEXED");

    expect((await ok<{ indexProjectTasks: boolean }>("mutation($p:String!){indexProjectTasks(projectId:$p)}", { p: projectId })).indexProjectTasks).toBe(true);
    await until((current) => indexOf(current, projectId).state === "READY");
    expect(indexOf(await status(), projectId)).toMatchObject({ state: "READY", total: 2 });
    await createTask("Show token usage and cost per conversation");
    expect(indexOf(await status(), projectId)).toEqual({ projectId, name: "Billing", state: "NEEDS_UPDATE", done: null, total: 3, changed: 1 });
    expect((await ok<{ indexAllProjectTasks: number }>("mutation{indexAllProjectTasks}")).indexAllProjectTasks).toBe(1);
    await until((current) => indexOf(current, projectId).state === "READY");
    expect((await ok<{ rebuildProjectTaskIndex: boolean }>("mutation($p:String!){rebuildProjectTaskIndex(projectId:$p)}", { p: projectId })).rebuildProjectTaskIndex).toBe(true);
    await until((current) => indexOf(current, projectId).state === "READY");
    expect(await refusal("mutation($p:String!){indexProjectTasks(projectId:$p)}", { p: "project_missing" })).toMatchObject({ code: "PROJECT_NOT_FOUND" });
    expect(await refusal("mutation($p:String!){rebuildProjectTaskIndex(projectId:$p)}", { p: "project_missing" })).toMatchObject({ code: "PROJECT_NOT_FOUND" });
  });

  it("downloads another model ahead, refuses removal while it downloads, cancels it, and refuses removing the active model", async () => {
    fake.holdDownloads();
    await ok("mutation($m:String!){downloadEmbeddingModel(modelId:$m)}", { m: LEAF });
    expect((await status()).embeddingModelsStatus.models[1]!.file).toEqual({ state: "DOWNLOADING", done: 1, total: 2, reason: null });
    expect(await refusal("mutation($m:String!){removeEmbeddingModel(modelId:$m)}", { m: LEAF })).toMatchObject({ code: "EMBEDDING_MODEL_DOWNLOADING" });
    expect((await ok<{ cancelEmbeddingModelDownload: boolean }>("mutation($m:String!){cancelEmbeddingModelDownload(modelId:$m)}", { m: LEAF })).cancelEmbeddingModelDownload).toBe(true);
    await until((current) => current.embeddingModelsStatus.models[1]!.file.state === "NOT_DOWNLOADED");
    expect(fake.removed).toEqual([LEAF]);
    fake.releaseDownloads();
    expect(await refusal("mutation($m:String!){cancelEmbeddingModelDownload(modelId:$m)}", { m: LEAF })).toMatchObject({ code: "EMBEDDING_DOWNLOAD_NOT_CANCELLABLE" });
    expect(await refusal("mutation($m:String!){removeEmbeddingModel(modelId:$m)}", { m: GRANITE })).toMatchObject({ code: "EMBEDDING_MODEL_ACTIVE" });
    expect(await refusal("mutation($m:String!){downloadEmbeddingModel(modelId:$m)}", { m: "nope" })).toMatchObject({ code: "EMBEDDING_MODEL_UNKNOWN" });
  });

  it("switches the active model through the setting, prepares it at once, keeps the old files, and shows the Projects as Not indexed", async () => {
    expect(await refusal("mutation($m:String!){useEmbeddingModel(modelId:$m)}", { m: "  " })).toMatchObject({ code: "EMBEDDING_MODEL_UNKNOWN" });
    expect(await refusal("mutation($m:String!){useEmbeddingModel(modelId:$m)}", { m: "bogus" }))
      .toEqual({ code: "EMBEDDING_MODEL_UNKNOWN", message: expect.stringContaining("Embedding model must be blank (default) or one of:") });
    expect(resolveActiveEmbeddingModel().id).toBe(GRANITE);
    // The key set the Advanced way (AC-009) to a model that isn't downloaded shows as Active · Not downloaded and
    // starts nothing (AC-011).
    const downloadsBefore = fake.downloads.length;
    expect((await ok<{ updateServerSetting: string }>("mutation($k:String!,$v:String!){updateServerSetting(key:$k,value:$v)}",
      { k: "AUTOBYTEUS_EMBEDDING_MODEL", v: LEAF })).updateServerSetting).toContain("updated successfully");
    const advanced = (await status()).embeddingModelsStatus;
    expect(advanced.activeModelId).toBe(LEAF);
    expect(advanced.models[1]).toMatchObject({ file: { state: "NOT_DOWNLOADED" }, activeDisplay: { state: "NOT_DOWNLOADED" } });
    expect(advanced.models[0]!.activeDisplay).toBeNull();
    expect(fake.downloads).toHaveLength(downloadsBefore);
    expect((await ok<{ useEmbeddingModel: boolean }>("mutation($m:String!){useEmbeddingModel(modelId:$m)}", { m: LEAF })).useEmbeddingModel).toBe(true);
    expect(appConfigProvider.config.get("AUTOBYTEUS_EMBEDDING_MODEL")).toBe(LEAF);
    await until((current) => current.embeddingModelsStatus.activeModelId === LEAF && current.embeddingModelsStatus.models[1]!.activeDisplay?.state === "READY");
    const current = await status();
    expect(current.embeddingModelsStatus.models[0]).toMatchObject({ file: { state: "DOWNLOADED" }, activeDisplay: null });
    expect(indexOf(current, projectId)).toMatchObject({ state: "NOT_INDEXED", total: 3 });
    // Downloaded files stay until removed; a non-active downloaded model can be removed.
    expect((await ok<{ removeEmbeddingModel: boolean }>("mutation($m:String!){removeEmbeddingModel(modelId:$m)}", { m: GRANITE })).removeEmbeddingModel).toBe(true);
    expect((await status()).embeddingModelsStatus.models[0]!.file.state).toBe("NOT_DOWNLOADED");
  });

  it("shows an unavailable model with its reason, and Retry prepares it again at once (AC-012)", async () => {
    failure = new Error("Could not reach huggingface.co");
    await ok("mutation($m:String!){useEmbeddingModel(modelId:$m)}", { m: "embeddinggemma-2" });
    await until((current) => current.embeddingModelsStatus.models[2]!.activeDisplay?.state === "UNAVAILABLE");
    const current = await status();
    expect(current.embeddingModelsStatus.models[2]).toMatchObject({
      file: { state: "FAILED", reason: "Could not reach huggingface.co" },
      activeDisplay: { state: "UNAVAILABLE", phase: null, reason: "Could not reach huggingface.co" },
    });
    expect(indexOf(current, projectId)).toEqual({ projectId, name: "Billing", state: "UNAVAILABLE", done: null, total: null, changed: null });
    failure = null;
    expect((await ok<{ retryEmbeddingModel: boolean }>("mutation{retryEmbeddingModel}")).retryEmbeddingModel).toBe(true);
    await until((now) => now.embeddingModelsStatus.models[2]!.activeDisplay?.state === "READY");
  });

  it("indexes a Project a few seconds after Task writes, with no search, once the model is on disk (REQ-011, AC-015)", async () => {
    // The active model (prepared by the Retry above) is on disk.
    expect((await status()).embeddingModelsStatus.models[2]!.activeDisplay?.state).toBe("READY");
    const fresh = (await ok<{ createProject: { projectId: string } }>("mutation($i:CreateProjectInput!){createProject(input:$i){projectId}}", { i: { name: "Fresh" } })).createProject.projectId;
    const search = vi.spyOn(fake.index, "search");
    const started = Date.now();
    const created = (await ok<{ createProjectTask: { taskId: string } }>("mutation($i:CreateProjectTaskInput!){createProjectTask(input:$i){taskId}}",
      { i: { projectId: fresh, title: "Invoice PDF export fails for long names", description: "Invoice PDF export fails for long names" } })).createProjectTask;
    await ok("mutation($i:UpdateProjectTaskInput!){updateProjectTask(input:$i){taskId}}",
      { i: { projectId: fresh, taskId: created.taskId, title: "Invoice PDF export fails for long customer names", description: "Invoice PDF export fails for long customer names" } });
    await ok("mutation($i:CreateProjectTaskInput!){createProjectTask(input:$i){taskId}}", { i: { projectId: fresh, title: "Refund flow for annual plans", description: "Refund flow for annual plans" } });
    expect(Date.now() - started).toBeLessThan(1_000);
    expect(indexOf(await status(), fresh).state).toBe("NOT_INDEXED");
    for (const deadline = Date.now() + 10_000; Date.now() < deadline && indexOf(await status(), fresh).state !== "READY";) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    expect(indexOf(await status(), fresh)).toMatchObject({ state: "READY", total: 2 });
    expect(search).not.toHaveBeenCalled();
    search.mockRestore();
  }, 20_000);
});
