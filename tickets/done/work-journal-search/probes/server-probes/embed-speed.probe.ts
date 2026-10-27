import fs from "node:fs";
import { it } from "vitest";
import { EmbeddingModelRunner } from "../src/embeddings/runtime/embedding-model-runner.js";
import { EMBEDDING_MODEL_CATALOG } from "../src/embeddings/catalog/embedding-model-catalog.js";
it("granite throughput on journal chunks", async () => {
  const files = fs.readFileSync("/tmp/wjs-probe/speed-files.txt", "utf-8").trim().split("\n");
  const chunks: string[] = [];
  for (const f of files) {
    const t = fs.readFileSync(f, "utf-8");
    for (let i = 0; i + 2400 <= t.length && chunks.length < 240; i += 50_000) chunks.push(t.slice(i, i + 2400));
  }
  const runner = new EmbeddingModelRunner(EMBEDDING_MODEL_CATALOG[0], "/tmp/wjs-probe/models/granite-embedding-small-english-r2");
  await runner.start();
  await runner.embed("document", chunks.slice(0, 8));
  for (const size of [600, 1200, 2400]) {
    const batch = chunks.slice(8, 8 + 200).map((c) => c.slice(0, size));
    const t = Date.now();
    await runner.embed("document", batch);
    fs.appendFileSync("/tmp/wjs-probe/embed-speed.jsonl", JSON.stringify({ chars: size, items: batch.length, seconds: (Date.now() - t) / 1000, perSecond: +(batch.length / ((Date.now() - t) / 1000)).toFixed(1) }) + "\n");
  }
  await runner.stop();
});
