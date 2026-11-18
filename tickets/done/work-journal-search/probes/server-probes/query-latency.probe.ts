import fs from "node:fs";
import { it } from "vitest";
import { EmbeddingModelRunner } from "../src/embeddings/runtime/embedding-model-runner.js";
import { EMBEDDING_MODEL_CATALOG } from "../src/embeddings/catalog/embedding-model-catalog.js";
it("query embedding latency", async () => {
  const qs = (JSON.parse(fs.readFileSync("/tmp/wjs-probe/queries.json", "utf-8")) as { q: string }[]).map((x) => x.q);
  const runner = new EmbeddingModelRunner(EMBEDDING_MODEL_CATALOG[0], "/tmp/wjs-probe/models/granite-embedding-small-english-r2");
  let t = Date.now(); await runner.start(); const load = Date.now() - t;
  t = Date.now(); await runner.embed("query", [qs[0]]); const first = Date.now() - t;
  const ms: number[] = [];
  for (const q of qs) { t = Date.now(); await runner.embed("query", [q]); ms.push(Date.now() - t); }
  ms.sort((a, b) => a - b);
  fs.writeFileSync("/tmp/wjs-probe/query-latency.json", JSON.stringify({ loadMs: load, firstQueryMs: first, p50: ms[Math.floor(ms.length / 2)], p90: ms[Math.floor(ms.length * 0.9)], max: ms[ms.length - 1], n: ms.length }));
  await runner.stop();
});
