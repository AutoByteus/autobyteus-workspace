#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const prototypeRoot = resolve(new URL('../..', import.meta.url).pathname)
const sourceRepo = process.env.SOURCE_REPO || '/home/autobyteus/workspace/autobyteus-workspace'
const sourceCommit = '8ef282ba77705180d985e7000d801f0e0068cdc1'
const sourceProjectPrefix = 'autobyteus-web'
const sourceRoot = `git:${sourceRepo}@${sourceCommit}:${sourceProjectPrefix}`
const evidenceRoot = resolve(prototypeRoot, 'evidence/presentation-code')
const roots = ['components', 'pages', 'layouts', 'assets', 'public', 'localization', 'display']
const topLevel = ['app.vue', 'error.vue', 'tailwind.config.js']
const sha256 = value => createHash('sha256').update(value).digest('hex')

function gitBuffer(...args) {
  return execFileSync('git', ['-C', sourceRepo, ...args], { encoding: null })
}

function gitText(...args) {
  return execFileSync('git', ['-C', sourceRepo, ...args], { encoding: 'utf8' }).trim()
}

gitText('cat-file', '-e', `${sourceCommit}^{commit}`)
const sourceFiles = gitText('ls-tree', '-r', '--name-only', sourceCommit, '--', `${sourceProjectPrefix}/`)
  .split('\n')
  .filter(Boolean)
  .map(path => path.slice(sourceProjectPrefix.length + 1))
  .filter(path =>
    topLevel.includes(path)
    || roots.some(root => path.startsWith(`${root}/`)),
  )
  .filter(path => !path.includes('/__tests__/') && !/\.(?:spec|test)\.[cm]?[jt]sx?$/.test(path))
  .sort()

const rows = []
for (const path of sourceFiles) {
  const sourcePath = `${sourceRoot}/${path}`
  const prototypePath = resolve(prototypeRoot, path)
  const source = gitBuffer('show', `${sourceCommit}:${sourceProjectPrefix}/${path}`)
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
  pinnedSourceCommit: sourceCommit,
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
process.stdout.write(`${summary.exactByteMatches}/${summary.total} retained presentation files are exact byte matches against pinned Git content.\n`)
if (summary.missingOrModified.length) process.exitCode = 1
