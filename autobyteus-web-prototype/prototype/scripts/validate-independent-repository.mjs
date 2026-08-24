#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { lstat, readFile, readlink, readdir } from 'node:fs/promises'
import { basename, resolve } from 'node:path'

const root = resolve(new URL('../..', import.meta.url).pathname)
const expectedRoot = '/home/autobyteus/workspace/autobyteus-web-prototype'
const expectedRemote = 'https://github.com/AutoByteus/autobyteus-web-prototype.git'
const oldWorkspaceRoot = '/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype'
const oldTaskRoot = '/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype'
const sourcePin = '8ef282ba77705180d985e7000d801f0e0068cdc1'
const approvedTree = 'ca1d3f9ed58f0fc1f673ff013a351841bf78e575'
const priorIntegrationCommit = '0100f78d34344d87cf8b6f3627d5df2b50c935d4'
const requireRemoteSync = process.env.REQUIRE_REMOTE_SYNC === '1'
const requireWorkspaceRemoval = process.env.REQUIRE_WORKSPACE_REMOVAL === '1'

const activeDocs = [
  'README.md', 'ui-ux-spec.md', 'product-prototyper-baseline-review.md',
  'prototype-bootstrap-report.md', 'prototype-runbook.md', 'comparison-report.md',
  'evidence-index.md', 'pp-gap-009-correction.md', 'pp-gap-010-correction.md',
  'final-reference-screenshots/manifest.json', 'independent-repository-migration.md',
]
const authorizedBaselineChanges = new Set([
  'README.md', 'comparison-report.md', 'evidence-index.md',
  'final-reference-screenshots/manifest.json', 'package.json',
  'personal-integration-record.md', 'pp-gap-009-correction.md',
  'pp-gap-010-correction.md', 'product-prototyper-baseline-review.md',
  'prototype-bootstrap-report.md', 'prototype-runbook.md',
  'repository-placement-correction.md', 'ui-ux-spec.md',
  'prototype/scripts/validate-final-package.mjs',
  'prototype/scripts/audit-presentation-parity.mjs',
  'prototype/scripts/validate-gap-009-package.mjs',
  'prototype/scripts/validate-gap-010-package.mjs',
  'prototype/scripts/validate-personal-integration.mjs',
  'prototype/scripts/validate-repository-placement.mjs',
  'evidence/presentation-code/presentation-code-parity.json',
  'evidence/presentation-code/presentation-code-parity-summary.json',
  'evidence/runtime/boundary-validation.json',
])
const allowedNewPaths = new Set([
  'independent-repository-migration.md',
  'prototype/scripts/validate-independent-repository.mjs',
  'evidence/repository-independence/rer-013-approved-tree-inventory.json',
  'evidence/repository-independence/rer-013-migration-proof.json',
  'evidence/repository-independence/rer-013-validation.txt',
])

