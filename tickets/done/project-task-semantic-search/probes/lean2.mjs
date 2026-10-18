// Generic production-candidate stack probe: onnxruntime-web (WASM, Node build) + @huggingface/tokenizers.
// Usage: node lean2.mjs <depsDir> <modelDir> <onnxFileBase> <dataDir> <queriesJson> <threads> <maxTokens> <pool cls|mean|last> <queryPrefix> <docPrefix>
import { pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";

const [depsDir, modelDir, fileBase, dataDir, queriesFile, threadsArg, maxTokArg, pool, qPrefix, dPrefix] = process.argv.slice(2);
const rss = () => Math.round(process.memoryUsage().rss / 1e6);
const t0 = performance.now();
const ort = await import(pathToFileURL(path.join(depsDir, "node_modules/onnxruntime-web/dist/ort.node.min.mjs")).href);
const { Tokenizer } = await import(pathToFileURL(path.join(depsDir, "node_modules/@huggingface/tokenizers/dist/tokenizers.mjs")).href);
ort.env.wasm.numThreads = Number(threadsArg);
const tokenizer = new Tokenizer(JSON.parse(fs.readFileSync(path.join(modelDir, "tokenizer.json"), "utf8")), JSON.parse(fs.readFileSync(path.join(modelDir, "tokenizer_config.json"), "utf8")));
const onnxPath = path.join(modelDir, "onnx", `${fileBase}.onnx`);
const dataPath = `${onnxPath}_data`;
const opts = { executionProviders: ["wasm"], ...(fs.existsSync(dataPath) ? { externalData: [{ path: path.basename(dataPath), data: fs.readFileSync(dataPath) }] } : {}) };
const session = await ort.InferenceSession.create(fs.readFileSync(onnxPath), opts);
const loadMs = performance.now() - t0; const rssLoaded = rss(); const maxTokens = Number(maxTokArg);
console.error("inputs", session.inputNames, "outputs", session.outputNames);

async function embed(text) {
  let ids = tokenizer.encode(text).ids;
  if (ids.length > maxTokens) ids = [...ids.slice(0, maxTokens - 1), ids[ids.length - 1]];
  const n = ids.length; const feeds = {};
  const i64 = (arr) => new ort.Tensor("int64", BigInt64Array.from(arr.map(BigInt)), [1, n]);
  for (const name of session.inputNames) {
    if (name === "input_ids") feeds[name] = i64(ids);
    else if (name === "attention_mask") feeds[name] = i64(new Array(n).fill(1));
    else if (name === "position_ids") feeds[name] = i64([...Array(n).keys()]);
    else if (name === "token_type_ids") feeds[name] = i64(new Array(n).fill(0));
    else {
      // Unused modality inputs (e.g. EmbeddingGemma 2 image/video/audio features [tokens, dim]): feed empty.
      const meta = (session.inputMetadata ?? []).find((m) => m.name === name);
      const dim = Number(meta?.shape?.[1] ?? 0);
      feeds[name] = new ort.Tensor("float32", new Float32Array(0), [0, dim]);
    }
  }
  const out = await session.run(feeds);
  let v;
  if (out.sentence_embedding) v = Float32Array.from(out.sentence_embedding.data);
  else {
    const h = out.last_hidden_state ?? out[session.outputNames[0]]; const d = h.dims[2]; const data = h.data; v = new Float32Array(d);
    if (pool === "cls") for (let k = 0; k < d; k++) v[k] = data[k];
    else if (pool === "last") for (let k = 0; k < d; k++) v[k] = data[(n - 1) * d + k];
    else { for (let j = 0; j < n; j++) for (let k = 0; k < d; k++) v[k] += data[j * d + k]; for (let k = 0; k < d; k++) v[k] /= n; }
  }
  let s = 0; for (const x of v) s += x * x; s = Math.sqrt(s) || 1; for (let k = 0; k < v.length; k++) v[k] /= s;
  return v;
}
const tasks = [];
for (const p of fs.readdirSync(path.join(dataDir, "projects"))) {
  const td = path.join(dataDir, "projects", p, "tasks"); if (!fs.existsSync(td)) continue;
  for (const t of fs.readdirSync(td)) { const f = path.join(td, t, "task.json"); if (!fs.existsSync(f)) continue;
    try { const j = JSON.parse(fs.readFileSync(f, "utf8")); if (j.taskKey && j.description) tasks.push({ key: j.taskKey, text: j.description }); } catch {} }
}
const queries = JSON.parse(fs.readFileSync(queriesFile, "utf8"));
const t1 = performance.now(); const index = [];
for (const t of tasks) index.push({ key: t.key, v: await embed(dPrefix + t.text) });
const indexMs = performance.now() - t1; const rssIndexed = rss();
const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
let r1 = 0, r5 = 0, r10 = 0, mrr = 0; const qt = [];
for (const { q, rel } of queries) {
  const tq = performance.now(); const qv = await embed(qPrefix + q);
  const ranked = index.map((e) => [e.key, dot(e.v, qv)]).sort((a, b) => b[1] - a[1]); qt.push(performance.now() - tq);
  const r = ranked.findIndex(([k]) => rel.includes(k));
  if (r === 0) r1++; if (r >= 0 && r < 5) r5++; if (r >= 0 && r < 10) r10++; if (r >= 0) mrr += 1 / (r + 1);
}
qt.sort((a, b) => a - b); const n = queries.length;
console.log(JSON.stringify({ stack: "ort-web+tokenizers", model: path.basename(modelDir), file: fileBase, threads: Number(threadsArg), maxTokens, tasks: tasks.length, dims: index[0].v.length,
  loadMs: Math.round(loadMs), msPerTask: +(indexMs / tasks.length).toFixed(1), indexSec: Math.round(indexMs / 1000), queryMsMedian: +qt[n >> 1].toFixed(1),
  rssLoadedMB: rssLoaded, rssIndexedMB: rssIndexed, recall1: +(r1 / n).toFixed(3), recall5: +(r5 / n).toFixed(3), recall10: +(r10 / n).toFixed(3), mrr: +(mrr / n).toFixed(3) }));
