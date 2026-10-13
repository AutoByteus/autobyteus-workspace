// Local IR-003 check of the actual root-stop helper with synthetic dependencies, no API/UI starts.
import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
const file = 'autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs'
const refIndex = process.argv.indexOf('--source-ref')
const sourceRef = refIndex < 0 ? null : process.argv[refIndex + 1]
const source = sourceRef ? execFileSync('git', ['show', `${sourceRef}:${file}`], { encoding: 'utf8' }) : await fs.readFile(file, 'utf8')
const start = source.indexOf('const keyboardStopRoot =')
const end = source.indexOf("defineCase('DCP-001'", start)
assert(start >= 0 && end > start)
const helper = source.slice(start, end)
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
const evaluate = new AsyncFunction('page', 'kind', 'rootHistory', 'rootActive', 'assert', 'heldSidebarStop',
  'waitFor', 'sel', 'shot', 'stop', 'row', `${helper}\nreturn keyboardStopRoot(page, 'LOCAL', kind, 'owned-id', stop, row, 'Enter')`)
const results = []
for (const scenario of [
  { name: 'desktop-org-history', kind: 'AGENT_ORG', url: 'file:///owned/index.html#/workspace?mode=history&runId=owned-id', accepts: true },
  { name: 'browser-org-history', kind: 'AGENT_ORG', url: 'http://127.0.0.1:49999/workspace?mode=history&runId=owned-id', accepts: true },
  { name: 'desktop-org-active-rejected', kind: 'AGENT_ORG', url: 'file:///owned/index.html#/workspace?mode=active&runId=owned-id', accepts: false },
  { name: 'browser-org-active-rejected', kind: 'AGENT_ORG', url: 'http://127.0.0.1:49999/workspace?mode=active&runId=owned-id', accepts: false },
  { name: 'agent-history', kind: 'AGENT', url: 'file:///owned/index.html#/chat?id=owned-id', accepts: true },
  { name: 'team-history', kind: 'AGENT_TEAM', url: 'file:///owned/index.html#/workspace?teamRunId=owned-id', accepts: true },
]) {
  let reads = 0, observed, archive = 0, shots = 0
  const stop = { isVisible: async () => false }
  const row = { isVisible: async () => true }
  const page = { url: () => scenario.url, locator: (selector) => {
    assert.equal(selector, '[data-test="agent-org-run-archive-owned-id"]')
    return { waitFor: async (options) => { assert.equal(options.state, 'attached'); archive++ } }
  } }
  const invoke = () => evaluate(page, scenario.kind, async (kind, runId) => {
    assert.equal(kind, scenario.kind); assert.equal(runId, 'owned-id'); return { isActive: reads++ === 0 }
  }, record => record.isActive, (condition, message) => assert(condition, message),
  async (p, id, s, r, operation) => {
    assert.equal(p, page); assert.equal(s, stop); assert.equal(r, row)
    observed = operation; return { local: true }
  }, async (_label, fn) => { const result = await fn(); assert(result); return result },
  test => `[data-test="${test}"]`, async () => { shots++ }, stop, row)
  try {
    if (scenario.accepts) {
      const result = await invoke(); assert.equal(result.urlAfter, scenario.url); assert.equal(shots, 1)
    } else await assert.rejects(invoke, /Org stop should inspect history/)
    const targets = { AGENT: ['TerminateAgentRun', 'agentRunId', 'terminateAgentRun'],
      AGENT_TEAM: ['TerminateAgentTeamRun', 'teamRunId', 'terminateAgentTeamRun'],
      AGENT_ORG: ['TerminateAgentOrgRun', 'agentOrgRunId', 'terminateAgentOrgRun'] }
    const [operation, variable, field] = targets[scenario.kind]
    assert.deepEqual(observed, { operation, variables: { [variable]: 'owned-id' }, field, key: 'Enter' })
    assert.equal(reads, 2); assert.equal(archive, scenario.kind === 'AGENT_ORG' ? 1 : 0)
    results.push({ scenario: scenario.name, result: 'Pass' })
  } catch (error) { results.push({ scenario: scenario.name, result: 'Fail', error: error.message }); process.exitCode = 1 }
}
console.log(JSON.stringify({ source: sourceRef ?? 'working-tree', scope: 'Actual helper, synthetic dependencies only', results }, null, 2))
