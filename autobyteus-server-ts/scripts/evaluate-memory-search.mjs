#!/usr/bin/env node
// Memory search quality check (R-016): runs a known-answer question file against the memory index of an
// isolated copy of a memory folder and prints gate 1, gate 2 and the meaning-pointer check. Build the server
// first (`pnpm -C autobyteus-server-ts build`). See scripts/evaluate-memory-search.md.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { EmbeddingIndex } from "../dist/embeddings/embedding-index.js";
import { DEFAULT_EMBEDDING_MODEL_ID, getEmbeddingModelDefinition } from "../dist/embeddings/catalog/embedding-model-catalog.js";
import { evaluateMemorySearch, readEvaluationQuestions } from "../dist/memory-search/evaluation/memory-search-evaluation.js";
import { MemorySearch } from "../dist/memory-search/memory-search.js";

const usage = "Usage: node scripts/evaluate-memory-search.mjs --memory-dir <isolated copy> --index-dir <folder> --questions <file.json> [--model <id>] [--build] [--asking-run <run id>] [--out <report.json>]";
const args = process.argv.slice(2);
if (args.includes("--help")) { console.log(usage); process.exit(0); }
const value = (name) => {
  const index = args.indexOf(name);
  if (index < 0) return null;
  const next = args[index + 1];
  if (!next || next.startsWith("--")) throw new Error(usage);
  return next;
};
const memoryDir = value("--memory-dir");
const indexDir = value("--index-dir");
const questionsFile = value("--questions");
if (!memoryDir || !indexDir || !questionsFile) throw new Error(usage);
const resolvedMemory = fs.realpathSync(path.resolve(memoryDir));
// Never a user's own memory folder: the build writes journals into it (TESTING.md; requirements § Data Continuity).
// Both the account's home and HOME: a clean environment (TESTING.md) points HOME elsewhere.
const userDataDirs = [...new Set([os.userInfo().homedir, os.homedir()])].map((home) => path.join(home, ".autobyteus"));
if (userDataDirs.some((dir) => resolvedMemory === dir || resolvedMemory.startsWith(`${dir}${path.sep}`))) {
  throw new Error(`Refusing ${resolvedMemory}: evaluate an isolated copy of a memory folder, never ~/.autobyteus.`);
}
const model = getEmbeddingModelDefinition(value("--model") ?? DEFAULT_EMBEDDING_MODEL_ID);
if (!model) throw new Error(`Unknown embedding model: ${value("--model")}`);

const embeddings = new EmbeddingIndex({ rootDir: path.join(path.resolve(indexDir), "embeddings"), resolveModel: () => model });
const memory = new MemorySearch({
  appDataDir: path.resolve(indexDir), memoryDir: resolvedMemory, embeddings: () => embeddings, activeModelId: () => model.id,
});
const status = () => memory.indexStatus();
if (args.includes("--build")) {
  const started = Date.now();
  memory.startIndexing();
  let last = "";
  while (status().state === "building" || last === "") {
    const line = status().steps.map((step) => `${step.step} ${step.state} ${step.done}/${step.total}`).join(" | ");
    if (line !== last) { console.error(`[${Math.round((Date.now() - started) / 1000)} s] ${line}`); last = line; }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  console.error(`Built in ${Math.round((Date.now() - started) / 1000)} s; waiting for the meaning index to finish embedding…`);
}
for (;;) {
  const meaning = status().steps.find((step) => step.step === "meaningIndex");
  if (!meaning || meaning.state === "failed" || meaning.done >= meaning.total) break;
  console.error(`meaning index ${meaning.done}/${meaning.total}`);
  await new Promise((resolve) => setTimeout(resolve, 10_000));
}
// After a start the first search syncs the Meaning index's job (and loads the model): wait until a search answers
// by meaning too, so every question is measured on both tiers.
for (let i = 0; i < 120; i++) {
  const warm = await memory.search("memory search warm-up", { limit: 1 });
  if (!warm.coverage) break;
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
const askingRunId = value("--asking-run");
const report = await evaluateMemorySearch(memory, readEvaluationQuestions(questionsFile), { askingRunId });
const output = { model: model.id, askingRunId, status: status(), report };
const out = value("--out");
if (out) fs.writeFileSync(out, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ gate1: report.gate1, gate2: report.gate2, meaningPointers: report.meaningPointers, unmaskedSecrets: report.unmaskedSecrets, offTopic: report.offTopic, questions: report.questions }, null, 2));
memory.shutdown();
await embeddings.shutdown();
