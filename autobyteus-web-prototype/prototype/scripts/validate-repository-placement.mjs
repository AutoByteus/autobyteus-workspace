#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { lstat, readFile, readdir } from 'node:fs/promises'
import { resolve, relative } from 'node:path'

const root = resolve(new URL('../..', import.meta.url).pathname)
const expectedRoot = '/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype'
const expectedTopLevel = '/home/autobyteus/workspace/autobyteus-workspace'
const expectedBranch = 'personal'
const repositoryRelativeRoot = 'autobyteus-web-prototype'
const repositoryRootPathspec = `:(top)${repositoryRelativeRoot}`
const priorNestedRelativeRoot = ['ui-prototypes', 'autobyteus-web-prototype'].join('/')
const priorTicketRoot = ['/home', 'autobyteus', 'workspace', '.codex', 'worktrees', 'initial-prototype-baseline', priorNestedRelativeRoot].join('/')
const priorOwningNestedRoot = [expectedTopLevel, priorNestedRelativeRoot].join('/')
const rejectedStandaloneRoot = ['/home', 'autobyteus', 'workspace', 'autobyteus-web-prototype'].join('/')
const requirementsPaths = [
  resolve(expectedTopLevel, 'tickets/in-progress/initial-prototype-baseline/requirements-doc.md'),
  resolve(expectedTopLevel, 'tickets/in-progress/initial-prototype-baseline/investigation-notes.md'),
  resolve(expectedTopLevel, 'tickets/in-progress/initial-prototype-baseline/requirements-revision-record.md'),
]
const siblingNames = [
  'memory-inspector-ux-redesign',
  'memory-sync-transparency',
  'mobile-pwa-navigation',
  'taskagent-team-tab-active-tasks',
  'token-statistics-task-cost',
]
const sha256 = value => createHash('sha256').update(value).digest('hex')
const checks = []

function check(condition, message) {
  if (!condition) throw new Error(`FAIL ${message}`)
  checks.push(message)
  process.stdout.write(`PASS ${message}\n`)
}

function git(...args) {
  return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim()
}

async function exists(path) {
  try {
    await lstat(path)
    return true
  } catch (error) {
    if (error?.code === 'ENOENT') return false
    throw error
  }
}

async function walk(directory, skip = new Set()) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) files.push(...await walk(path, skip))
    else if (entry.isFile() || entry.isSymbolicLink()) files.push(path)
  }
  return files
}

check(root === expectedRoot, 'prototype resolves to the user-selected repository-root destination')
check(git('rev-parse', '--show-toplevel') === expectedTopLevel, 'Git top-level is the existing owning repository')
check(git('branch', '--show-current') === expectedBranch, 'owning branch is personal')
check(git('rev-parse', 'HEAD') === git('rev-parse', 'origin/personal'), 'personal is synchronized with origin/personal before the focused commit')
check(!await exists(resolve(root, '.git')), 'prototype root contains no nested .git entry')
check(!await exists(resolve(expectedTopLevel, priorNestedRelativeRoot)), 'prior nested project path is absent')

const staged = git('ls-files', '--stage', '--', repositoryRootPathspec).split('\n').filter(Boolean)
check(staged.length >= 1934, 'prototype is staged/tracked as ordinary owning-repository content')
check(staged.every(line => !line.startsWith('160000 ')), 'Git index contains no prototype gitlink/submodule entry')
check(staged.every(line => /^(100644|100755|120000) /.test(line)), 'prototype index modes are ordinary files or symlinks')

const packageFiles = await walk(root, new Set(['node_modules', '.nuxt', '.output']))
const staleFiles = []
for (const path of packageFiles) {
  const data = await readFile(path)
  const matches = [priorNestedRelativeRoot, priorTicketRoot, priorOwningNestedRoot, rejectedStandaloneRoot]
    .filter(stale => data.includes(Buffer.from(stale)))
  if (matches.length) staleFiles.push({ path: relative(expectedTopLevel, path), matches })
}
for (const path of requirementsPaths) {
  const data = await readFile(path)
  const matches = [priorNestedRelativeRoot, priorTicketRoot, priorOwningNestedRoot]
    .filter(stale => data.includes(Buffer.from(stale)))
  if (matches.length) staleFiles.push({ path: relative(expectedTopLevel, path), matches })
}
check(staleFiles.length === 0, 'canonical package and requirements artifacts contain no stale active nested project roots')

const inventory = JSON.parse(await readFile(resolve(root, 'evidence/repository-placement/rer-007-pre-move-file-inventory.json'), 'utf8'))
check(inventory.fileCount === 1934, 'RER-007 pre-move inventory records all 1,934 approved files')
const missingRows = []
for (const row of inventory.files) {
  if (!await exists(resolve(root, row.path))) missingRows.push(row.path)
}
check(missingRows.length === 0, 'all 1,934 approved pre-move files remain present')

const approvedBinaryRows = inventory.files.filter(row =>
  /^(evidence\/(source|prototype)\/|final-reference-screenshots\/).+\.(png|jpg|jpeg|webp)$/i.test(row.path),
)
let preservedBinaryCount = 0
for (const row of approvedBinaryRows) {
  const data = await readFile(resolve(root, row.path))
  if (sha256(data) === row.sha256) preservedBinaryCount += 1
}
check(preservedBinaryCount === approvedBinaryRows.length, `all ${approvedBinaryRows.length} approved evidence/reference images preserve their pre-move hashes`)

const manifest = JSON.parse(await readFile(resolve(root, 'final-reference-screenshots/manifest.json'), 'utf8'))
check(manifest.results.length === 15, 'final-reference manifest retains VIS-001 through VIS-015')
check(manifest.results.every(row => row.imagePath.startsWith(`${root}/final-reference-screenshots/`)), 'final-reference manifest uses the repository-root image paths')
check(manifest.results.every(row => row.browserErrors.length === 0 && row.externalResources.length === 0), 'final references retain zero browser errors and external resources')
for (const row of manifest.results) {
  const image = await readFile(row.imagePath)
  check(sha256(image) === row.screenshotSha256, `${row.id} image hash matches its manifest`)
}

const siblingBaseline = JSON.parse(await readFile(resolve(root, 'evidence/repository-placement/rer-007-sibling-tree-baseline.json'), 'utf8'))
const indexTree = git('write-tree')
for (const name of siblingNames) {
  const current = git('rev-parse', `${indexTree}:ui-prototypes/${name}`)
  check(current === siblingBaseline.siblings[name], `${name} staged Git tree is unchanged`)
}

const uiSpec = await readFile(resolve(root, 'ui-ux-spec.md'), 'utf8')
check(uiSpec.includes(expectedRoot), 'UI/UX specification records the canonical repository-root path')
check(uiSpec.includes('RER-007') && uiSpec.includes('`personal`'), 'UI/UX specification records the approved RER-007 placement workflow')
check(uiSpec.includes('PPA-001') && uiSpec.includes('**“approved”**'), 'PPA-001 and explicit user approval remain recorded')
check(uiSpec.includes('8ef282ba77705180d985e7000d801f0e0068cdc1'), 'approved source pin remains recorded')

process.stdout.write(`${checks.length}/${checks.length} repository-placement checks passed.\n`)
