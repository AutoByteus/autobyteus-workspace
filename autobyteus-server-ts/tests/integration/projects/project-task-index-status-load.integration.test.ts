/**
 * QR-001 / RSK-001 load check of the Embedding section's status read: 20 Projects × 1,000 Tasks, every Project
 * indexed (a few with changed Tasks), then the time of `indexStatus()` + `modelsStatus()` — what one poll of
 * Settings → Server Settings → Embedding costs the server. QR-001 (DEC-012, SR-007): the first load after a start
 * (every Project's Tasks read) within 1 s on the desktop host; every later refresh (fingerprints kept, status computed
 * fresh) within 300 ms. The host load average is recorded with the timings (R-13). Real Project files and the real vector store; only the
 * model is the deterministic stand-in (no download). Gated, because seeding 20,000 Tasks takes minutes:
 *   RUN_PROJECT_INDEX_STATUS_LOAD=1 pnpm exec vitest run tests/integration/projects/project-task-index-status-load.integration.test.ts
 * Options: TEST_STATUS_LOAD_PROJECTS (20), TEST_STATUS_LOAD_TASKS (1000), TEST_STATUS_LOAD_OUT (JSON timings file).
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { getProjectService, resetProjectServiceForTests } from "../../../src/projects/services/project-service.js";
import { ProjectTaskService, resetProjectTaskServiceForTests } from "../../../src/projects/services/project-task-service.js";
import { resetProjectStoreForTests } from "../../../src/projects/stores/project-store.js";
import { resetProjectTaskContextStoreForTests } from "../../../src/projects/context/project-task-context-store.js";
import {
  initializeProjectTaskSearchService, processProjectTaskSearchCleanup, processProjectTaskSearchMarks, releaseProjectTaskSearchService,
  type ProjectTaskSearchService,
} from "../../../src/projects/search/project-task-search-service.js";
import { createFakeEmbeddingIndex } from "../../helpers/fake-embedding-model.js";

const env = process.env;
const enabled = env["RUN_PROJECT_INDEX_STATUS_LOAD"] === "1";
const PROJECTS = Number(env["TEST_STATUS_LOAD_PROJECTS"] ?? 20);
const TASKS = Number(env["TEST_STATUS_LOAD_TASKS"] ?? 1000);
const FIRST_LOAD_BUDGET_MS = 1000;
const REFRESH_BUDGET_MS = 300;
const reset = () => { resetProjectServiceForTests(); resetProjectTaskServiceForTests(); resetProjectStoreForTests(); resetProjectTaskContextStoreForTests(); };
const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]!;

describe.runIf(enabled)("Embedding section status load (QR-001)", () => {
  let root: string, tasks: ProjectTaskService, search: ProjectTaskSearchService, fake: Awaited<ReturnType<typeof createFakeEmbeddingIndex>>;
  const seeded = { ms: 0, projects: 0, tasks: 0 };
  const startSearch = () => {
    releaseProjectTaskSearchService();
    search = initializeProjectTaskSearchService({
      listProjects: () => getProjectService().listProjectSummaries(), listTasks: (id) => tasks.listTasks(id), index: () => fake.index,
      indexAfterWriteMs: 3_600_000,
    });
  };

  beforeAll(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "index-status-load-"));
    appConfigProvider.resetForTests(); appConfigProvider.initialize({ appDataDir: root });
    reset();
    fake = await createFakeEmbeddingIndex({ rootDir: path.join(root, "embeddings"), filesPresent: true });
    // As composed in production (index-after-write kept out of the measurement).
    tasks = new ProjectTaskService({ searchCleanup: processProjectTaskSearchCleanup, changes: {
      ...processProjectTaskSearchMarks, workerStatusChanged: () => undefined, projectChanged: () => undefined, projectRemoved: () => undefined,
    } });
    startSearch();
    const started = Date.now();
    for (let p = 0; p < PROJECTS; p++) {
      const { projectId } = await getProjectService().createProject({ name: `Load ${String(p).padStart(2, "0")}` });
      for (let start = 0; start < TASKS; start += 50) {
        await Promise.all(Array.from({ length: Math.min(50, TASKS - start) }, (_, i) =>
          tasks.createTask({ projectId, title: `Task ${start + i} of project ${p}: docker image sidebar token cost ${(start + i) % 97}`, description: `Task ${start + i} of project ${p}: docker image sidebar token cost ${(start + i) % 97}` })));
      }
      seeded.projects++;
      seeded.tasks += TASKS;
    }
    expect(await search.indexAllProjects()).toBe(PROJECTS);
    for (let i = 0; i < 2_000; i++) {
      if ((await search.indexStatus()).every((project) => project.state === "ready")) break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    // A few Projects with edited Tasks, so the status also computes "Needs update".
    const projects = await search.indexStatus();
    for (const project of projects.slice(0, 3)) {
      const [first] = await tasks.listTasks(project.projectId);
      await tasks.updateTask({ projectId: project.projectId, taskId: first!.taskId, description: `${first!.description} (edited)` });
    }
    seeded.ms = Date.now() - started;
  }, 1_800_000);

  afterAll(async () => {
    releaseProjectTaskSearchService();
    await fake.index.shutdown();
    await fs.rm(root, { recursive: true, force: true });
    appConfigProvider.resetForTests(); reset();
  });

  it(`answers the first load within ${FIRST_LOAD_BUDGET_MS} ms and every refresh within ${REFRESH_BUDGET_MS} ms`, async () => {
    const poll = async () => {
      const started = performance.now();
      const [projects] = await Promise.all([search.indexStatus(), fake.index.modelsStatus()]);
      return { ms: performance.now() - started, projects };
    };
    // A restarted server: no in-memory jobs (fingerprints from the store), and no kept Task fingerprints.
    await fake.index.shutdown();
    startSearch();
    const loadBefore = os.loadavg();
    const first = await poll();
    const runs: number[] = [];
    for (let i = 0; i < 10; i++) runs.push((await poll()).ms);
    const states = first.projects.reduce<Record<string, number>>((counts, project) => ({ ...counts, [project.state]: (counts[project.state] ?? 0) + 1 }), {});
    const result = {
      projects: PROJECTS, tasksPerProject: TASKS, seedingMs: seeded.ms, states,
      firstLoadMs: Math.round(first.ms), refreshMs: runs.map(Math.round), medianRefreshMs: Math.round(median(runs)), maxRefreshMs: Math.round(Math.max(...runs)),
      firstLoadBudgetMs: FIRST_LOAD_BUDGET_MS, refreshBudgetMs: REFRESH_BUDGET_MS,
      hostLoadAverage: { before: loadBefore.map((value) => Number(value.toFixed(2))), after: os.loadavg().map((value) => Number(value.toFixed(2))) },
      node: process.version, platform: `${process.platform}-${process.arch}`, cpus: os.cpus().length,
    };
    console.log("INDEX_STATUS_LOAD", JSON.stringify(result));
    if (env["TEST_STATUS_LOAD_OUT"]) await fs.writeFile(env["TEST_STATUS_LOAD_OUT"], JSON.stringify(result, null, 2));
    expect(states).toEqual({ ready: PROJECTS - 3, needsUpdate: 3 });
    expect(first.ms).toBeLessThan(FIRST_LOAD_BUDGET_MS);
    expect(Math.max(...runs)).toBeLessThan(REFRESH_BUDGET_MS);
  }, 120_000);
});
