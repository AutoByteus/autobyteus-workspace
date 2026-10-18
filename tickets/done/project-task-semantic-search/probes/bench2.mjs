// Current-model comparison (transformers.js, native CPU runtime), whole-Task indexing.
// Usage: node bench2.mjs <depsDir> <modelsDir> <dataDir> <queriesJson> <offtopicJson> <modelKey> <dumpDir>
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";

const [depsDir, modelsDir, dataDir, queriesFile, offFile, modelKey, dumpDir] = process.argv.slice(2);
const require = createRequire(path.join(depsDir, "package.json"));
const tf = await import(pathToFileURL(require.resolve("@huggingface/transformers")).href);
tf.env.cacheDir = modelsDir;

const WEB_Q = "Instruct: Given a web search query, retrieve relevant passages that answer the query\nQuery: ";
const MODELS = {
  // previous best
  granite_s_r2: { id: "onnx-community/granite-embedding-small-english-r2-ONNX", dtype: "q8", q: (s) => s, d: (s) => s, pool: "cls", max: 1024 },
  egemma1: { id: "onnx-community/embeddinggemma-300m-ONNX", dtype: "q4", q: (s) => `task: search result | query: ${s}`, d: (s) => `title: none | text: ${s}`, pool: "sentence", max: 1024 },
  // current (2025-2026)
  egemma2: { id: "onnx-community/embeddinggemma-2-ONNX", dtype: "q4", q: (s) => `task: search result | query: ${s}`, d: (s) => `title: none | text: ${s}`, pool: "sentence", max: 1024 },
  egemma2_q8: { id: "onnx-community/embeddinggemma-2-ONNX", dtype: "q8", q: (s) => `task: search result | query: ${s}`, d: (s) => `title: none | text: ${s}`, pool: "sentence", max: 1024 },
  harrier270: { id: "onnx-community/harrier-oss-v1-270m-ONNX", dtype: "q4", q: (s) => WEB_Q + s, d: (s) => s, pool: "sentence", max: 1024 },
  voyage4nano: { id: "onnx-community/voyage-4-nano-ONNX", dtype: "q4", q: (s) => `Represent the query for retrieving supporting documents: ${s}`, d: (s) => `Represent the document for retrieval: ${s}`, pool: "mean", max: 1024 },
  jina5nano: { id: "jinaai/jina-embeddings-v5-text-nano-retrieval", dtype: "q4", q: (s) => `Query: ${s}`, d: (s) => `Document: ${s}`, pool: "last", max: 1024 },
  granite97m: { id: "ibm-granite/granite-embedding-97m-multilingual-r2", dtype: "fp32", file: "model_quint8_avx2", q: (s) => s, d: (s) => s, pool: "cls", max: 1024 },
  leafir: { id: "onnx-community/mdbr-leaf-ir-ONNX", dtype: "q8", q: (s) => `Represent this sentence for searching relevant passages: ${s}`, d: (s) => s, pool: "mean", max: 512 },
  gtemodernbert: { id: "Alibaba-NLP/gte-modernbert-base", dtype: "q8", q: (s) => s, d: (s) => s, pool: "cls", max: 1024 },
  qwen3_06b: { id: "onnx-community/Qwen3-Embedding-0.6B-ONNX", dtype: "q8", q: (s) => WEB_Q + s, d: (s) => s, pool: "last", max: 1024 },
};
const m = MODELS[modelKey];

const tasks = [];
for (const p of fs.readdirSync(path.join(dataDir, "projects"))) {
  const td = path.join(dataDir, "projects", p, "tasks"); if (!fs.existsSync(td)) continue;
  for (const t of fs.readdirSync(td)) { const f = path.join(td, t, "task.json"); if (!fs.existsSync(f)) continue;
    try { const j = JSON.parse(fs.readFileSync(f, "utf8")); if (j.taskKey && j.description) tasks.push({ key: j.taskKey, text: j.description }); } catch {} }
}
const queries = JSON.parse(fs.readFileSync(queriesFile, "utf8"));
const offtopic = JSON.parse(fs.readFileSync(offFile, "utf8")).filter((x) => !x.rel.length).map((x) => x.q);

