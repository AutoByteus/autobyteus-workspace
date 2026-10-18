// Lean production-candidate stack: onnxruntime-web (Node build, WASM) + @huggingface/tokenizers, Granite small R2 q8.
// Usage: node lean.mjs <depsDir> <modelDir> <dataDir> <queriesJson> <threads> <maxTokens> [chunked]
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";

const [depsDir, modelDir, dataDir, queriesFile, threadsArg, maxTokArg, mode] = process.argv.slice(2);
const require = createRequire(path.join(depsDir, "package.json"));
const rss = () => Math.round(process.memoryUsage().rss / 1e6);
const rss0 = rss();
const t0 = performance.now();
const ort = await import(pathToFileURL(path.join(depsDir, "node_modules/onnxruntime-web/dist/ort.node.min.mjs")).href);
const { Tokenizer } = await import(pathToFileURL(path.join(depsDir, "node_modules/@huggingface/tokenizers/dist/tokenizers.mjs")).href);
ort.env.wasm.numThreads = Number(threadsArg);
const tokJson = JSON.parse(fs.readFileSync(path.join(modelDir, "tokenizer.json"), "utf8"));
const tokCfg = JSON.parse(fs.readFileSync(path.join(modelDir, "tokenizer_config.json"), "utf8"));
const tokenizer = new Tokenizer(tokJson, tokCfg);
const modelBytes = fs.readFileSync(path.join(modelDir, "onnx/model_quantized.onnx"));
const dataBytes = fs.readFileSync(path.join(modelDir, "onnx/model_quantized.onnx_data"));
const session = await ort.InferenceSession.create(modelBytes, {
  executionProviders: ["wasm"],
  externalData: [{ path: "model_quantized.onnx_data", data: dataBytes }],
});
const loadMs = performance.now() - t0;
const rssLoaded = rss();
const maxTokens = Number(maxTokArg);

function encode(text) {
  const enc = tokenizer.encode(text);
  let ids = enc.ids;
  if (ids.length > maxTokens) ids = [...ids.slice(0, maxTokens - 1), ids[ids.length - 1]];
  return ids;
}
async function embed(text) {
  const ids = encode(text);
  const n = ids.length;
  const input_ids = new ort.Tensor("int64", BigInt64Array.from(ids.map(BigInt)), [1, n]);
  const attention_mask = new ort.Tensor("int64", new BigInt64Array(n).fill(1n), [1, n]);
  const out = await session.run({ input_ids, attention_mask });
  const h = out.last_hidden_state.data; // [1, n, 384]; CLS = first token
  const d = 384; const v = new Float32Array(d); let s = 0;
  for (let k = 0; k < d; k++) { v[k] = h[k]; s += h[k] * h[k]; }
  s = Math.sqrt(s) || 1; for (let k = 0; k < d; k++) v[k] /= s;
  return v;
}
const chunk = (s) => { const w = s.split(/\s+/).filter(Boolean); const out = []; for (let i = 0; i < w.length && out.length < 16; i += 180) out.push(w.slice(i, i + 220).join(" ")); return out.length ? out : [s]; };

const tasks = [];
for (const p of fs.readdirSync(path.join(dataDir, "projects"))) {
  const td = path.join(dataDir, "projects", p, "tasks"); if (!fs.existsSync(td)) continue;
  for (const t of fs.readdirSync(td)) { const f = path.join(td, t, "task.json"); if (!fs.existsSync(f)) continue;
    try { const j = JSON.parse(fs.readFileSync(f, "utf8")); if (j.taskKey && j.description) tasks.push({ key: j.taskKey, text: j.description }); } catch {} }
}
const queries = JSON.parse(fs.readFileSync(queriesFile, "utf8"));
const t1 = performance.now(); const index = []; let tokTotal = 0, chunks = 0;
for (const t of tasks) {
  const parts = mode === "chunked" ? chunk(t.text) : [t.text];
  const vecs = []; for (const p of parts) { tokTotal += Math.min(encode(p).length, maxTokens); vecs.push(await embed(p)); }
  chunks += vecs.length; index.push({ key: t.key, vecs });
}
const indexMs = performance.now() - t1; const rssIndexed = rss();
const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
let r1 = 0, r5 = 0, r10 = 0, mrr = 0; const qt = []; const dump = [];
for (const { q, rel } of queries) {
  const tq = performance.now(); const qv = await embed(q);
  const scored = index.map((e) => ({ key: e.key, s: Math.max(...e.vecs.map((v) => dot(v, qv))) })).sort((a, b) => b.s - a.s);
  qt.push(performance.now() - tq);
  const rank = scored.findIndex((x) => rel.includes(x.key));
  if (rank === 0) r1++; if (rank >= 0 && rank < 5) r5++; if (rank >= 0 && rank < 10) r10++; if (rank >= 0) mrr += 1 / (rank + 1);
  dump.push({ q, rel, ranked: scored.map((x) => [x.key, +x.s.toFixed(4)]) });
}
qt.sort((a, b) => a - b); const n = queries.length;
if (process.env.DUMP) fs.writeFileSync(process.env.DUMP, JSON.stringify(dump));
console.log(JSON.stringify({ stack: "ort-web+tokenizers", threads: Number(threadsArg), maxTokens, mode: mode || "whole", tasks: tasks.length, chunks, avgTokensPerTask: Math.round(tokTotal / tasks.length),
  loadMs: Math.round(loadMs), indexMs: Math.round(indexMs), msPerTask: +(indexMs / tasks.length).toFixed(1), queryMsMedian: +qt[n >> 1].toFixed(1), queryMsP90: +qt[Math.floor(n * 0.9)].toFixed(1),
  rssBaseMB: rss0, rssLoadedMB: rssLoaded, rssIndexedMB: rssIndexed,
  recall1: +(r1 / n).toFixed(3), recall5: +(r5 / n).toFixed(3), recall10: +(r10 / n).toFixed(3), mrr: +(mrr / n).toFixed(3) }));
