import http from "node:http";
import { it } from "vitest";
import { EmbeddingModelRunner } from "../src/embeddings/runtime/embedding-model-runner.js";
import { EMBEDDING_MODEL_CATALOG } from "../src/embeddings/catalog/embedding-model-catalog.js";
it("serves Granite query embeddings on 127.0.0.1:7531 for the probe agent", async () => {
  const runner = new EmbeddingModelRunner(EMBEDDING_MODEL_CATALOG[0], "/tmp/wjs-probe/models/granite-embedding-small-english-r2", { idleStopMs: 3_600_000 });
  await runner.start();
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      try {
        const { texts } = JSON.parse(body) as { texts: string[] };
        const vs = await runner.embed("query", texts);
        res.end(JSON.stringify(vs.map((v) => Array.from(v))));
      } catch (e) { res.statusCode = 500; res.end(String(e)); }
    });
  });
  await new Promise<void>((r) => server.listen(7531, "127.0.0.1", () => r()));
  await new Promise((r) => setTimeout(r, 6_900_000));
  server.close(); await runner.stop();
});
