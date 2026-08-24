#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { lstat, readFile, readlink, readdir } from 'node:fs/promises'
import { basename, resolve } from 'node:path'

const root = resolve(new URL('../..', import.meta.url).pathname)
const workspaceRoot = resolve(root, '..')
const expectedRoot = '/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype'
const expectedWorkspaceRoot = '/home/autobyteus/workspace/autobyteus-workspace'
const expectedRemote = 'https://github.com/AutoByteus/autobyteus-workspace.git'
const historicalSiblingRoot = '/home/autobyteus/workspace/autobyteus-web-prototype'
const historicalTaskRoot = '/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype'
const sourcePin = '8ef282ba77705180d985e7000d801f0e0068cdc1'
const approvedTree = 'ca1d3f9ed58f0fc1f673ff013a351841bf78e575'
const independentCommit = '0b02b0e1fbdbdefb78b91b1705bd497663694e0f'
const requireRemoteSync = process.env.REQUIRE_REMOTE_SYNC === '1'
const requireSiblingRemoval = process.env.REQUIRE_SIBLING_REMOVAL === '1'

const activeDocs = [
  'README.md', 'ui-ux-spec.md', 'prototype-bootstrap-report.md',
  'prototype-runbook.md', 'comparison-report.md', 'evidence-index.md',
  'pp-gap-009-correction.md', 'pp-gap-010-correction.md',
  'final-reference-screenshots/manifest.json',
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
const historicalAdditions = new Set([
  'independent-repository-migration.md',
  'prototype/scripts/validate-independent-repository.mjs',
  'evidence/repository-independence/rer-013-approved-tree-inventory.json',
  'evidence/repository-independence/rer-013-migration-proof.json',
  'evidence/repository-independence/rer-013-validation.txt',
])
const returnAdditions = new Set([
  'workspace-repository-return.md',
  'prototype/scripts/validate-workspace-ownership.mjs',
  'evidence/workspace-ownership/rer-015-return-proof.json',
  'evidence/workspace-ownership/rer-015-validation.txt',
])
const siblingTrees = {
  'memory-inspector-ux-redesign': '6826a4a074daf29f936852c1497cde26e88fb6fa',
  'memory-sync-transparency': 'cec2f0a6334f7cc58dfdd401bf5eab34bbefa1f0',
  'mobile-pwa-navigation': 'd3fc1d62e56db44b793e63665121106021543901',
  'taskagent-team-tab-active-tasks': '320c0eef410da34bf2402025583955c0f80a9786',
  'token-statistics-task-cost': 'f39c4858737394968b8f889375d3f56f9c131207',
}

const checks = []
function check(name, pass, detail = '') {
  checks.push({ name, pass, detail })
  process.stdout.write((pass ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : '') + '\n')
}
function gitRaw(...args) {
  return execFileSync('git', args, { cwd: workspaceRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}
function git(...args) { return gitRaw(...args).trim() }
async function exists(path) {
  try { await lstat(path); return true } catch { return false }
}
function gitBlobId(buffer) {
  return createHash('sha1').update('blob ' + buffer.length + '\0').update(buffer).digest('hex')
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
    if (['node_modules', '.nuxt', '.output'].includes(entry.name)) continue
    const childRelative = relative ? relative + '/' + entry.name : entry.name
    if (entry.name === '.git') { found.push(childRelative); continue }
    if (entry.isDirectory()) found.push(...await findNestedGit(resolve(dir, entry.name), childRelative))
  }
  return found
}

check('validator runs from the canonical workspace project root', root === expectedRoot)
check('Git top-level is the owning workspace repository', git('rev-parse', '--show-toplevel') === expectedWorkspaceRoot)
check('owning branch is personal', git('branch', '--show-current') === 'personal')
check('origin is the workspace repository', git('remote', 'get-url', 'origin') === expectedRemote)
check('prototype root contains no standalone .git metadata', !await exists(resolve(root, '.git')))
check('workspace has no .gitmodules file', !await exists(resolve(workspaceRoot, '.gitmodules')))
check('workspace has no configured submodule', gitRaw('submodule', 'status').trim() === '')

const indexRows = gitRaw('ls-files', '--stage', '--', 'autobyteus-web-prototype').trimEnd().split('\n').filter(Boolean)
check('complete prototype package is tracked as ordinary workspace content', indexRows.length >= 2010, String(indexRows.length) + ' tracked rows')
check('prototype index contains no gitlink', indexRows.every(row => !row.startsWith('160000 ')))
check('prototype index modes are ordinary files or symlinks', indexRows.every(row => /^(100644|100755|120000) /.test(row)))
const nestedGit = await findNestedGit(root)
check('prototype content contains no nested .git metadata', nestedGit.length === 0, nestedGit.join(', '))
check('selected source frontend was not copied inside the prototype root', !await exists(resolve(root, 'autobyteus-web')))

const inventory = JSON.parse(await readFile(resolve(root, 'evidence/repository-independence/rer-013-approved-tree-inventory.json'), 'utf8'))
check('approved source-tree identity is preserved', inventory.approvedPrototypeTree === approvedTree)
check('approved inventory records all 2,001 files', inventory.approvedFileCount === 2001 && inventory.rows.length === 2001)
const missing = []
const modified = []
for (const row of inventory.rows) {
  if (!await exists(resolve(root, row.path))) { missing.push(row.path); continue }
  if (await currentBlobId(row.path) !== row.blob) modified.push(row.path)
}
check('all 2,001 approved files remain present', missing.length === 0, missing.slice(0, 5).join(', '))
const unauthorizedModified = modified.filter(path => !authorizedBaselineChanges.has(path))
check('every approved-tree difference is an enumerated locator/provenance path', unauthorizedModified.length === 0, String(modified.length) + ' authorized')
const approvedBinary = inventory.rows.filter(row => /\.(?:png|jpe?g|gif|webp|ico|woff2?|ttf|otf|pdf)$/i.test(row.path))
const changedBinary = approvedBinary.filter(row => modified.includes(row.path))
check('all 848 approved binary evidence/assets preserve exact identity', approvedBinary.length === 848 && changedBinary.length === 0, String(approvedBinary.length - changedBinary.length) + '/' + String(approvedBinary.length))

for (const path of historicalAdditions) check('historical RER-013 artifact retained: ' + path, await exists(resolve(root, path)))
for (const path of returnAdditions) check('RER-015 return artifact present: ' + path, await exists(resolve(root, path)))
const baselinePaths = new Set(inventory.rows.map(row => row.path))
const allowedNew = new Set([...historicalAdditions, ...returnAdditions])
const trackedPaths = indexRows.map(row => row.split('\t')[1].replace(/^autobyteus-web-prototype\//, ''))
const unexpectedNew = trackedPaths.filter(path => !baselinePaths.has(path) && !allowedNew.has(path))
check('tracked additions contain only RER-013 history and RER-015 return evidence', unexpectedNew.length === 0, unexpectedNew.join(', '))

const activeText = Object.fromEntries(await Promise.all(activeDocs.map(async path => [path, await readFile(resolve(root, path), 'utf8')])))
const combinedActive = Object.values(activeText).join('\n')
check('all active locators use the workspace project root', combinedActive.includes(expectedRoot) && !combinedActive.includes(historicalSiblingRoot) && !combinedActive.includes(historicalTaskRoot))
check('active ownership identifies the workspace repository', activeText['README.md'].includes(expectedWorkspaceRoot) && activeText['ui-ux-spec.md'].includes(expectedWorkspaceRoot) && activeText['prototype-runbook.md'].includes(expectedWorkspaceRoot))
check('approved source pin remains explicit across active identity artifacts', ['README.md', 'ui-ux-spec.md', 'prototype-runbook.md', 'prototype-bootstrap-report.md', 'comparison-report.md'].every(path => activeText[path].includes(sourcePin)))
check('PPA-001 and PPA-002 remain explicit', combinedActive.includes('PPA-001') && combinedActive.includes('PPA-002'))
check('both user-confirmation references remain explicit', combinedActive.includes('“approved”') && combinedActive.includes('“done. i checked. thanks”'))

const historicalRecord = await readFile(resolve(root, 'independent-repository-migration.md'), 'utf8')
const returnRecord = await readFile(resolve(root, 'workspace-repository-return.md'), 'utf8')
check('independent repository is explicitly historical with durable commit provenance', historicalRecord.includes('Historical RER-013') && historicalRecord.includes(independentCommit) && returnRecord.includes(independentCommit))
check('RER-015 record names canonical workspace ownership', returnRecord.includes(expectedRoot) && returnRecord.includes(expectedWorkspaceRoot) && returnRecord.includes('RER-015'))

const manifest = JSON.parse(await readFile(resolve(root, 'final-reference-screenshots/manifest.json'), 'utf8'))
const visualIds = Array.from({ length: 17 }, (_, index) => 'VIS-' + String(index + 1).padStart(3, '0'))
check('final-reference manifest retains VIS-001 through VIS-017', manifest.results.map(row => row.id).join(',') === visualIds.join(','))
check('final-reference manifest retains approval boundary and source pin', manifest.sourceCommit === sourcePin && manifest.approvalReference.includes('done. i checked. thanks'))
check('all final-reference paths use the workspace root', manifest.results.every(row => row.imagePath.startsWith(root + '/final-reference-screenshots/')))
for (const row of manifest.results) {
  const bytes = await readFile(resolve(root, 'final-reference-screenshots', basename(row.imagePath)))
  check(row.id + ' hash remains exact', createHash('sha256').update(bytes).digest('hex') === row.screenshotSha256)
}

const gapSummary = JSON.parse(await readFile(resolve(root, 'evidence/gap-010/gap-010-summary.json'), 'utf8'))
const gapResults = JSON.parse(await readFile(resolve(root, 'evidence/gap-010/gap-010-results.json'), 'utf8'))
check('JRN-050-A through JRN-050-E remain 5/5 exact with zero browser errors', gapSummary.total === 5 && gapSummary.passed === 5 && gapSummary.failed.length === 0 && gapSummary.sourceBrowserErrors.length === 0 && gapSummary.prototypeBrowserErrors.length === 0 && gapResults.checkpoints.map(row => row.checkpoint.id).join(',') === 'JRN-050-A,JRN-050-B,JRN-050-C,JRN-050-D,JRN-050-E')
check('JRN-050-E member-focus contract remains exact', ['source', 'prototype'].every(target => gapResults.checkpoints.at(-1)?.[target]?.state?.selectedTeam?.focusedMemberAddress === '/writer' && gapResults.checkpoints.at(-1)?.[target]?.semantic?.teamWorkspaceHeader === 'writer'))

check('approved source pin exists in workspace history', git('cat-file', '-e', sourcePin + '^{commit}') === '')
check('selected source frontend has no correction diff', gitRaw('diff', '--', 'autobyteus-web').trim() === '')
const changedSiblings = Object.entries(siblingTrees).filter(([name, tree]) => git('rev-parse', 'HEAD:ui-prototypes/' + name) !== tree)
check('all five unrelated ui-prototypes sibling trees remain unchanged', changedSiblings.length === 0, changedSiblings.map(row => row[0]).join(', '))

const changedPaths = gitRaw('status', '--porcelain').trimEnd().split('\n').filter(Boolean).map(line => line.slice(3))
check('working tree is clean or changes are isolated to prototype root', changedPaths.every(path => path.startsWith('autobyteus-web-prototype/')), changedPaths.length ? String(changedPaths.length) + ' prototype path(s)' : 'clean')

let remoteHead = ''
try { remoteHead = git('rev-parse', 'refs/remotes/origin/personal') } catch {
  // The remote-tracking ref is required only at the terminal sync gate.
}
const localHead = git('rev-parse', 'HEAD')
check('origin/personal equals local personal when terminal sync is required', !requireRemoteSync || remoteHead === localHead, remoteHead || 'missing')
check('historical sibling checkout is absent only after terminal workspace verification', !requireSiblingRemoval || !await exists(historicalSiblingRoot), requireSiblingRemoval ? 'terminal' : 'protected until push')

const failed = checks.filter(row => !row.pass)
if (failed.length) {
  process.stderr.write('\n' + failed.length + ' workspace-ownership check(s) failed.\n')
  process.exitCode = 1
} else {
  process.stdout.write('\n' + checks.length + '/' + checks.length + ' workspace-ownership checks passed.\n')
}
