// Worker: embeds N strings with LEAF-IR via onnxruntime-web inside a worker_thread.
import { parentPort, workerData } from "node:worker_threads";
import { pathToFileURL } from "node:url"; import fs from "node:fs"; import path from "node:path";
const { depsDir, modelDir, threads, texts } = workerData;
const ort = await import(pathToFileURL(path.join(depsDir, "node_modules/onnxruntime-web/dist/ort.node.min.mjs")).href);
const { Tokenizer } = await import(pathToFileURL(path.join(depsDir, "node_modules/@huggingface/tokenizers/dist/tokenizers.mjs")).href);
ort.env.wasm.numThreads = threads;
const tok = new Tokenizer(JSON.parse(fs.readFileSync(path.join(modelDir, "tokenizer.json"), "utf8")), JSON.parse(fs.readFileSync(path.join(modelDir, "tokenizer_config.json"), "utf8")));
const onnx = path.join(modelDir, "onnx/model_quantized.onnx");
const s = await ort.InferenceSession.create(fs.readFileSync(onnx), { executionProviders: ["wasm"], externalData: [{ path: "model_quantized.onnx_data", data: fs.readFileSync(onnx + "_data") }] });
const t0 = performance.now(); let dims = 0;
for (const text of texts) {
  let ids = tok.encode(text).ids; if (ids.length > 512) ids = [...ids.slice(0, 511), ids[ids.length - 1]];
  const n = ids.length; const t = (a) => new ort.Tensor("int64", BigInt64Array.from(a.map(BigInt)), [1, n]);
  const out = await s.run({ input_ids: t(ids), attention_mask: t(new Array(n).fill(1)), token_type_ids: t(new Array(n).fill(0)) });
  dims = out.sentence_embedding.dims[1];
}
parentPort.postMessage({ threads, ms: Math.round(performance.now() - t0), perText: +((performance.now() - t0) / texts.length).toFixed(1), dims, rssMB: Math.round(process.memoryUsage().rss / 1e6) });
