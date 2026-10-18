/**
 * Real-model quality check of the embedding catalog on the production stack (onnxruntime-web WebAssembly worker +
 * tokenizer), over the synthetic Task set in tests/fixtures/project-task-search (no user data).
 *
 * Gate: RUN_EMBEDDING_MODEL_E2E=1 (downloads the model from Hugging Face on first run).
 * Options:
 *   TEST_EMBEDDING_MODELS=all | <id>[,<id>]   models to check (default: the default model only)
 *   TEST_EMBEDDING_MODEL_CACHE=<dir>          reuse downloaded models (default: a temp folder removed afterwards)
 *   TEST_EMBEDDING_CALIBRATION_OUT=<file>     write the per-model measurements as JSON (calibration evidence)
 * Command: RUN_EMBEDDING_MODEL_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/integration/embeddings/embedding-model-quality.integration.test.ts --no-watch
 *
 * Checks per model:
 *   - QR-007: the target Task is in the top 5 for at least 90% of the paraphrased queries and in the top 10 for 95%;
 *   - AC-001 with the model's relevance rule: the target is among the shown meaning matches for at least 90%;
 *   - AC-004: at least 90% of the unrelated queries get no meaning match.
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

const fixtureDir = path.resolve(import.meta.dirname, "../../fixtures/project-task-search");
type FixtureTask = { id: string; status: string; description: string };
type Fixture = { paraphrases: Array<{ q: string; targets: string[] }>; unrelated: string[] };

const enabled = process.env.RUN_EMBEDDING_MODEL_E2E === "1";
const requested = process.env.TEST_EMBEDDING_MODELS?.trim();
const models = EMBEDDING_MODEL_CATALOG.filter((model) => requested === "all"
  ? true : (requested ? requested.split(",").map((id) => id.trim()) : [DEFAULT_EMBEDDING_MODEL_ID]).includes(model.id));
const dot = (a: Float32Array, b: Float32Array) => a.reduce((sum, value, i) => sum + value * (b[i] ?? 0), 0);
const quantile = (values: number[], q: number) => [...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(q * values.length))] ?? 0;
const round = (value: number) => Math.round(value * 1000) / 1000;
const measurements: Record<string, unknown> = {};

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
    const tasks = JSON.parse(await fs.readFile(path.join(fixtureDir, "tasks.json"), "utf8")) as FixtureTask[];
    const { paraphrases, unrelated } = JSON.parse(await fs.readFile(path.join(fixtureDir, "queries.json"), "utf8")) as Fixture;
    const modelDir = await new EmbeddingModelFiles(await cacheDir()).ensure(model);
    const runner = new EmbeddingModelRunner(model, modelDir);
    try {
      const loadStart = performance.now();
      await runner.start();
      const loadMs = performance.now() - loadStart;
      const indexStart = performance.now();
      const vectors = await runner.embed("document", tasks.map((task) => task.description));
      const msPerTask = (performance.now() - indexStart) / tasks.length;
      expect(vectors[0]).toHaveLength(model.dimensions);
      const rank = async (query: string) => {
        const [queryVector] = await runner.embed("query", [query]) as [Float32Array];
        return tasks.map((task, i) => ({ id: task.id, score: dot(queryVector, vectors[i] as Float32Array) })).sort((a, b) => b.score - a.score);
      };

      let top5 = 0, top10 = 0, shown = 0;
      const bestOnTopic: number[] = [], gapToTarget: number[] = [], shownCounts: number[] = [];
      for (const { q, targets } of paraphrases) {
        const ranked = await rank(q);
        const position = ranked.findIndex((item) => targets.includes(item.id));
        if (position < 5) top5++;
        if (position < 10) top10++;
        const best = ranked[0]!.score;
        bestOnTopic.push(best);
        gapToTarget.push(best - ranked[position]!.score);
        const matches = selectRelevant(ranked, model.relevance, 20);
        shownCounts.push(matches.length);
        if (matches.some((item) => targets.includes(item.id))) shown++;
      }
      const bestUnrelated: number[] = [];
      let unrelatedWithoutMatch = 0;
      for (const q of unrelated) {
        const ranked = await rank(q);
        bestUnrelated.push(ranked[0]!.score);
        if (!selectRelevant(ranked, model.relevance, 20).length) unrelatedWithoutMatch++;
      }

      const result = {
        tasks: tasks.length, queries: paraphrases.length, unrelatedQueries: unrelated.length,
        top5: round(top5 / paraphrases.length), top10: round(top10 / paraphrases.length),
        targetShown: round(shown / paraphrases.length), unrelatedWithoutMatch: round(unrelatedWithoutMatch / unrelated.length),
        calibration: model.relevance,
        bestOnTopic: { min: round(Math.min(...bestOnTopic)), p05: round(quantile(bestOnTopic, 0.05)), median: round(quantile(bestOnTopic, 0.5)) },
        bestUnrelated: { max: round(Math.max(...bestUnrelated)), p90: round(quantile(bestUnrelated, 0.9)), median: round(quantile(bestUnrelated, 0.5)) },
        gapToTarget: { p90: round(quantile(gapToTarget, 0.9)), p95: round(quantile(gapToTarget, 0.95)), max: round(Math.max(...gapToTarget)) },
        shownMatches: { median: quantile(shownCounts, 0.5), p90: quantile(shownCounts, 0.9), max: Math.max(...shownCounts) },
        loadMs: Math.round(loadMs), msPerTask: Math.round(msPerTask),
      };
      measurements[model.id] = { ...result, samples: { bestOnTopic: bestOnTopic.map(round).sort(), bestUnrelated: bestUnrelated.map(round).sort(), gapToTarget: gapToTarget.map(round).sort() } };
      console.info(`EMBEDDING_MODEL_QUALITY ${model.id} ${JSON.stringify(result)}`);

      expect(result.top5).toBeGreaterThanOrEqual(0.9);
      expect(result.top10).toBeGreaterThanOrEqual(0.95);
      expect(result.targetShown).toBeGreaterThanOrEqual(0.9);
      expect(result.unrelatedWithoutMatch).toBeGreaterThanOrEqual(0.9);
    } finally {
      await runner.stop();
    }
  }, 30 * 60_000);
});