const rss = () => Math.round(process.memoryUsage().rss / 1e6);
const t0 = performance.now();
const tokenizer = await tf.AutoTokenizer.from_pretrained(m.id);
const model = await tf.AutoModel.from_pretrained(m.id, { dtype: m.dtype, device: "cpu", ...(m.file ? { model_file_name: m.file } : {}) });
const loadMs = performance.now() - t0; const rssLoaded = rss();
const normalize = (v) => { let n = 0; for (const x of v) n += x * x; n = Math.sqrt(n) || 1; return v.map((x) => x / n); };
async function embed(text) {
  const inputs = tokenizer([text], { padding: false, truncation: true, max_length: m.max });
  const out = await model(inputs);
  if (m.pool === "sentence") return normalize(out.sentence_embedding.tolist()[0]);
  const h = out.last_hidden_state ?? out.token_embeddings ?? Object.values(out)[0];
  const [, t, d] = h.dims; const data = h.data; const v = new Array(d).fill(0);
  if (m.pool === "cls") for (let k = 0; k < d; k++) v[k] = data[k];
  else if (m.pool === "last") for (let k = 0; k < d; k++) v[k] = data[(t - 1) * d + k];
  else { for (let j = 0; j < t; j++) for (let k = 0; k < d; k++) v[k] += data[j * d + k]; for (let k = 0; k < d; k++) v[k] /= t; }
  return normalize(v);
}
const t1 = performance.now(); const index = [];
for (const task of tasks) index.push({ key: task.key, v: await embed(m.d(task.text)) });
const indexMs = performance.now() - t1; const rssIndexed = rss();
const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
const rank = async (q) => { const qv = await embed(m.q(q)); return index.map((e) => [e.key, +dot(e.v, qv).toFixed(4)]).sort((a, b) => b[1] - a[1]); };
let r1 = 0, r5 = 0, r10 = 0, mrr = 0; const qt = []; const dump = [];
for (const { q, rel } of queries) {
  const tq = performance.now(); const ranked = await rank(q); qt.push(performance.now() - tq);
  const r = ranked.findIndex(([k]) => rel.includes(k));
  if (r === 0) r1++; if (r >= 0 && r < 5) r5++; if (r >= 0 && r < 10) r10++; if (r >= 0) mrr += 1 / (r + 1);
  dump.push({ q, rel, ranked });
}
const off = []; for (const q of offtopic) off.push({ q, rel: [], ranked: await rank(q) });
// separation: how well the best score separates real queries from off-topic ones
const realTop = dump.map((e) => e.ranked[0][1]).sort((a, b) => a - b), offTop = off.map((e) => e.ranked[0][1]).sort((a, b) => a - b);
const sepOK = (thr) => (realTop.filter((s) => s >= thr).length + offTop.filter((s) => s < thr).length) / (realTop.length + offTop.length);
let bestSep = 0, bestThr = 0; for (const thr of [...realTop, ...offTop]) { const s = sepOK(thr); if (s > bestSep) { bestSep = s; bestThr = thr; } }
qt.sort((a, b) => a - b); const n = queries.length;
if (dumpDir) fs.writeFileSync(path.join(dumpDir, `dump-${modelKey}.json`), JSON.stringify({ dump, off }));
const sizeMB = (() => { try { let s = 0; const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else s += fs.statSync(p).size; } }; walk(path.join(modelsDir, m.id)); return Math.round(s / 1e6); } catch { return null; } })();
console.log(JSON.stringify({ model: modelKey, id: m.id, dtype: m.dtype, tasks: tasks.length, queries: n, dims: index[0].v.length, downloadMB: sizeMB,
  loadMs: Math.round(loadMs), msPerTask: +(indexMs / tasks.length).toFixed(1), queryMsMedian: +qt[n >> 1].toFixed(1), rssLoadedMB: rssLoaded, rssIndexedMB: rssIndexed,
  recall1: +(r1 / n).toFixed(3), recall5: +(r5 / n).toFixed(3), recall10: +(r10 / n).toFixed(3), mrr: +(mrr / n).toFixed(3),
  realTopMin: realTop[0], offTopMax: offTop[offTop.length - 1], offTopicSeparation: +bestSep.toFixed(3) }));
