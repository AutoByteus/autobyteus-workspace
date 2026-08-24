#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { readFile, readdir, stat } from 'node:fs/promises'
import { basename, resolve } from 'node:path'

const root = resolve(new URL('../..', import.meta.url).pathname)
const sourceCommit = '8ef282ba77705180d985e7000d801f0e0068cdc1'
const currentRoot = '/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype'
const expectedVisualIds = Array.from({ length: 17 }, (_, index) => `VIS-${String(index + 1).padStart(3, '0')}`)

const read = path => readFile(resolve(root, path), 'utf8')
const json = async path => JSON.parse(await read(path))
const sha256 = value => createHash('sha256').update(value).digest('hex')
const checks = []

function check(condition, message) {
  if (!condition) throw new Error(`FAIL ${message}`)
  checks.push(message)
  process.stdout.write(`PASS ${message}\n`)
}

const uiSpec = await read('ui-ux-spec.md')
const review = await read('product-prototyper-baseline-review.md')
const inventory = await read('parity-inventory.md')
const boundaries = await read('mock-boundaries.md')
const plugin = await read('plugins/00.prototype-state.client.ts')

check(uiSpec.includes('- Status: **Approved**'), 'ui-ux-spec.md status is Approved')
check(uiSpec.includes('**“done. i checked. thanks”** on `2026-08-24`'), 'explicit RER-009 user-confirmation reference is recorded')
check(uiSpec.includes(sourceCommit), 'UI/UX specification records the pinned source commit')
check(uiSpec.includes(currentRoot), 'UI/UX specification records the canonical personal-checkout prototype root')
check(uiSpec.includes('`PPA-002`'), 'UI/UX specification records the focused RER-009 Product Prototyper acceptance')
check(review.includes('approved and finalized'), 'Product Prototyper final decision is recorded')
check(inventory.includes('user-approved current-state baseline'), 'parity inventory reports accepted user-approved status')
check(boundaries.includes('/public/prototype-assets/monaco/vs'), 'mock boundary records the local Monaco mirror')
check(plugin.includes("monacoLoader.config({ paths: { vs: '/prototype-assets/monaco/vs' } })"), 'runtime directs Monaco to the local mirror')

const monacoFiles = await readdir(resolve(root, 'public/prototype-assets/monaco/vs'), { recursive: true })
check(monacoFiles.length >= 100, 'local Monaco mirror is populated')
check((await stat(resolve(root, 'public/THIRD_PARTY_NOTICES/monaco-editor.txt'))).size > 0, 'Monaco third-party notice is present')

const summaries = [
  ['evidence/comparison/browser-parity-summary.json', 60],
  ['evidence/correction/correction-parity-summary.json', 48],
  ['evidence/matrix/route-matrix-summary.json', 123],
  ['evidence/correction-matrix/correction-parity-summary.json', 116],
  ['evidence/interactions/browser-journey-summary.json', 18],
  ['evidence/correction-journeys/correction-journey-summary.json', 31],
]
for (const [path, total] of summaries) {
  const summary = await json(path)
  check(summary.total === total && summary.passed === total && summary.failed.length === 0, `${path} is ${total}/${total}`)
  check((summary.prototypeBrowserErrorScenarios ?? summary.prototypeBrowserErrorJourneys ?? []).length === 0, `${path} has no prototype browser errors`)
}

const presentation = await json('evidence/presentation-code/presentation-code-parity-summary.json')
check(presentation.pinnedSourceCommit === sourceCommit, 'presentation audit uses the pinned source commit')
check(presentation.total === 369 && presentation.exactByteMatches === 369 && presentation.missingOrModified.length === 0, 'retained presentation audit is 369/369 exact')

const gapSummary = await json('evidence/gap-010/gap-010-summary.json')
check(gapSummary.inventoryId === 'JRN-050' && gapSummary.gapId === 'PP-GAP-010', 'terminal package identifies the complete corrected journey')
check(gapSummary.total === 5 && gapSummary.passed === 5 && gapSummary.failed.length === 0 && gapSummary.journeyContractPassed, 'JRN-050-A through JRN-050-E are terminally enforced and passing')
check(gapSummary.sourceBrowserErrors.length === 0 && gapSummary.prototypeBrowserErrors.length === 0, 'JRN-050 source and prototype evidence has zero browser errors')
const gapResults = await json('evidence/gap-010/gap-010-results.json')
const terminal = gapResults.checkpoints.at(-1)
check(terminal?.checkpoint?.id === 'JRN-050-E' && ['source', 'prototype'].every(target => (
  terminal[target]?.state?.selectedTeam?.focusedMemberAddress === '/writer'
  && terminal[target]?.state?.selectedTeam?.focusedAgentRunId === 'team-member-writer-created'
  && terminal[target]?.semantic?.selectedTeamMemberTestId === 'workspace-team-member-team-run-created-fixture-/writer'
  && terminal[target]?.semantic?.teamWorkspaceHeader === 'writer'
)), 'JRN-050-E terminal member-selection contract matches pinned source')

const manifest = await json('final-reference-screenshots/manifest.json')
check(manifest.sourceCommit === sourceCommit, 'final-reference manifest uses the pinned source commit')
check(manifest.result === '17/17 captured without browser errors or external resources', 'final-reference manifest reports 17/17 clean captures')
check(manifest.approvalReference.includes('done. i checked. thanks'), 'final-reference manifest records the RER-009 user confirmation')
check(manifest.results.map(row => row.id).join(',') === expectedVisualIds.join(','), 'final visual IDs are complete and ordered')
for (const row of manifest.results) {
  check(row.browserErrors.length === 0 && row.externalResources.length === 0, `${row.id} has no browser errors or external resources`)
  const image = await readFile(resolve(root, 'final-reference-screenshots', basename(row.imagePath)))
  check(sha256(image) === row.screenshotSha256, `${row.id} screenshot hash matches the manifest`)
  check(uiSpec.includes(`\`${row.id}\``), `${row.id} is mapped in ui-ux-spec.md`)
}

check(!uiSpec.includes('Status: `Draft`'), 'UI/UX specification contains no draft status')
check(!uiSpec.includes('Not yet available'), 'UI/UX specification contains no pending approval placeholder')

process.stdout.write(`${checks.length}/${checks.length} final-package consistency checks passed.\n`)
