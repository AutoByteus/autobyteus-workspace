/**
 * Real-model quality check of the embedding catalog on the production stack (onnxruntime-web WebAssembly worker +
 * tokenizer), over the synthetic Task set in tests/fixtures/project-task-search (no user data) and, on request, two
 * 1,000-Task backlogs (tests/helpers/project-task-search-backlogs.ts).
 *
 * Gate: RUN_EMBEDDING_MODEL_E2E=1 (downloads the model from Hugging Face on first run).
 * Options:
 *   TEST_EMBEDDING_MODELS=all | <id>[,<id>]   models to check (default: the default model only)
 *   TEST_EMBEDDING_SCALE=1                    also check the two 1,000-Task backlogs (about 20–40 min for the default model)
 *   TEST_EMBEDDING_MODEL_CACHE=<dir>          reuse downloaded models (default: a temp folder removed afterwards)
 *   TEST_EMBEDDING_CALIBRATION_OUT=<file>     write the per-model measurements as JSON (calibration evidence)
 * Command: RUN_EMBEDDING_MODEL_E2E=1 TEST_EMBEDDING_SCALE=1 pnpm -C autobyteus-server-ts exec vitest run
 *   tests/integration/embeddings/embedding-model-quality.integration.test.ts --no-watch
 *
 * Checks (AC-001: the target Task is shown among the first 5 meaning matches of the model's relevance rule; AC-004: an
 * unrelated query shows no meaning match):
 *   - every model, on the 60-Task fixture: QR-007 (target in the top 5 for at least 90% of the paraphrased queries and
 *     in the top 10 for 95%), AC-001 and AC-004 for at least 90%;
 *   - the default model, on both 1,000-Task backlogs: AC-001 and AC-004 for at least 90% (DEC-011). Other models'
 *     results at that scale are recorded, not asserted (docs/modules/embeddings.md states them).
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { DEFAULT_EMBEDDING_MODEL_ID, EMBEDDING_MODEL_CATALOG } from "../../../src/embeddings/catalog/embedding-model-catalog.js";
import type { EmbeddingModelDefinition } from "../../../src/embeddings/catalog/embedding-model-definition.js";
import { EmbeddingModelFiles } from "../../../src/embeddings/models/embedding-model-files.js";
import { selectRelevant } from "../../../src/embeddings/relevance.js";
import { EmbeddingModelRunner } from "../../../src/embeddings/runtime/embedding-model-runner.js";
import { generatedBacklog, repositoryBacklog } from "../../helpers/project-task-search-backlogs.js";

const fixtureDir = path.resolve(import.meta.dirname, "../../fixtures/project-task-search");
const repoRoot = path.resolve(import.meta.dirname, "../../../..");
type Task = { id: string; description: string };
type Fixture = { paraphrases: Array<{ q: string; targets: string[] }>; unrelated: string[] };

const enabled = process.env.RUN_EMBEDDING_MODEL_E2E === "1";
const scale = process.env.TEST_EMBEDDING_SCALE === "1";
const requested = process.env.TEST_EMBEDDING_MODELS?.trim();
const models = EMBEDDING_MODEL_CATALOG.filter((model) => requested === "all"
  ? true : (requested ? requested.split(",").map((id) => id.trim()) : [DEFAULT_EMBEDDING_MODEL_ID]).includes(model.id));
const dot = (a: Float32Array, b: Float32Array) => a.reduce((sum, value, i) => sum + value * (b[i] ?? 0), 0);
const quantile = (values: number[], q: number) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(q * values.length))] ?? 0;
const round = (value: number) => Math.round(value * 1000) / 1000;
const measurements: Record<string, unknown> = {};

/** The measurements of one model on one backlog, from precomputed document and query vectors. */
const measure = (model: EmbeddingModelDefinition, docs: Array<{ id: string; vector: Float32Array }>, fixture: Fixture, queryVectors: Map<string, Float32Array>) => {
  const rank = (query: string) => docs.map((doc) => ({ id: doc.id, score: dot(queryVectors.get(query)!, doc.vector) })).sort((a, b) => b.score - a.score);
  let top5 = 0, top10 = 0, shownInFirst5 = 0;
  const bestOnTopic: number[] = [], gapToTarget: number[] = [], shownCounts: number[] = [];
  for (const { q, targets } of fixture.paraphrases) {
    const ranked = rank(q);
    const position = ranked.findIndex((item) => targets.includes(item.id));
    if (position < 5) top5++;
    if (position < 10) top10++;
    bestOnTopic.push(ranked[0]!.score);
    gapToTarget.push(ranked[0]!.score - ranked[position]!.score);
    const matches = selectRelevant(ranked, model.relevance, 20);
    shownCounts.push(matches.length);
    const shownPosition = matches.findIndex((item) => targets.includes(item.id));
    if (shownPosition >= 0 && shownPosition < 5) shownInFirst5++;
  }
  const bestUnrelated: number[] = [];
  let unrelatedWithoutMatch = 0;
  for (const q of fixture.unrelated) {
    const ranked = rank(q);
    bestUnrelated.push(ranked[0]!.score);
    if (!selectRelevant(ranked, model.relevance, 20).length) unrelatedWithoutMatch++;
  }
  const n = fixture.paraphrases.length;
  return {
    tasks: docs.length, queries: n, unrelatedQueries: fixture.unrelated.length,
    top5: round(top5 / n), top10: round(top10 / n), shownInFirst5: round(shownInFirst5 / n),
    unrelatedWithoutMatch: round(unrelatedWithoutMatch / fixture.unrelated.length),
    bestOnTopic: { min: round(Math.min(...bestOnTopic)), p05: round(quantile(bestOnTopic, 0.05)), median: round(quantile(bestOnTopic, 0.5)) },
    bestUnrelated: { max: round(Math.max(...bestUnrelated)), p90: round(quantile(bestUnrelated, 0.9)), median: round(quantile(bestUnrelated, 0.5)) },
    gapToTarget: { p90: round(quantile(gapToTarget, 0.9)), p95: round(quantile(gapToTarget, 0.95)), max: round(Math.max(...gapToTarget)) },
    shownMatches: { median: quantile(shownCounts, 0.5), p90: quantile(shownCounts, 0.9), max: Math.max(...shownCounts) },
    samples: { bestOnTopic: bestOnTopic.map(round).sort(), bestUnrelated: bestUnrelated.map(round).sort() },
  };
};

