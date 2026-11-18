import fs from "node:fs";
import { it } from "vitest";
import { EmbeddingModelRunner } from "../src/embeddings/runtime/embedding-model-runner.js";
import { EMBEDDING_MODEL_CATALOG } from "../src/embeddings/catalog/embedding-model-catalog.js";
const IN = process.env.WJS_IN ?? "/tmp/wjs-probe/cards.jsonl";
const OUT = process.env.WJS_OUT ?? "/tmp/wjs-probe/cards";
it("embed cards and queries", async () => {
  const docs = fs.readFileSync(IN, "utf-8").trim().split("\n").map((l) => JSON.parse(l).text as string);
  const queries = (JSON.parse(fs.readFileSync("/tmp/wjs-probe/queries.json", "utf-8")) as { q: string }[]).map((x) => x.q);
  const runner = new EmbeddingModelRunner(EMBEDDING_MODEL_CATALOG[0], "/tmp/wjs-probe/models/granite-embedding-small-english-r2");
  await runner.start();
  const qv = await runner.embed("query", queries);
  fs.writeFileSync(`${OUT}.queries.f32`, Buffer.concat(qv.map((v) => Buffer.from(v.buffer, v.byteOffset, v.byteLength))));
  const fd = fs.openSync(`${OUT}.docs.f32`, "w");
  const t = Date.now();
  for (let i = 0; i < docs.length; i += 32) {
    const vs = await runner.embed("document", docs.slice(i, i + 32));
    for (const v of vs) fs.writeSync(fd, Buffer.from(v.buffer, v.byteOffset, v.byteLength));
    if (i % 640 === 0) fs.writeFileSync(`${OUT}.progress`, `${i + vs.length}/${docs.length} ${(Date.now() - t) / 1000}s\n`);
  }
  fs.closeSync(fd);
  fs.writeFileSync(`${OUT}.progress`, `done ${docs.length} ${(Date.now() - t) / 1000}s dims ${qv[0].length}\n`);
  await runner.stop();
});
