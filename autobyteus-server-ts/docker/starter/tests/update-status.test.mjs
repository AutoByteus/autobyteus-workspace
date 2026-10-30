import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'
import { IDLE_UPDATE, InvalidVersionError, UpdateStatus } from '../update-status.mjs'
import { tempDir } from './fixtures.mjs'

test('a running node reports its version, server and the relation of a target version', () => {
  const status = new UpdateStatus(tempDir('status-'))
  status.setRunning({ version: '1.5.11-beta.4', source: 'builtIn', pid: 42 })
  assert.deepEqual(status.status(), {
    version: '1.5.11-beta.4', state: 'running', server: { pid: 42, packageVersion: '1.5.11-beta.4', source: 'builtIn' }, update: IDLE_UPDATE,
  })
  assert.deepEqual(status.status('1.5.11-beta.5').target, { version: '1.5.11-beta.5', relation: 'newer' })
  assert.deepEqual(status.status('1.5.11-beta.4').target, { version: '1.5.11-beta.4', relation: 'same' })
  assert.deepEqual(status.status('1.5.10').target, { version: '1.5.10', relation: 'older' })
  assert.throws(() => status.status('latest'), InvalidVersionError)
})

test('a node that needs a new image has no server and carries the message', () => {
  const status = new UpdateStatus(tempDir('status-'))
  status.setNeedsNewImage({ version: '1.5.12', message: 'This node already ran 1.5.12; …' })
  const result = status.status()
  assert.equal(result.state, 'needsNewImage')
  assert.equal(result.server, undefined)
  assert.equal(result.message, 'This node already ran 1.5.12; …')
})

test('update.json is read tolerantly and an interrupted update keeps its target', () => {
  const root = tempDir('status-')
  mkdirSync(root, { recursive: true })
  writeFileSync(path.join(root, 'update.json'), JSON.stringify({ state: 'running', targetVersion: '1.5.12', step: 'download', futureField: 1 }))
  const status = new UpdateStatus(root)
  status.markInterrupted('interrupted')
  const update = status.readUpdate()
  assert.equal(update.state, 'failed')
  assert.equal(update.code, 'INTERRUPTED')
  assert.equal(update.targetVersion, '1.5.12')
  assert.equal(update.futureField, 1)
  assert.match(update.finishedAt, /^\d{4}-\d\d-\d\dT/)
})