const checks = []
function check(name, pass, detail = '') {
  checks.push({ name, pass, detail })
  process.stdout.write(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}\n`)
}
function gitRaw(...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}
function git(...args) { return gitRaw(...args).trim() }
function gitExists(revision) {
  try { gitRaw('cat-file', '-e', revision); return true } catch { return false }
}
async function exists(path) {
  try { await lstat(path); return true } catch { return false }
}
function gitBlobId(buffer) {
  return createHash('sha1').update(`blob ${buffer.length}\0`).update(buffer).digest('hex')
}
async function currentBlobId(path) {
  const absolute = resolve(root, path)
  const info = await lstat(absolute)
  const bytes = info.isSymbolicLink() ? Buffer.from(await readlink(absolute)) : await readFile(absolute)
  return gitBlobId(bytes)
}
async function findNestedGit(dir, relative = '') {
  const found = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (!relative && entry.name === '.git') continue
    if (['node_modules', '.nuxt', '.output'].includes(entry.name)) continue
    const childRelative = relative ? `${relative}/${entry.name}` : entry.name
    if (entry.name === '.git') { found.push(childRelative); continue }
    if (entry.isDirectory()) found.push(...await findNestedGit(resolve(dir, entry.name), childRelative))
  }
  return found
}

check('validator runs from the canonical independent sibling root', root === expectedRoot)
check('Git top-level is the independent prototype root', git('rev-parse', '--show-toplevel') === root)
check('independent accepted branch is personal', git('branch', '--show-current') === 'personal')
check('origin is the user-selected independent remote', git('remote', 'get-url', 'origin') === expectedRemote)
check('repository has no .gitmodules file', !await exists(resolve(root, '.gitmodules')))
check('repository has no configured submodule', gitRaw('submodule', 'status').trim() === '')
const indexRows = gitRaw('ls-files', '--stage').trimEnd().split('\n').filter(Boolean)
check('complete approved package is tracked as repository-root content', indexRows.length >= 2001, `${indexRows.length} tracked rows`)
check('Git index contains no gitlink', indexRows.every(row => !row.startsWith('160000 ')))
check('Git index modes are ordinary files or symlinks', indexRows.every(row => /^(100644|100755|120000) /.test(row)))
const nestedGit = await findNestedGit(root)
check('repository content contains no nested .git metadata', nestedGit.length === 0, nestedGit.join(', '))
check('selected source frontend was not copied into the prototype repository', !await exists(resolve(root, 'autobyteus-web')))

const inventory = JSON.parse(await readFile(resolve(root, 'evidence/repository-independence/rer-013-approved-tree-inventory.json'), 'utf8'))
check('approved source-tree identity is recorded exactly', inventory.approvedPrototypeTree === approvedTree)
check('approved inventory records all 2,001 files', inventory.approvedFileCount === 2001 && inventory.rows.length === 2001)
check('approved inventory records durable prior integration provenance', inventory.durablePriorIntegrationCommit === priorIntegrationCommit)
const missing = []
const modified = []
for (const row of inventory.rows) {
  if (!await exists(resolve(root, row.path))) { missing.push(row.path); continue }
  if (await currentBlobId(row.path) !== row.blob) modified.push(row.path)
}
check('all 2,001 approved files remain present', missing.length === 0, missing.slice(0, 5).join(', '))
const unauthorizedModified = modified.filter(path => !authorizedBaselineChanges.has(path))
check('all approved-tree differences are limited to authorized active locator/provenance files', unauthorizedModified.length === 0, `${modified.length} authorized; ${unauthorizedModified.join(', ')}`)
const approvedBinary = inventory.rows.filter(row => /\.(?:png|jpe?g|gif|webp|ico|woff2?|ttf|otf|pdf)$/i.test(row.path))
const changedBinary = approvedBinary.filter(row => modified.includes(row.path))
check('all approved binary evidence/assets preserve exact Git blob identity', changedBinary.length === 0, `${approvedBinary.length}/${approvedBinary.length}`)

const newTrackedOrPresent = []
for (const path of allowedNewPaths) if (await exists(resolve(root, path))) newTrackedOrPresent.push(path)
check('RER-013 adds only enumerated ownership/provenance evidence', newTrackedOrPresent.length === allowedNewPaths.size, `${newTrackedOrPresent.length}/${allowedNewPaths.size}`)
const baselinePaths = new Set(inventory.rows.map(row => row.path))
const trackedPaths = gitRaw('ls-files').trimEnd().split('\n').filter(Boolean)
const unexpectedNew = trackedPaths.filter(path => !baselinePaths.has(path) && !allowedNewPaths.has(path))
check('tracked additions contain no unrelated project content', unexpectedNew.length === 0, unexpectedNew.join(', '))

const activeText = Object.fromEntries(await Promise.all(activeDocs.map(async path => [path, await readFile(resolve(root, path), 'utf8')])))
const combinedActive = Object.values(activeText).join('\n')
check('all active prototype locators use the independent sibling root', combinedActive.includes(expectedRoot) && !combinedActive.includes(oldWorkspaceRoot) && !combinedActive.includes(oldTaskRoot))
check('active ownership records identify the independent GitHub repository', combinedActive.includes(expectedRemote))
check('approved source pin remains explicit across active identity artifacts', ['README.md', 'ui-ux-spec.md', 'prototype-runbook.md', 'prototype-bootstrap-report.md', 'comparison-report.md'].every(path => activeText[path].includes(sourcePin)))
check('PPA-001 and PPA-002 remain explicit', combinedActive.includes('PPA-001') && combinedActive.includes('PPA-002'))
check('both user-confirmation references remain explicit', combinedActive.includes('“approved”') && combinedActive.includes('“done. i checked. thanks”'))
check('historical placement records explicitly label prior locators as historical', (await readFile(resolve(root, 'repository-placement-correction.md'), 'utf8')).includes('Historical RER-007') && (await readFile(resolve(root, 'personal-integration-record.md'), 'utf8')).includes('Historical Provenance'))
check('migration record preserves approved workspace provenance without importing its history', combinedActive.includes(priorIntegrationCommit) && combinedActive.includes(approvedTree))

const manifest = JSON.parse(await readFile(resolve(root, 'final-reference-screenshots/manifest.json'), 'utf8'))
const visualIds = Array.from({ length: 17 }, (_, index) => `VIS-${String(index + 1).padStart(3, '0')}`)
check('final-reference manifest retains VIS-001 through VIS-017', manifest.results.map(row => row.id).join(',') === visualIds.join(','))
check('final-reference manifest retains both approval boundary and source pin', manifest.sourceCommit === sourcePin && manifest.approvalReference.includes('done. i checked. thanks'))
check('all final-reference paths use the independent root', manifest.results.every(row => row.imagePath.startsWith(`${root}/final-reference-screenshots/`)))
for (const row of manifest.results) {
  const bytes = await readFile(resolve(root, 'final-reference-screenshots', basename(row.imagePath)))
  check(`${row.id} hash remains exact`, createHash('sha256').update(bytes).digest('hex') === row.screenshotSha256)
}

const gapSummary = JSON.parse(await readFile(resolve(root, 'evidence/gap-010/gap-010-summary.json'), 'utf8'))
const gapResults = JSON.parse(await readFile(resolve(root, 'evidence/gap-010/gap-010-results.json'), 'utf8'))
check('JRN-050-A through JRN-050-E remain 5/5 exact with zero browser errors', gapSummary.total === 5 && gapSummary.passed === 5 && gapSummary.failed.length === 0 && gapSummary.sourceBrowserErrors.length === 0 && gapSummary.prototypeBrowserErrors.length === 0 && gapResults.checkpoints.map(row => row.checkpoint.id).join(',') === 'JRN-050-A,JRN-050-B,JRN-050-C,JRN-050-D,JRN-050-E')
check('JRN-050-E member-focus contract remains exact', ['source', 'prototype'].every(target => gapResults.checkpoints.at(-1)?.[target]?.state?.selectedTeam?.focusedMemberAddress === '/writer' && gapResults.checkpoints.at(-1)?.[target]?.semantic?.teamWorkspaceHeader === 'writer'))

const hasHead = gitExists('HEAD^{commit}')
const commitCount = hasHead ? Number(git('rev-list', '--count', 'HEAD')) : 0
check('independent repository has clean prototype-focused history only', !hasHead || commitCount === 1, hasHead ? `${commitCount} commit` : 'initial candidate')
check('unrelated workspace integration commit object was not imported', !gitExists(`${priorIntegrationCommit}^{commit}`))
check('approved source repository commit object was not imported', !gitExists(`${sourcePin}^{commit}`))
let remoteHead = ''
try { remoteHead = git('rev-parse', 'refs/remotes/origin/personal') } catch {
  // Expected before the independent personal branch is pushed for the first time.
}
const localHead = hasHead ? git('rev-parse', 'HEAD') : ''
check('origin/personal is absent only for the pre-push candidate or equals local personal', remoteHead ? remoteHead === localHead : !requireRemoteSync, remoteHead || 'pre-push candidate')
const status = gitRaw('status', '--porcelain').trim()
check('working tree is clean when terminal remote verification is required', !requireRemoteSync || status === '', status ? `${status.split('\n').length} candidate changes` : 'clean')
check('workspace copy is absent when terminal ownership migration is required', !requireWorkspaceRemoval || !await exists(oldWorkspaceRoot), requireWorkspaceRemoval ? 'terminal' : 'pre-removal candidate')

const failed = checks.filter(row => !row.pass)
if (failed.length) {
  process.stderr.write(`\n${failed.length} independent-repository check(s) failed.\n`)
  process.exitCode = 1
} else {
  process.stdout.write(`\n${checks.length}/${checks.length} independent-repository checks passed.\n`)
}
