#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { resolve, relative } from 'node:path'

const prototypeRoot = resolve(new URL('../..', import.meta.url).pathname)
const sourceRoot = process.env.SOURCE_ROOT || '/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web'
const evidenceRoot = resolve(prototypeRoot, 'evidence/presentation-code')
const roots = ['components', 'pages', 'layouts', 'assets', 'public', 'localization', 'display']
const topLevel = ['app.vue', 'error.vue', 'tailwind.config.js']
const sha256 = value => createHash('sha256').update(value).digest('hex')

async function walk(path) {
  const rows = []
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const full = resolve(path, entry.name)
    if (entry.isDirectory()) rows.push(...await walk(full))
    else if (entry.isFile() && !full.includes('/__tests__/') && !/\.(?:spec|test)\.[cm]?[jt]sx?$/.test(entry.name)) rows.push(full)
  }
  return rows
}

const sourceFiles = [
  ...topLevel.map(file => resolve(sourceRoot, file)),
  ...(await Promise.all(roots.map(root => walk(resolve(sourceRoot, root))))).flat(),
]
const rows = []
for (const sourcePath of sourceFiles.sort()) {
  const path = relative(sourceRoot, sourcePath)
  const prototypePath = resolve(prototypeRoot, path)
  const source = await readFile(sourcePath)
  let prototype = null
  try { prototype = await readFile(prototypePath) } catch { /* reported below */ }
  const sourceSha256 = sha256(source)
  const prototypeSha256 = prototype ? sha256(prototype) : null
  rows.push({
    id: `PRES-${String(rows.length + 1).padStart(3, '0')}`,
    path,
    sourcePath,
    prototypePath,
    sourceSha256,
    prototypeSha256,
    exactByteMatch: sourceSha256 === prototypeSha256,
  })
}

const summary = {
  pinnedSourceCommit: '8ef282ba77705180d985e7000d801f0e0068cdc1',
  sourceRoot,
  prototypeRoot,
  total: rows.length,
  exactByteMatches: rows.filter(row => row.exactByteMatch).length,
  missingOrModified: rows.filter(row => !row.exactByteMatch).map(row => row.id),
  scope: [...topLevel, ...roots],
}
await mkdir(evidenceRoot, { recursive: true })
await writeFile(resolve(evidenceRoot, 'presentation-code-parity.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), summary, rows }, null, 2)}\n`)
await writeFile(resolve(evidenceRoot, 'presentation-code-parity-summary.json'), `${JSON.stringify(summary, null, 2)}\n`)
process.stdout.write(`${summary.exactByteMatches}/${summary.total} retained presentation files are exact byte matches.\n`)
if (summary.missingOrModified.length) process.exitCode = 1
