#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { access, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(new URL('../..', import.meta.url).pathname)
const repoRoot = resolve(root, '..')
const sourcePin = '8ef282ba77705180d985e7000d801f0e0068cdc1'
const currentRoot = '/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype'
const staleRoots = [
  '/home/autobyteus/workspace/autobyteus-web-prototype',
  '/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web-prototype',
]
const docs = [
  'README.md', 'prototype-bootstrap-report.md', 'pp-gap-009-correction.md', 'parity-inventory.md',
  'comparison-report.md', 'evidence-index.md', 'prototype-scenarios.md', 'mock-boundaries.md', 'prototype-runbook.md',
  'ui-ux-spec.md', 'product-prototyper-baseline-review.md', 'final-reference-screenshots/README.md',
]
const checks = []
const check = (name, pass, detail = '') => {
  checks.push({ name, pass, detail })
  process.stdout.write(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}\n`)
}
const textByDoc = Object.fromEntries(await Promise.all(docs.map(async path => [path, await readFile(resolve(root, path), 'utf8')])))
const allText = Object.values(textByDoc).join('\n')
const activeLocatorText = docs.filter(path => path !== 'product-prototyper-baseline-review.md').map(path => textByDoc[path]).join('\n')

check('Canonical workspace-repository root is current in active prototype docs', activeLocatorText.includes(currentRoot) && staleRoots.every(staleRoot => !activeLocatorText.includes(staleRoot)))
check('Source pin is stable across identity and evidence docs', [
  'README.md', 'prototype-bootstrap-report.md', 'pp-gap-009-correction.md',
  'parity-inventory.md', 'comparison-report.md', 'evidence-index.md', 'prototype-runbook.md',
].every(path => textByDoc[path].includes(sourcePin)))
check('Current correction status is RER-009 accepted and user-confirmed', ['README.md', 'prototype-bootstrap-report.md', 'pp-gap-009-correction.md', 'parity-inventory.md', 'evidence-index.md', 'prototype-runbook.md'].every(path => textByDoc[path].includes('RER-009')) && allText.includes('PPA-002') && allText.includes('user-confirmed'))
check('Stable correction IDs are inventoried', textByDoc['parity-inventory.md'].includes('`WKS-022`') && textByDoc['parity-inventory.md'].includes('`JRN-050`'))
check('Inventory totals include all focused correction states', textByDoc['parity-inventory.md'].includes('Distinct rendered rows: **110**') && textByDoc['parity-inventory.md'].includes('Interaction journeys: **50**'))
check('Renewed Product Prototyper acceptance is explicit', textByDoc['product-prototyper-baseline-review.md'].includes('Acceptance ID: `PPA-002`') && textByDoc['ui-ux-spec.md'].includes('`PPA-002`'))
check('Final Product artifacts include the corrected journey', textByDoc['ui-ux-spec.md'].includes('`JRN-050`') && textByDoc['final-reference-screenshots/README.md'].includes('VIS-017'))

const summary = JSON.parse(await readFile(resolve(root, 'evidence/gap-009/gap-009-summary.json'), 'utf8'))
check('Gap summary is terminally passing', summary.inventoryId === 'JRN-050' && summary.gapId === 'PP-GAP-009' && summary.sourcePin === sourcePin && summary.total === 4 && summary.passed === 4 && summary.failed.length === 0 && summary.journeyContractPassed)
check('Gap summary has zero browser errors', summary.sourceBrowserErrors.length === 0 && summary.prototypeBrowserErrors.length === 0)

const results = JSON.parse(await readFile(resolve(root, 'evidence/gap-009/gap-009-results.json'), 'utf8'))
check('All four checkpoint comparisons are exact', results.checkpoints.length === 4 && results.checkpoints.every(row => row.comparison.pass && row.comparison.semanticEqual && row.comparison.stateEqual && row.comparison.screenshotEqual && row.comparison.perceptual.changedPixels === 0))
check('Final contract selects and projects the exact Team run', ['source', 'prototype'].every(target => {
  const state = results.checkpoints.at(-1)?.[target]?.state
  return state?.selection?.kind === 'team_run'
    && state.selection.rootTeamRunId === 'team-run-created-fixture'
    && state.draftCount === 0
    && state.teamNodes?.[0]?.workspaceRootPath === '/synthetic/prototype-workspace'
    && JSON.stringify(state.teamNodes[0].members.map(member => member.memberAddress)) === JSON.stringify(['/researcher', '/writer'])
}))

const hash = async path => createHash('sha256').update(await readFile(resolve(root, path))).digest('hex')
const manualSourceHash = await hash('evidence/gap-009/manual-source-complete-journey.png')
const manualPrototypeHash = await hash('evidence/gap-009/manual-prototype-complete-journey.png')
check('Direct Browser Tool final screenshots are byte-identical', manualSourceHash === manualPrototypeHash && manualSourceHash === 'bcb83aeea621dbf184691e1a57c02a1415854422cd6ca635e6b06ad0774e0fb4')

const requiredLogs = [
  'pp-gap-009-typecheck.txt', 'pp-gap-009-lint.txt', 'pp-gap-009-test.txt', 'pp-gap-009-boundaries.txt',
  'pp-gap-009-build.txt', 'pp-gap-009-browser-regression.txt', 'pp-gap-009-correction-regression.txt', 'pp-gap-009-gap-009.txt',
  'pp-gap-009-package.txt',
]
let logsExist = true
for (const name of requiredLogs) {
  try { await access(resolve(root, 'evidence/validation', name)) } catch { logsExist = false }
}
check('All focused validation logs exist', logsExist)
check('Final build log is successful', (await readFile(resolve(root, 'evidence/validation/pp-gap-009-build.txt'), 'utf8')).includes('Build complete!'))
check('Focused browser log contains all four passes', ['JRN-050-A', 'JRN-050-B', 'JRN-050-C', 'JRN-050-D'].every(id => (textByDoc['prototype-bootstrap-report.md'].includes(id))) && (await readFile(resolve(root, 'evidence/validation/pp-gap-009-gap-009.txt'), 'utf8')).match(/PASS JRN-050-[A-D]/g)?.length === 4)

const gitRaw = (...args) => execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
const git = (...args) => gitRaw(...args).trim()
check('Validation runs on workspace personal', git('branch', '--show-current') === 'personal')
check('Approved source pin exists in the owning repository', git('cat-file', '-e', `${sourcePin}^{commit}`) === '')
const changedPaths = gitRaw('status', '--porcelain').trimEnd().split('\n').filter(Boolean).map(line => line.slice(3))
check('Working tree is clean or changes are isolated to prototype root', changedPaths.every(path => path.startsWith('autobyteus-web-prototype/')), changedPaths.length ? `${changedPaths.length} prototype path(s)` : 'clean')
check('Product-owned spec and final references are finalized for RER-009', textByDoc['ui-ux-spec.md'].includes('17/17') && textByDoc['final-reference-screenshots/README.md'].includes('done. i checked. thanks'))

const absolutePaths = [...new Set(activeLocatorText.match(/\/home\/autobyteus\/workspace\/[A-Za-z0-9_./-]+/g) || [])]
let absolutePathsExist = true
for (const path of absolutePaths) {
  const cleanPath = path.replace(/[.),;:]$/, '')
  const runtimePath = cleanPath.startsWith(currentRoot) ? resolve(root, cleanPath.slice(currentRoot.length + 1)) : cleanPath
  try { await access(runtimePath) } catch { absolutePathsExist = false }
}
check('Absolute artifact and root paths resolve', absolutePathsExist, `${absolutePaths.length} checked`)

const failed = checks.filter(item => !item.pass)
if (failed.length) {
  process.stderr.write(`\n${failed.length} package-consistency check(s) failed.\n`)
  process.exitCode = 1
} else {
  process.stdout.write(`\n${checks.length}/${checks.length} PP-GAP-009 package-consistency checks pass.\n`)
}
