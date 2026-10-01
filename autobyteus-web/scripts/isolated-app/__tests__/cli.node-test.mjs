import assert from 'node:assert/strict'
import test from 'node:test'
import { parseArgs, runCli, USAGE } from '../cli.mjs'
import { notFoundError } from '../isolatedAppErrors.mjs'

test('relative paths resolve against INIT_CWD and are rejected without it', () => {
  const parsed = parseArgs(['start', '--app', 'build/AutoByteus.app', '--data-root', 'roots/demo'], { INIT_CWD: '/work' })
  assert.equal(parsed.options.app, '/work/build/AutoByteus.app')
  assert.equal(parsed.options.dataRoot, '/work/roots/demo')
  assert.throws(() => parseArgs(['start', '--data-root', 'roots/demo'], {}), { code: 'USAGE_ERROR' })
  assert.equal(parseArgs(['start', '--data-root', '/abs'], {}).options.dataRoot, '/abs')
})

test('options are validated per command', () => {
  assert.deepEqual(parseArgs(['stop', 'iso-9333-abcd', '--keep'], {}).options, { instanceId: 'iso-9333-abcd', keep: true })
  assert.deepEqual(parseArgs(['start', '--control-port', '9444', '--build'], {}).options, { controlPort: 9444, build: true })
  assert.throws(() => parseArgs(['list', '--keep'], {}), { code: 'USAGE_ERROR' })
  assert.throws(() => parseArgs(['restart', '--keep'], {}), { code: 'USAGE_ERROR' })
  assert.throws(() => parseArgs(['start', '--control-port', 'abc'], {}), { code: 'USAGE_ERROR' })
  assert.throws(() => parseArgs(['start', 'extra'], {}), { code: 'USAGE_ERROR' })
  assert.throws(() => parseArgs(['start', '--frobnicate'], {}), { code: 'USAGE_ERROR' })
})

test('start has no default control port in the parser or usage text', () => {
  assert.deepEqual(parseArgs(['start'], {}).options, {})
  assert.ok(!USAGE.includes('9333'))
  assert.match(USAGE, /\[--control-port <n>\]/)
})

test('runCli prints one schema-v1 JSON value and maps error categories to exit codes', async () => {
  const outputs = []
  const write = (text) => outputs.push(text)
  const okExit = await runCli(['list'], {
    write,
    createLifecycle: () => ({ list: async () => ({ instances: [] }) }),
  })
  assert.equal(okExit, 0)
  assert.deepEqual(JSON.parse(outputs[0]), { schemaVersion: 1, ok: true, command: 'list', result: { instances: [] } })

  const notFoundExit = await runCli(['stop', 'iso-1-aaaa'], {
    write,
    createLifecycle: () => ({ stop: async () => { throw notFoundError('INSTANCE_NOT_FOUND', 'missing') } }),
  })
  assert.equal(notFoundExit, 4)
  assert.deepEqual(JSON.parse(outputs[1]).error, { code: 'INSTANCE_NOT_FOUND', message: 'missing' })

  assert.equal(await runCli(['frob'], { write }), 2)
  assert.equal(await runCli(['list'], {
    write,
    createLifecycle: () => ({ list: async () => { throw new Error('boom') } }),
  }), 5)
  assert.equal(JSON.parse(outputs[3]).error.code, 'INTERNAL_ERROR')
})
