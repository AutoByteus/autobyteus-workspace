#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { lstat, readFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'

const root = resolve(new URL('../..', import.meta.url).pathname)
const canonicalRoot = '/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype'
const taskRoot = '/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype'
const sourcePin = '8ef282ba77705180d985e7000d801f0e0068cdc1'
const activeDocs = [
  'ui-ux-spec.md', 'product-prototyper-baseline-review.md', 'prototype-bootstrap-report.md',
  'comparison-report.md', 'evidence-index.md', 'prototype-runbook.md',
  'pp-gap-009-correction.md', 'pp-gap-010-correction.md',
  'repository-placement-correction.md', 'personal-integration-record.md',
  'final-reference-screenshots/manifest.json',
]
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
  try { await lstat(path); return true } catch (error) {
    if (error?.code === 'ENOENT') return false
    throw error
  }
}

const branch = git('branch', '--show-current')
const topLevel = git('rev-parse', '--show-toplevel')
check([canonicalRoot, taskRoot].includes(root), 'runtime root is the validated task candidate or canonical personal-checkout root')
check(['codex/initial-prototype-baseline', 'personal'].includes(branch), 'branch is the task integration candidate or personal')
check(root === resolve(topLevel, 'autobyteus-web-prototype'), 'prototype is ordinary repository-root content in its current worktree')
check(!await exists(resolve(root, '.git')), 'prototype contains no nested .git entry')
check(!await exists(resolve(topLevel, 'ui-prototypes/autobyteus-web-prototype')), 'prior nested project path is absent')

const staged = git('ls-files', '--stage', '--', ':(top)autobyteus-web-prototype').split('\n').filter(Boolean)
check(staged.length >= 1995, 'complete prototype package is tracked')
check(staged.every(line => !line.startsWith('160000 ')), 'prototype index has no gitlink/submodule entry')
check(staged.every(line => /^(100644|100755|120000) /.test(line)), 'prototype index modes are ordinary files or symlinks')
check(git('cat-file', '-e', `${sourcePin}^{commit}`) === '', 'approved source pin remains reachable')

const activeText = Object.fromEntries(await Promise.all(activeDocs.map(async path => [path, await readFile(resolve(root, path), 'utf8')])))
check(Object.values(activeText).every(text => !text.includes(taskRoot)), 'active package locators contain no ticket-worktree prototype root')
check(Object.values(activeText).some(text => text.includes(canonicalRoot)), 'active package locators identify the canonical personal-checkout root')

const proof = JSON.parse(await readFile(resolve(root, 'evidence/integration/rer-011-rebase-preservation.json'), 'utf8'))
check(proof.approvedSourcePin === sourcePin, 'integration proof preserves the approved source pin')
check(proof.initialFetchedOriginPersonal === '389748b0b9f0dea051aaed18641de131cf0adbbb' && proof.fetchedOriginPersonal === '8d6b06b8cf15d1f355be86b02ef233a111998f07', 'integration proof records both fresh origin/personal heads and uses the final one')
check(proof.remoteAdvancedDuringIntegration && proof.lateAdvance.commits === 3 && proof.lateAdvance.intersectionWithIntegrationLocatorChanges === 0, 'late remote advance is preserved with zero locator-change intersection')
check(proof.finalPreRebaseDivergence.changedPathIntersection === 0, 'remote-only and task-only changed-path sets had zero intersection')
check(proof.allSixPatchIdsPreserved, 'all six task commit patch identities survived the rebase')
check(proof.prototypeTreeByteExactAcrossRebase, 'prototype tree was byte-exact across the rebase')
check(proof.requirementsTreeByteExactAcrossRebase, 'requirements tree was byte-exact across the rebase')
check(proof.originIsAncestorAfterRebase, 'fetched origin/personal is an ancestor of the rebased package')
check(proof.taskCommitsAfter.length === 6 && proof.taskCommitsAfter.every(row => {
  try { execFileSync('git', ['-C', root, 'merge-base', '--is-ancestor', row.commit, 'HEAD']); return true } catch { return false }
}), 'all six rebased task commits remain ancestors of HEAD')
check(proof.allUnrelatedSiblingTreesMatchFetchedOrigin, 'all five unrelated ui-prototypes sibling trees match fetched origin/personal')
check(proof.unrelatedSiblingTrees.every(row => git('rev-parse', `HEAD:ui-prototypes/${row.name}`) === row.candidateTree), 'current sibling trees match the preserved integration proof')

const manifest = JSON.parse(await readFile(resolve(root, 'final-reference-screenshots/manifest.json'), 'utf8'))
check(manifest.sourceCommit === sourcePin, 'final-reference manifest keeps the approved source pin')
check(manifest.results.length === 17, 'final-reference manifest retains VIS-001 through VIS-017')
check(manifest.results.every(row => row.imagePath.startsWith(`${canonicalRoot}/final-reference-screenshots/`)), 'final-reference manifest uses canonical personal-checkout paths')
check(manifest.results.every(row => row.browserErrors.length === 0 && row.externalResources.length === 0), 'all final references retain zero browser errors and external resources')
for (const row of manifest.results) {
  const image = await readFile(resolve(root, 'final-reference-screenshots', basename(row.imagePath)))
  const actual = createHash('sha256').update(image).digest('hex')
  check(actual === row.screenshotSha256, `${row.id} approved screenshot hash is unchanged`)
}

const prepromotion = await readFile(resolve(root, 'evidence/integration/rer-011-final-rebase-prepromotion-validation.txt'), 'utf8')
check(prepromotion.includes('20/20 PP-GAP-009 package-consistency checks pass.'), 'post-rebase pre-promotion PP-GAP-009 validation is 20/20')
check(prepromotion.includes('25/25 PP-GAP-010 package-consistency checks pass.'), 'post-rebase pre-promotion PP-GAP-010 validation is 25/25')
check(prepromotion.includes('86/86 final-package consistency checks passed.'), 'post-rebase pre-promotion final-package validation is 86/86')
check(prepromotion.includes('Build complete!'), 'post-rebase pre-promotion production build completed')
check(prepromotion.includes('http_code=200'), 'post-rebase pre-promotion production HTTP check returned 200')

const status = execFileSync('git', ['-C', root, 'status', '--porcelain'], { encoding: 'utf8' })
  .split('\n').filter(Boolean).map(line => line.slice(3))
check(status.every(path => path.startsWith('autobyteus-web-prototype/')), status.length ? 'uncommitted candidate changes are isolated to the prototype root' : 'working tree is clean')

process.stdout.write(`${checks.length}/${checks.length} personal-integration checks passed.\n`)
