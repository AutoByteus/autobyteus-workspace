// API/E2E probe (ticket evidence, not product code): the raw meaning-tier scores behind the strength labels (F-001).
// Opens a stopped node's memory index like the evaluation command does, warms the meaning job, then asks
// EmbeddingIndex.nearest for each cue and prints the best scores and how many reach `relevant` (→ Strong) /
// `aboveFloor` (→ Fair) under the model's calibration. Read-only apart from the meaning sync the first search does.
// Usage: node API-PROBE-meaning-scores.mjs <memoryDir> <appDataDir> <modelId> "<cue>" ["<cue>" …]
const dist = '/Users/normy/autobyteus_org/autobyteus-worktrees/work-journal-search/autobyteus-server-ts/dist'
const { EmbeddingIndex } = await import(`${dist}/embeddings/embedding-index.js`)
const { getEmbeddingModelDefinition } = await import(`${dist}/embeddings/catalog/embedding-model-catalog.js`)
const { MemorySearch } = await import(`${dist}/memory-search/memory-search.js`)
const path = await import('node:path')
const [memoryDir, appDataDir, modelId, ...cues] = process.argv.slice(2)
const model = getEmbeddingModelDefinition(modelId)
const embeddings = new EmbeddingIndex({ rootDir: path.join(appDataDir, 'embeddings'), resolveModel: () => model })
const memory = new MemorySearch({ appDataDir, memoryDir, embeddings: () => embeddings, activeModelId: () => model.id })
for (let i = 0; i < 120; i++) { const warm = await memory.search('memory search warm-up', { limit: 1 }); if (!warm.coverage) break; await new Promise((r) => setTimeout(r, 1000)) }
const out = { model: model.id, calibration: model.relevance, cues: [] }
for (const cue of cues) {
  const r = await embeddings.nearest('memory-journal-cards', cue, { limit: 300 })
  const m = r.matches
  out.cues.push({ cue, top5: m.slice(0, 5).map((x) => +x.score.toFixed(4)), relevant: m.filter((x) => x.relevance === 'relevant').length,
    aboveFloor: m.filter((x) => x.relevance === 'aboveFloor').length, below: m.filter((x) => x.relevance === 'below').length })
}
console.log(JSON.stringify(out, null, 1))
memory.shutdown(); await embeddings.shutdown()
