// Solution Designer probe (FO-001): dump full per-query score lists so candidate relevance rules can be evaluated offline.
// Same backlogs and production runner as the API/E2E probe API-PROBE-score-analysis.mjs.
// Usage: node score-dump.mjs <serverDist> <modelsDir> <modelId> <backlog.json> <worktreeRoot> <out.json>
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [dist, modelsDir, modelId, backlogFile, worktree, outFile] = process.argv.slice(2);
const { getEmbeddingModelDefinition } = await import(pathToFileURL(path.join(dist, "embeddings/catalog/embedding-model-catalog.js")).href);
const { EmbeddingModelRunner } = await import(pathToFileURL(path.join(dist, "embeddings/runtime/embedding-model-runner.js")).href);
const model = getEmbeddingModelDefinition(modelId);
const backlog = JSON.parse(fs.readFileSync(backlogFile, "utf8"));

const repoTasks = () => { // identical selection to API-PROBE-score-analysis.mjs
  const done = path.join(worktree, "tickets/done"); const out = [];
  const docs = [["requirements-doc.md", /##\s+(Problem And Desired Outcome|Problem|Goal|Summary|Context)[^\n]*\n([\s\S]*?)(\n##\s|$)/i],
    ["design-spec.md", /##\s+(Intended Change|Current-State Read|Summary|Problem)[^\n]*\n([\s\S]*?)(\n##\s|$)/i],
    ["investigation-notes.md", /##\s+(Summary|Request|Problem|Findings|Context)[^\n]*\n([\s\S]*?)(\n##\s|$)/i]];
  for (const [docName, sectionRe] of docs) for (const name of fs.readdirSync(done).sort()) {
    if (out.length >= 940) return out;
    const file = path.join(done, name, docName); if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, "utf8");
    const section = text.match(sectionRe)?.[2] ?? text.split("\n").slice(3).join("\n");
    const title = name.replace(/[-_]+/g, " ").replace(/^./, (c) => c.toUpperCase());
    const body = section.replace(/\|/g, " ").replace(/[ \t]+/g, " ").trim(); if (body.length < 300) continue;
    out.push({ id: `r${String(out.length + 1).padStart(3, "0")}`, description: `${title}\n\n${body}`.slice(0, 2400) });
  }
  return out;
};
const runner = new EmbeddingModelRunner(model, path.join(modelsDir, modelId));
await runner.start();
const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
const cache = new Map();
const embedDocs = async (tasks) => {
  const todo = tasks.filter((t) => !cache.has(t.description));
  for (let i = 0; i < todo.length; i += 16) { const b = todo.slice(i, i + 16); const v = await runner.embed("document", b.map((t) => t.description)); b.forEach((t, j) => cache.set(t.description, v[j])); }
  return tasks.map((t) => ({ id: t.id, vector: cache.get(t.description) }));
};
const sets = { fixture: backlog.targets, templated: [...backlog.targets, ...backlog.distractors], repo: [...backlog.targets, ...repoTasks()] };
const queries = [...backlog.paraphrases.map((p) => ({ q: p.q, targets: p.targets, kind: "para" })), ...backlog.unrelatedExtended.map((q) => ({ q, targets: [], kind: "unrel" }))];
const qv = await runner.embed("query", queries.map((x) => x.q));
const out = { model: modelId, calibration: model.relevance, sets: {} };
for (const [name, tasks] of Object.entries(sets)) {
  const t0 = performance.now(); const docs = await embedDocs(tasks); const ms = performance.now() - t0;
  out.sets[name] = { tasks: tasks.length, embedMs: Math.round(ms), queries: queries.map((x, i) => {
    const scored = docs.map((d) => [d.id, Math.round(dot(qv[i], d.vector) * 10000) / 10000]).sort((a, b) => b[1] - a[1]);
    return { q: x.q, kind: x.kind, targets: x.targets, ids: scored.map((s) => s[0]), scores: scored.map((s) => s[1]) };
  }) };
  console.log(name, tasks.length, "embedded in", Math.round(ms), "ms");
}
await runner.stop();
fs.writeFileSync(outFile, JSON.stringify(out));
