import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { createInstanceRegistry, INSTANCE_RECORD_SCHEMA_VERSION } from '../instanceRegistry.mjs'

function registryFixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'isolated-registry-test-'))
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }))
  return createInstanceRegistry({ dir })
}

function record(id, extra = {}) {
  return {
    schemaVersion: INSTANCE_RECORD_SCHEMA_VERSION,
    id,
    pid: 4242,
    executablePath: '/app/AutoByteus',
    args: [],
    controlPort: 9333,
    serverPort: 40001,
    dataRoot: '/tmp/root',
    ownsDataRoot: true,
    keepDataRoot: false,
    logPath: '/tmp/log',
    startedAt: '2026-09-29T00:00:00.000Z',
    ...extra,
  }
}

test('records round-trip atomically and ignore unrelated or invalid files', (t) => {
  const registry = registryFixture(t)
  registry.write(record('iso-9333-aaaa'))
  fs.writeFileSync(path.join(registry.dir, 'broken.json'), '{not json')
  fs.writeFileSync(path.join(registry.dir, 'other.json'), JSON.stringify({ schemaVersion: 99, id: 'other' }))

  assert.deepEqual(registry.read('iso-9333-aaaa'), record('iso-9333-aaaa'))
  assert.deepEqual(registry.list().map((entry) => entry.id), ['iso-9333-aaaa'])
  assert.equal((fs.statSync(registry.recordPath('iso-9333-aaaa')).mode & 0o777), 0o600)
  assert.deepEqual(fs.readdirSync(registry.dir).filter((name) => name.endsWith('.tmp')), [])

  registry.remove('iso-9333-aaaa')
  assert.equal(registry.read('iso-9333-aaaa'), null)
})

test('ids encode the control port and are unique', (t) => {
  const registry = registryFixture(t)
  const id = registry.generateId(9444)
  assert.match(id, /^iso-9444-[0-9a-f]{4}$/)
})

test('default id resolution requires exactly one record', (t) => {
  const registry = registryFixture(t)
  assert.throws(() => registry.resolveId(), { code: 'INSTANCE_NOT_FOUND', category: 'notFound' })
  registry.write(record('iso-9333-aaaa'))
  assert.equal(registry.resolveId(), 'iso-9333-aaaa')
  registry.write(record('iso-9334-bbbb', { controlPort: 9334, startedAt: '2026-09-29T01:00:00.000Z' }))
  assert.throws(() => registry.resolveId(), (error) => (
    error.code === 'INSTANCE_ID_REQUIRED'
    && error.category === 'usage'
    && error.message.includes('iso-9333-aaaa, iso-9334-bbbb')
  ))
  assert.throws(() => registry.resolveId('iso-1-zzzz'), { code: 'INSTANCE_NOT_FOUND' })
  assert.equal(registry.findByControlPort(9334).id, 'iso-9334-bbbb')
})
