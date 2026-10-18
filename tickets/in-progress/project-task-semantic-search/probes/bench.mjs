// Usage: node bench.mjs <depsDir> <modelsDir> <dataDir> <queriesJson> <modelKey> <device> <strategy> [dtype]
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";

const [depsDir, modelsDir, dataDir, queriesFile, modelKey, device, strategy, dtypeArg] = process.argv.slice(2);
const require = createRequire(path.join(depsDir, "package.json"));
const tf = await import(pathToFileURL(require.resolve("@huggingface/transformers")).href);
tf.env.cacheDir = modelsDir;
tf.env.allowLocalModels = false;

const MODELS = {
  gemma: { id: "onnx-community/embeddinggemma-300m-ONNX", dtype: "q4", q: (s) => `task: search result | query: ${s}`, d: (s) => `title: none | text: ${s}`, pool: "sentence", max: 2048 },
  jina2s: { id: "Xenova/jina-embeddings-v2-small-en", dtype: "q8", q: (s) => s, d: (s) => s, pool: "mean", max: 8192 },
  bge: { id: "Xenova/bge-small-en-v1.5", dtype: "q8", q: (s) => `Represent this sentence for searching relevant passages: ${s}`, d: (s) => s, pool: "cls", max: 512 },
  arcticxs: { id: "Snowflake/snowflake-arctic-embed-xs", dtype: "q8", q: (s) => `Represent this sentence for searching relevant passages: ${s}`, d: (s) => s, pool: "cls", max: 512 },
  granite: { id: "onnx-community/granite-embedding-small-english-r2-ONNX", dtype: "q8", q: (s) => s, d: (s) => s, pool: "cls", max: 8192 },
  nomic: { id: "nomic-ai/nomic-embed-text-v1.5", dtype: "q8", q: (s) => `search_query: ${s}`, d: (s) => `search_document: ${s}`, pool: "mean", max: 8192 },
  e5ml: { id: "Xenova/multilingual-e5-small", dtype: "q8", q: (s) => `query: ${s}`, d: (s) => `passage: ${s}`, pool: "mean", max: 512 },
};
const m = MODELS[modelKey];
const dtype = dtypeArg || m.dtype;

// Corpus
const tasks = [];
const projectsDir = path.join(dataDir, "projects");
for (const p of fs.readdirSync(projectsDir)) {
  const td = path.join(projectsDir, p, "tasks");
  if (!fs.existsSync(td)) continue;
  for (const t of fs.readdirSync(td)) {
    const f = path.join(td, t, "task.json");
    if (!fs.existsSync(f)) continue;
    try { const j = JSON.parse(fs.readFileSync(f, "utf8")); if (j.taskKey && j.description) tasks.push({ key: j.taskKey, text: j.description }); } catch {}
  }
}
const queries = JSON.parse(fs.readFileSync(queriesFile, "utf8"));

const rss = () => Math.round(process.memoryUsage().rss / 1e6);
const rss0 = rss();
const t0 = performance.now();
const tokenizer = await tf.AutoTokenizer.from_pretrained(m.id);
const model = await tf.AutoModel.from_pretrained(m.id, { dtype, device });
const loadMs = performance.now() - t0;
const rssLoaded = rss();

const normalize = (v) => { let n = 0; for (const x of v) n += x * x; n = Math.sqrt(n) || 1; return v.map((x) => x / n); };
async function embed(texts, maxTokens) {
  const inputs = tokenizer(texts, { padding: true, truncation: true, max_length: maxTokens });
  const out = await model(inputs);
  if (m.pool === "sentence") return out.sentence_embedding.tolist().map(normalize);
  const h = out.last_hidden_state; // [b, t, d]
  const [b, t, d] = h.dims; const data = h.data; const mask = inputs.attention_mask.tolist();
  const res = [];
  for (let i = 0; i < b; i++) {
    const v = new Array(d).fill(0);
    if (m.pool === "cls") { for (let k = 0; k < d; k++) v[k] = data[i * t * d + k]; }
    else { let c = 0; for (let j = 0; j < t; j++) { if (!Number(mask[i][j])) continue; c++; for (let k = 0; k < d; k++) v[k] += data[(i * t + j) * d + k]; } for (let k = 0; k < d; k++) v[k] /= c || 1; }
    res.push(normalize(v));
  }
  return res;
}
const chunk = (s) => {
  const words = s.split(/\s+/).filter(Boolean); const out = []; const size = 220, step = 180;
  for (let i = 0; i < words.length && out.length < 16; i += step) out.push(words.slice(i, i + size).join(" "));
  return out.length ? out : [s];
};

// Index
const t1 = performance.now();
const index = []; // {key, vecs}
let chunkCount = 0;
for (const task of tasks) {
  const text = task.text;
  let vecs;
  if (strategy === "head512") vecs = await embed([m.d(text)], Math.min(512, m.max));
  else if (strategy === "head1024") vecs = await embed([m.d(text)], Math.min(1024, m.max));
  else if (strategy === "head2048") vecs = await embed([m.d(text)], Math.min(2048, m.max));
  else { const parts = chunk(text).map(m.d); vecs = []; for (let i = 0; i < parts.length; i += 4) vecs.push(...(await embed(parts.slice(i, i + 4), Math.min(512, m.max)))); }
  chunkCount += vecs.length;
  index.push({ key: task.key, vecs });
}
const indexMs = performance.now() - t1;
const rssIndexed = rss();

// Query
const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
let r1 = 0, r5 = 0, r10 = 0, mrr = 0; const qTimes = []; const misses = [];
for (const { q, rel } of queries) {
  const tq = performance.now();
  const [qv] = await embed([m.q(q)], 512);
  const scored = index.map((e) => ({ key: e.key, s: Math.max(...e.vecs.map((v) => dot(v, qv))) })).sort((a, b) => b.s - a.s);
  qTimes.push(performance.now() - tq);
  const rank = scored.findIndex((x) => rel.includes(x.key));
  if (rank === 0) r1++; if (rank >= 0 && rank < 5) r5++; if (rank >= 0 && rank < 10) r10++; if (rank >= 0) mrr += 1 / (rank + 1);
  if (rank > 4 || rank < 0) misses.push(`${q} -> rank ${rank + 1}; top: ${scored.slice(0, 3).map((x) => x.key).join(",")}`);
}
qTimes.sort((a, b) => a - b);
const n = queries.length;
console.log(JSON.stringify({ model: modelKey, id: m.id, dtype, device, strategy, tasks: tasks.length, chunks: chunkCount, dims: index[0].vecs[0].length,
  loadMs: Math.round(loadMs), indexMs: Math.round(indexMs), msPerTask: +(indexMs / tasks.length).toFixed(1),
  queryMsMedian: +qTimes[Math.floor(n / 2)].toFixed(1), queryMsP90: +qTimes[Math.floor(n * 0.9)].toFixed(1),
  rssBaseMB: rss0, rssLoadedMB: rssLoaded, rssIndexedMB: rssIndexed,
  recall1: +(r1 / n).toFixed(3), recall5: +(r5 / n).toFixed(3), recall10: +(r10 / n).toFixed(3), mrr: +(mrr / n).toFixed(3) }));
if (process.env.SHOW_MISSES) console.log(misses.join("\n"));
