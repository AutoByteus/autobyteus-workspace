#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(new URL('../..', import.meta.url).pathname)
const sourcePath = resolve(root, 'prototype/fixtures/source-state-snapshots.json')
const outputPath = resolve(root, 'prototype/fixtures/runtime-state.json')
const sourceCommit = '8ef282ba77705180d985e7000d801f0e0068cdc1'
const source = JSON.parse(await readFile(sourcePath, 'utf8'))

const snapshots = Object.fromEntries(Object.entries(source.snapshots).map(([key, value]) => [key, {
  item: value.item,
  actualPath: value.actualPath,
  state: value.state,
  bootstrapPending: Boolean(value.bootstrapPending),
}]))

// The source capture taken during the delayed bootstrap has no mounted Pinia
// stores. For the browser-only prototype, derive the same visible transient
// frame from the populated shell, keep Applications unresolved, and let the
// local adapter delay the two page bootstrap actions. This reproduces the
// source spinner without retaining any backend bootstrap implementation.
const loadingKey = 'loading|desktop|/agents?view=list'
const populatedKey = 'populated|desktop|/agents?view=list'
const loading = snapshots[loadingKey]
const populated = snapshots[populatedKey]
if (!loading || !populated) throw new Error('Required loading/populated source snapshots are missing')
loading.state = structuredClone(populated.state)
loading.bootstrapPending = false
loading.state.applicationsCapability = { capability: null, status: 'loading', error: null }

await writeFile(outputPath, `${JSON.stringify({ sourceCommit, snapshots }, null, 2)}\n`)
process.stdout.write(`Wrote ${Object.keys(snapshots).length} deterministic runtime snapshots to ${outputPath}\n`)
