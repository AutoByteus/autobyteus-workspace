// IR-002 local harness self-check, not API/E2E: evaluate only the actual checkpoint/runner
// source with synthetic cases and file I/O in an owned temporary directory. No product starts.
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'

const source = await fs.readFile('autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs', 'utf8')
const section = (start, end) => {
  const from = source.indexOf(start)
  const to = source.indexOf(end, from)
  assert(from >= 0 && to > from, `Source anchors missing: ${start}`)
  return source.slice(from, to)
}
const helper = section('const checkpoint =', 'const onlyCases =')
const runner = section('  const selectedCases =', '  const results =')
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
const execute = new AsyncFunction('fs', 'path', 'ledgerFile', 'onlyCases', 'cases', 'desktop',
  'outDir', 'page', 'context', 'browserErrors', 'assert', 'console',
  `let exitCode = 0; const evidence = { cases: {} };\n${helper}\n${runner}\nreturn { exitCode, evidence }`)
const owned = await fs.mkdtemp(path.join(os.tmpdir(), 'ssr-ir002-runner-'))
const results = []
try {
  for (const variant of [
    { name: 'desktop-absolute', desktop: true, ledger: 'absolute', ids: ['C', 'A', 'B', 'D'] },
    { name: 'browser-relative', desktop: false, ledger: 'relative', ids: ['B', 'A', 'D', 'C'] },
    { name: 'default-order', desktop: false, ledger: 'absolute', ids: null },
    { name: 'no-ledger', desktop: true, ledger: null, ids: ['D', 'A'] },
    { name: 'unknown-case', desktop: false, ledger: 'absolute', ids: ['unknown'] },
  ]) {
    const outDir = path.join(owned, variant.name)
    await fs.mkdir(outDir)
    const ledgerPath = path.join(outDir, 'ledger.md')
    const ledgerFile = variant.ledger === 'relative' ? path.relative(process.cwd(), ledgerPath)
      : variant.ledger ? ledgerPath : null
    const evidenceFile = path.join(outDir, 'delegated-launch-defaults-evidence.json')
    const events = [], executed = [], screenshots = [], browserErrors = []
    const context = { owned: true }
    const page = { screenshot: async ({ path: screenshot }) => {
      screenshots.push(path.basename(screenshot))
      if (screenshot.endsWith('C-failure.png')) throw new Error('Synthetic screenshot failure')
    } }
    const cases = ['A', 'B', 'C', 'D'].map(id => ({ id, title: `Synthetic ${id}`, fn: async (p, c) => {
      assert.equal(p, page); assert.equal(c, context)
      executed.push(id)
      if (id === 'B') throw Object.assign(new Error('Synthetic failure'), { details: { local: true } })
      if (id === 'C') browserErrors.push('Synthetic browser error')
      return { id }
    } }))
    const io = {
      writeFile: async (...args) => { events.push(['write', JSON.parse(args[1])]); await fs.writeFile(...args) },
      appendFile: async (file, line) => {
        assert.equal(file, ledgerPath)
        const [, id, event] = /\s([ABCD]) (Started|Completed) /.exec(line) ?? []
        assert(id && event, `Invalid checkpoint ${line}`)
        if (event === 'Completed') {
          // Completion must acknowledge the already persisted result, not merely in-memory state.
          const persisted = JSON.parse(await fs.readFile(evidenceFile, 'utf8'))
          assert(persisted.cases[id]); assert(line.includes(persisted.cases[id].result))
          assert(line.includes(evidenceFile))
          assert.equal(events.at(-1)[0], 'write')
        } else {
          assert(line.includes(variant.desktop ? 'desktop' : 'browser'))
          assert(line.includes(outDir))
          if (events.length) assert.equal(events.at(-1)[1], 'Completed')
        }
        events.push([id, event])
        await fs.appendFile(file, line)
      },
    }
    const invoke = () => execute(io, path, ledgerFile, variant.ids, cases, variant.desktop,
      outDir, page, context, browserErrors, (condition, message, details) => {
        if (!condition) throw Object.assign(new Error(message), { details })
      }, { log() {} })
    if (variant.name === 'unknown-case') {
      await assert.rejects(invoke, /Unknown case unknown/)
      assert.deepEqual(executed, []); assert.deepEqual(events, [])
    } else {
      const outcome = await invoke()
      const expected = variant.ids ?? cases.map(c => c.id)
      assert.deepEqual(executed, expected)
      assert.deepEqual(Object.keys(outcome.evidence.cases), expected)
      const failures = expected.filter(id => ['B', 'C'].includes(id))
      assert.equal(outcome.exitCode, failures.length ? 1 : 0)
      assert.deepEqual(screenshots, failures.map(id => `${id}-failure.png`))
      for (const id of expected) {
        const entry = outcome.evidence.cases[id]
        assert.equal(entry.result, failures.includes(id) ? 'Fail' : 'Pass')
        if (id === 'B') assert.deepEqual(entry.details, { local: true })
        if (id === 'C') assert.deepEqual(entry.details, ['Synthetic browser error'])
      }
      assert.deepEqual(JSON.parse(await fs.readFile(evidenceFile, 'utf8')), outcome.evidence)
      assert.equal(events.filter(e => e[0] === 'write').length, expected.length)
      if (ledgerFile) {
        assert.deepEqual(events.filter(e => e[0] !== 'write'), expected.flatMap(id => [[id, 'Started'], [id, 'Completed']]))
        assert.equal((await fs.readFile(ledgerPath, 'utf8')).split('\n').filter(Boolean).length, expected.length * 2)
      } else assert.equal(events.filter(e => e[0] !== 'write').length, 0)
    }
    results.push({ variant: variant.name, result: 'Pass' })
  }
} finally {
  await fs.rm(owned, { recursive: true, force: true })
}
console.log(JSON.stringify({ scope: 'Local runner/checkpoint self-check only; synthetic cases, no API/browser/desktop',
  source: 'autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs', results, ownedTemporaryFilesRemoved: true }, null, 2))
