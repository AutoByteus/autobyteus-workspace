#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { lstat, readFile, readdir } from 'node:fs/promises'
import { resolve, relative } from 'node:path'

const root = resolve(new URL('../..', import.meta.url).pathname)
const expectedRoot = '/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/ui-prototypes/autobyteus-web-prototype'
const expectedTopLevel = '/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline'
const expectedBranch = 'codex/initial-prototype-baseline'
const repositoryRelativeRoot = 'ui-prototypes/autobyteus-web-prototype'
const repositoryRootPathspec = `:(top)${repositoryRelativeRoot}`
const rejectedRoot = ['/home', 'autobyteus', 'workspace', 'autobyteus-web-prototype'].join('/')
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

check(root === expectedRoot, 'prototype resolves to the corrected absolute root')
check(git('rev-parse', '--show-toplevel') === expectedTopLevel, 'Git top-level is the existing ticket worktree')
check(git('branch', '--show-current') === expectedBranch, 'owning branch is codex/initial-prototype-baseline')

let nestedGitExists = false
try {
  await lstat(resolve(root, '.git'))
  nestedGitExists = true
} catch (error) {
  if (error?.code !== 'ENOENT') throw error
}
check(!nestedGitExists, 'prototype root contains no nested .git entry')

const staged = git('ls-files', '--stage', '--', repositoryRootPathspec).split('\n').filter(Boolean)
check(staged.length >= 1900, 'prototype is staged/tracked as ordinary owning-repository content')
check(staged.every(line => !line.startsWith('160000 ')), 'Git index contains no gitlink/submodule entry')
check(staged.every(line => /^(100644|100755|120000) /.test(line)), 'Git index modes are ordinary files or symlinks')

const packageFiles = await walk(root, new Set(['node_modules', '.nuxt', '.output']))
const staleFiles = []
for (const path of packageFiles) {
  const data = await readFile(path)
  if (data.includes(Buffer.from(rejectedRoot))) staleFiles.push(relative(root, path))
}
check(staleFiles.length === 0, 'no canonical package file contains the rejected active root')

const inventory = JSON.parse(await readFile(resolve(root, 'evidence/repository-placement/pre-relocation-file-inventory.json'), 'utf8'))
check(inventory.fileCount === 1924, 'pre-relocation inventory records all 1,924 approved files')
const approvedBinaryRows = inventory.files.filter(row =>
  /^(evidence\/(source|prototype)\/|final-reference-screenshots\/).+\.(png|jpg|jpeg|webp)$/i.test(row.path),
)
let preservedBinaryCount = 0
for (const row of approvedBinaryRows) {
  const data = await readFile(resolve(root, row.path))
  if (sha256(data) === row.sha256) preservedBinaryCount += 1
}
check(preservedBinaryCount === approvedBinaryRows.length, `all ${approvedBinaryRows.length} approved evidence/reference images preserve their pre-relocation hashes`)

const manifest = JSON.parse(await readFile(resolve(root, 'final-reference-screenshots/manifest.json'), 'utf8'))
check(manifest.results.length === 15, 'final-reference manifest retains VIS-001 through VIS-015')
check(manifest.results.every(row => row.imagePath.startsWith(`${root}/final-reference-screenshots/`)), 'final-reference manifest uses corrected absolute image paths')
check(manifest.results.every(row => row.browserErrors.length === 0 && row.externalResources.length === 0), 'final references retain zero browser errors and external resources')
for (const row of manifest.results) {
  const image = await readFile(row.imagePath)
  check(sha256(image) === row.screenshotSha256, `${row.id} image hash matches its manifest`)
}

const uiSpec = await readFile(resolve(root, 'ui-ux-spec.md'), 'utf8')
check(uiSpec.includes(expectedRoot), 'UI/UX specification records the corrected canonical root')
check(uiSpec.includes('PPA-001') && uiSpec.includes('**“approved”**'), 'PPA-001 and explicit user approval remain recorded')
check(uiSpec.includes('8ef282ba77705180d985e7000d801f0e0068cdc1'), 'approved source pin remains recorded')

process.stdout.write(`${checks.length}/${checks.length} repository-placement checks passed.\n`)