describe.skipIf(!enabled)("embedding catalog quality on the production stack (real models)", () => {
  let tempCache: string | null = null;
  const cacheDir = async () => process.env.TEST_EMBEDDING_MODEL_CACHE
    ?? (tempCache ??= await fs.mkdtemp(path.join(os.tmpdir(), "embedding-models-")));

  afterAll(async () => {
    if (process.env.TEST_EMBEDDING_CALIBRATION_OUT) {
      await fs.writeFile(process.env.TEST_EMBEDDING_CALIBRATION_OUT, JSON.stringify(measurements, null, 2));
    }
    if (tempCache) await fs.rm(tempCache, { recursive: true, force: true });
  });

  it.each(models.map((model) => [model.id, model] as const))("%s meets QR-007, AC-001 and AC-004", async (_id, model: EmbeddingModelDefinition) => {
    const fixtureTasks = JSON.parse(await fs.readFile(path.join(fixtureDir, "tasks.json"), "utf8")) as Task[];
    const fixture = JSON.parse(await fs.readFile(path.join(fixtureDir, "queries.json"), "utf8")) as Fixture;
    const backlogs: Record<string, Task[]> = { fixture: fixtureTasks };
    if (scale) {
      backlogs.generated = [...fixtureTasks, ...generatedBacklog()];
      backlogs.repository = [...fixtureTasks, ...repositoryBacklog(repoRoot)];
    }
    const modelDir = await new EmbeddingModelFiles(await cacheDir()).ensure(model);
    const runner = new EmbeddingModelRunner(model, modelDir);
    try {
      const loadStart = performance.now();
      await runner.start();
      const loadMs = performance.now() - loadStart;
      const queries = [...fixture.paraphrases.map((p) => p.q), ...fixture.unrelated];
      const queryVectors = new Map((await runner.embed("query", queries)).map((vector, i) => [queries[i]!, vector]));
      const vectorOf = new Map<string, Float32Array>();
      const result: Record<string, unknown> = { calibration: model.relevance, loadMs: Math.round(loadMs) };
      for (const [name, tasks] of Object.entries(backlogs)) {
        const missing = tasks.filter((task) => !vectorOf.has(task.description));
        const indexStart = performance.now();
        const vectors = await runner.embed("document", missing.map((task) => task.description));
        missing.forEach((task, i) => vectorOf.set(task.description, vectors[i]!));
        const msPerTask = missing.length ? Math.round((performance.now() - indexStart) / missing.length) : null;
        const docs = tasks.map((task) => ({ id: task.id, vector: vectorOf.get(task.description)! }));
        expect(docs[0]!.vector).toHaveLength(model.dimensions);
        result[name] = { ...measure(model, docs, fixture, queryVectors), msPerNewTask: msPerTask };
      }
      measurements[model.id] = result;
      const summary = Object.fromEntries(Object.entries(backlogs).map(([name]) => {
        const r = result[name] as ReturnType<typeof measure>;
        return [name, { tasks: r.tasks, top5: r.top5, top10: r.top10, shownInFirst5: r.shownInFirst5, unrelatedWithoutMatch: r.unrelatedWithoutMatch }];
      }));
      console.info(`EMBEDDING_MODEL_QUALITY ${model.id} ${JSON.stringify(summary)}`);

      const onFixture = result.fixture as ReturnType<typeof measure>;
      expect(onFixture.top5).toBeGreaterThanOrEqual(0.9);
      expect(onFixture.top10).toBeGreaterThanOrEqual(0.95);
      expect(onFixture.shownInFirst5).toBeGreaterThanOrEqual(0.9);
      expect(onFixture.unrelatedWithoutMatch).toBeGreaterThanOrEqual(0.9);
      if (model.id === DEFAULT_EMBEDDING_MODEL_ID) {
        for (const name of Object.keys(backlogs)) {
          const r = result[name] as ReturnType<typeof measure>;
          expect.soft(r.shownInFirst5, `${name}: AC-001`).toBeGreaterThanOrEqual(0.9);
          expect.soft(r.unrelatedWithoutMatch, `${name}: AC-004`).toBeGreaterThanOrEqual(0.9);
        }
      }
    } finally {
      await runner.stop();
    }
  }, 180 * 60_000);
});
