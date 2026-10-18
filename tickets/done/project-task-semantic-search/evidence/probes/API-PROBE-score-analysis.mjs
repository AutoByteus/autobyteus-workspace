// API/E2E probe (ticket evidence, not product code): score-level analysis of the relevance rule on larger backlogs,
// using the production runner and catalog from the built server (`autobyteus-server-ts/dist`) and its model files.
// Backlogs (each = the 60 fixture Tasks + distractors):
//   templated  – the 940 generated distractors (API-PROBE-generate-backlog.mjs)
//   repo       – up to 940 Task-like texts from this repository's own finished tickets (tickets/done/*: requirements
//                docs, design specs, investigation notes; title from the folder name + the document's problem/goal/
//                intent section, ≤ 2,400 characters), i.e. real product-domain writing by the same team; no user data
//   fixture    – the 60 fixture Tasks alone (the approved test data package)
// Usage: node API-PROBE-score-analysis.mjs <serverDist> <modelsDir> <modelId> <backlog.json> <worktreeRoot> <out.json>
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const [dist, modelsDir, modelId, backlogFile, worktree, outFile] = process.argv.slice(2)
const { getEmbeddingModelDefinition } = await import(pathToFileURL(path.join(dist, 'embeddings/catalog/embedding-model-catalog.js')).href)
const { EmbeddingModelRunner } = await import(pathToFileURL(path.join(dist, 'embeddings/runtime/embedding-model-runner.js')).href)
const { selectRelevant } = await import(pathToFileURL(path.join(dist, 'embeddings/relevance.js')).href)
const model = getEmbeddingModelDefinition(modelId)
const backlog = JSON.parse(fs.readFileSync(backlogFile, 'utf8'))

const repoTasks = () => {
  // Up to 940 Task-like texts: per finished ticket, its requirements doc, design spec and investigation notes (in that
  // order of preference), each giving one Task: title from the folder name + the document's problem/goal/intent section
  // (or its opening text), ≤ 2,400 characters.
  const done = path.join(worktree, 'tickets/done')
  const out = []
  const docs = [['requirements-doc.md', /##\s+(Problem And Desired Outcome|Problem|Goal|Summary|Context)[^\n]*\n([\s\S]*?)(\n##\s|$)/i],
    ['design-spec.md', /##\s+(Intended Change|Current-State Read|Summary|Problem)[^\n]*\n([\s\S]*?)(\n##\s|$)/i],
    ['investigation-notes.md', /##\s+(Summary|Request|Problem|Findings|Context)[^\n]*\n([\s\S]*?)(\n##\s|$)/i]]
  for (const [docName, sectionRe] of docs) {
    for (const name of fs.readdirSync(done).sort()) {
      if (out.length >= 940) return out
      const file = path.join(done, name, docName)
      if (!fs.existsSync(file)) continue
      const text = fs.readFileSync(file, 'utf8')
      const section = text.match(sectionRe)?.[2] ?? text.split('\n').slice(3).join('\n')
      const title = name.replace(/[-_]+/g, ' ').replace(/^./, (c) => c.toUpperCase())
      const body = section.replace(/\|/g, ' ').replace(/[ \t]+/g, ' ').trim()
      if (body.length < 300) continue
      out.push({ id: `r${String(out.length + 1).padStart(3, '0')}`, source: `${name}/${docName}`, description: `${title}\n\n${body}`.slice(0, 2400) })
    }
  }
  return out
}

const runner = new EmbeddingModelRunner(model, path.join(modelsDir, modelId))
await runner.start()
const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s }
const cache = new Map()
const embedDocs = async (tasks) => {
  const todo = tasks.filter((t) => !cache.has(t.description))
  for (let i = 0; i < todo.length; i += 16) {
    const batch = todo.slice(i, i + 16)
    const vectors = await runner.embed('document', batch.map((t) => t.description))
    batch.forEach((t, j) => cache.set(t.description, vectors[j]))
  }
  return tasks.map((t) => ({ id: t.id, vector: cache.get(t.description) }))
}
const quantile = (values, q) => { const s = [...values].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))] }
const r3 = (x) => Math.round(x * 1000) / 1000

const repo = repoTasks()
const sets = {
  fixture: backlog.targets,
  templated: [...backlog.targets, ...backlog.distractors],
  repo: [...backlog.targets, ...repo],
}
const queries = [...backlog.paraphrases.map((p) => p.q), ...backlog.unrelatedExtended]
const qv = new Map((await runner.embed('query', queries)).map((v, i) => [queries[i], v]))
const result = { model: modelId, calibration: model.relevance, repoDistractors: repo.length, sets: {} }
// Optional env SETS=fixture,repo limits the backlogs (a heavy model on all of them takes hours on a busy host).
const wanted = process.env.SETS ? process.env.SETS.split(',') : Object.keys(sets)
for (const [name, tasks] of Object.entries(sets).filter(([n]) => wanted.includes(n))) {
  const docs = await embedDocs(tasks)
  const score = (q) => docs.map((d) => ({ id: d.id, score: dot(qv.get(q), d.vector) }))
  const para = backlog.paraphrases.map(({ q, targets }) => {
    const scored = score(q).sort((a, b) => b.score - a.score)
    const shown = selectRelevant(scored, model.relevance, 20)
    const rank = scored.findIndex((s) => targets.includes(s.id)) + 1
    const shownRank = shown.findIndex((s) => targets.includes(s.id)) + 1
    return { q, best: r3(scored[0].score), target: r3(scored[rank - 1].score), rank, shownRank, shown: shown.length }
  })
  const unrelated = (list) => list.map((q) => {
    const scored = score(q).sort((a, b) => b.score - a.score)
    return { q, best: r3(scored[0].score), bestId: scored[0].id, shown: selectRelevant(scored, model.relevance, 20).length }
  })
  const fixUn = unrelated(backlog.unrelated)
  const extUn = unrelated(backlog.unrelatedExtended)
  result.sets[name] = {
    tasks: tasks.length,
    paraphrases: {
      top5: r3(para.filter((p) => p.rank <= 5).length / para.length),
      shownInFirst5: r3(para.filter((p) => p.shownRank > 0 && p.shownRank <= 5).length / para.length),
      bestScore: { min: r3(Math.min(...para.map((p) => p.best))), p05: quantile(para.map((p) => p.best), 0.05), median: quantile(para.map((p) => p.best), 0.5) },
      shownCount: { median: quantile(para.map((p) => p.shown), 0.5), p90: quantile(para.map((p) => p.shown), 0.9), max: Math.max(...para.map((p) => p.shown)) },
    },
    unrelatedFixture: { noMatch: fixUn.filter((u) => u.shown === 0).length, of: fixUn.length, best: { max: r3(Math.max(...fixUn.map((u) => u.best))), median: quantile(fixUn.map((u) => u.best), 0.5) } },
    unrelatedExtended: { noMatch: extUn.filter((u) => u.shown === 0).length, of: extUn.length, best: { max: r3(Math.max(...extUn.map((u) => u.best))), median: quantile(extUn.map((u) => u.best), 0.5) } },
    unrelatedRows: extUn,
    paraphraseMisses: para.filter((p) => !(p.shownRank > 0 && p.shownRank <= 5)),
  }
  console.log(name, JSON.stringify({ tasks: tasks.length, ...result.sets[name].paraphrases, unrelatedFixture: result.sets[name].unrelatedFixture, unrelatedExtended: result.sets[name].unrelatedExtended }))
}
await runner.stop()
fs.writeFileSync(outFile, JSON.stringify(result, null, 1))
