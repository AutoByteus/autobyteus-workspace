import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'

const io = vi.hoisted(() => ({ query: vi.fn() }))
const node = vi.hoisted(() => ({ isEmbeddedWindow: true, entryId: 'embedded-local', bindingRevision: 0 }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io }))
vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => ({ ...node, lastReadyError: null, waitForBoundBackendReady: async () => true }),
}))
vi.mock('~/stores/nodeStore', () => ({
  useNodeStore: () => ({ getEntryById: (id: string) => ({ name: id === 'embedded-local' ? 'Embedded Node' : 'Docker Node' }) }),
}))
/** autobyteus-313: the app's model catalog, synthesized: a catalog label for the Codex model only. */
const catalog = vi.hoisted(() => ({
  ensureCatalog: vi.fn(),
  modelLabel: (_runtimeKind: string, id: string) => id,
  findModel: (runtimeKind: string, id: string) => (runtimeKind === 'codex_app_server' && id === 'gpt-5.6' ? { label: 'gpt-5.6' } : null),
}))
vi.mock('~/composables/chat/useChatModelCatalog', () => ({ useChatModelCatalog: () => catalog }))

import AgentRuntimesNowSection from '../AgentRuntimesNowSection.vue'
import { localTime } from '../availableAgentRuntimesPresentation'
import type { AvailableAgentRuntimesReport } from '~/types/availableAgentRuntimes'

/** The tool's answer (design-spec example, from the 2026-10-24/25 probes), as GraphQL returns it. */
const toolAnswer = (): AvailableAgentRuntimesReport => ({
  checkedAt: '2026-10-25T10:00:00.000Z',
  agentRuntimes: [
    { runtime: 'codex_app_server', name: 'Codex',
      limits: [{ name: 'Weekly', remainingPercent: 0, resetsAt: '2026-10-30T19:57:53.000Z' }],
      models: [{ id: 'gpt-5.6', name: 'GPT-5.6', contextTokens: 400000, blocked: { until: '2026-10-30T19:57:53.000Z', by: 'Weekly' } }] },
    { runtime: 'claude_agent_sdk', name: 'Claude', signIn: 'not checked',
      limits: [{ name: '5-hour', remainingPercent: 13, resetsAt: '2026-10-24T21:10:00.000Z' }, { name: 'Weekly', remainingPercent: 78, resetsAt: '2026-10-31T16:00:00.000Z' }],
      models: [{ id: 'opus[1m]', name: 'Opus (1M context)' }] },
    { runtime: 'antigravity_cli', name: 'Antigravity', limits: 'unknown: Antigravity usage limits timed out',
      models: 'unknown: Antigravity model list timed out' },
    { runtime: 'grok_build', name: 'Grok',
      limits: [{ name: 'Billing period', remainingPercent: null, resetsAt: '2026-10-29T00:00:00.000Z' }],
      limitsNote: 'Grok does not report how much of the period is used.',
      models: [{ id: 'grok-4.7', name: 'Grok 4.7', contextTokens: 256000 }] },
    { runtime: 'autobyteus', name: 'AutoByteus', providers: [
      { provider: 'Anthropic', blocked: 'credit balance too low',
        models: [{ id: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5', blocked: { until: null, by: 'credit balance too low' } }] },
      { provider: 'DeepSeek', balance: '0.14 USD', models: [{ id: 'deepseek-v4', name: 'DeepSeek V4' }] },
      { provider: 'Kimi', limits: 'unknown: timed out', models: [] },
      { provider: 'OpenAI', limits: 'not reported', models: [{ id: 'gpt-6', name: 'GPT-6' }] },
      { provider: 'My Endpoint', limits: 'not reported', models: 'unknown: MODEL_DISCOVERY_UNAVAILABLE' },
    ] },
  ],
})

let answer: AvailableAgentRuntimesReport
let wrapper: VueWrapper | null = null
const mountPage = async () => {
  wrapper = mount(AgentRuntimesNowSection, { attachTo: document.body })
  await flushPromises()
  return wrapper
}
const get = (selector: string) => wrapper!.get(`[data-testid="${selector}"]`)
const all = (selector: string) => wrapper!.findAll(`[data-testid="${selector}"]`)
const has = (selector: string) => wrapper!.find(`[data-testid="${selector}"]`).exists()
/** Visible text with the separator dot spaced as rendered (the dot is its own element). */
const textOf = (element: { text: () => string }) => element.text().replace(/\s*·\s*/g, ' · ').replace(/\s+/g, ' ').trim()
const rows = () => wrapper!.findAll('[data-testid="agent-runtimes-now-list"] > li')
const at = (iso: string) => localTime(iso, 'en')

describe('Model Routing → Runtimes (Agent runtimes now)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(node, { isEmbeddedWindow: true, entryId: 'embedded-local', bindingRevision: 0 })
    answer = toolAnswer()
    io.query.mockImplementation(async () => ({ data: { availableAgentRuntimes: structuredClone(answer) } }))
  })
  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    document.body.innerHTML = ''
  })

  it('reads the node on open, behind a loading state, with one GraphQL query for the tool\'s answer', async () => {
    let finish!: () => void
    io.query.mockImplementationOnce(() => new Promise((done) => { finish = () => done({ data: { availableAgentRuntimes: answer } }) }))
    wrapper = mount(AgentRuntimesNowSection, { attachTo: document.body })
    await flushPromises()
    expect(get('agent-runtimes-now-loading').attributes('aria-busy')).toBe('true')
    finish()
    await flushPromises()
    expect(io.query).toHaveBeenCalledOnce()
    expect(io.query.mock.calls[0]![0]).toMatchObject({ fetchPolicy: 'network-only' })
    expect(io.query.mock.calls[0]![0].query.definitions[0].name.value).toBe('AvailableAgentRuntimes')
    expect(textOf(get('agent-runtimes-now-node'))).toBe('Embedded Node')
    expect(textOf(get('agent-runtimes-now-checked'))).toBe(`Checked ${at(answer.checkedAt)}`)
    expect(rows()).toHaveLength(5)
  })

  it('shows the same runtimes, limits, reset times, notes and models as the tool (AC-010)', async () => {
    await mountPage()
    const runtimes = rows().map((row) => row.attributes('data-testid'))
    expect(runtimes).toEqual(['available-runtime-codex_app_server', 'available-runtime-claude_agent_sdk',
      'available-runtime-antigravity_cli', 'available-runtime-grok_build', 'available-runtime-autobyteus'])

    expect(all('available-runtime-codex_app_server-limit').map(textOf)).toEqual([`Weekly 0% left · resets ${at('2026-10-30T19:57:53.000Z')}`])
    expect(textOf(get('available-runtime-codex_app_server-models-summary'))).toBe('1 model')
    expect(textOf(get('available-runtime-codex_app_server-models-blocked-count'))).toBe(' · 1 blocked'.trim())
    expect(textOf(get('available-runtime-codex_app_server-models-model-blocked')))
      .toBe(`Blocked until ${at('2026-10-30T19:57:53.000Z')} (Weekly)`)

    expect(textOf(get('available-runtime-claude_agent_sdk-signin'))).toBe('Sign-in could not be checked')
    expect(all('available-runtime-claude_agent_sdk-limit').map(textOf)).toEqual([
      `5-hour 13% left · resets ${at('2026-10-24T21:10:00.000Z')}`,
      `Weekly 78% left · resets ${at('2026-10-31T16:00:00.000Z')}`,
    ])
    expect(has('available-runtime-codex_app_server-signin')).toBe(false)

    expect(textOf(get('available-runtime-antigravity_cli-limits-unknown'))).toBe('Limits unknown: Antigravity usage limits timed out')
    expect(textOf(get('available-runtime-antigravity_cli-models-unknown'))).toBe('Models unknown: Antigravity model list timed out')

    expect(all('available-runtime-grok_build-limit').map(textOf))
      .toEqual([`Billing period remaining not reported · resets ${at('2026-10-29T00:00:00.000Z')}`])
    expect(textOf(get('available-runtime-grok_build-limits-note'))).toBe('Grok does not report how much of the period is used.')
    expect(textOf(get('available-runtime-grok_build-models'))).toContain('Grok 4.7 grok-4.7 256K context')
    // autobyteus-313 AC-004: the app's runtime names; a model the app's catalog knows has the menu's label (the report's
    // name otherwise).
    expect(rows().map((row) => textOf(row.get('h4')))).toEqual(['Codex App Server', 'Claude Agent SDK', 'Antigravity CLI', 'Grok Build', 'AutoByteus'])
    expect(all('available-model-name').map(textOf)).toContain('gpt-5.6')
    expect(all('available-model-name').map(textOf)).not.toContain('GPT-5.6')
    expect(catalog.ensureCatalog).toHaveBeenCalledWith('codex_app_server')
  })

  it('shows AutoByteus providers with balance, block and limit texts', async () => {
    await mountPage()
    const providers = all('available-runtime-autobyteus-provider')
    expect(providers.map((row) => row.attributes('data-provider'))).toEqual(['Anthropic', 'DeepSeek', 'Kimi', 'OpenAI', 'My Endpoint'])
    expect(textOf(providers[0]!)).toContain('Cannot run: credit balance too low')
    expect(textOf(providers[0]!)).toContain('Blocked (credit balance too low)')
    expect(textOf(providers[1]!.get('[data-testid="available-provider-balance"]'))).toBe('Balance 0.14 USD')
    expect(textOf(providers[2]!)).toContain('Limits unknown: timed out')
    expect(textOf(providers[2]!)).toContain('No models offered')
    expect(textOf(providers[3]!)).toContain('Limits not reported')
    expect(textOf(providers[4]!.get('[data-testid="available-provider-models-unknown"]'))).toBe('Models unknown: MODEL_DISCOVERY_UNAVAILABLE')
  })

  it('keeps models collapsed until opened', async () => {
    await mountPage()
    const details = get('available-runtime-claude_agent_sdk-models').element as HTMLDetailsElement
    expect(details.open).toBe(false)
    details.open = true
    expect(details.open).toBe(true)
  })

  it('Check again reads the node again and shows the new answer', async () => {
    await mountPage()
    answer.agentRuntimes = answer.agentRuntimes.filter((entry) => entry.runtime !== 'codex_app_server')
    answer.checkedAt = '2026-10-25T10:05:00.000Z'
    await get('agent-runtimes-now-check-again').trigger('click')
    await flushPromises()
    expect(io.query).toHaveBeenCalledTimes(2)
    expect(has('available-runtime-codex_app_server')).toBe(false)
    expect(textOf(get('agent-runtimes-now-checked'))).toBe(`Checked ${at('2026-10-25T10:05:00.000Z')}`)
    expect(textOf(get('agent-runtimes-now-announce'))).toBe('Agent runtimes checked.')
  })

  it('a failed first read shows the error with Check again; a failed later read keeps the rows', async () => {
    io.query.mockRejectedValueOnce(new Error('network'))
    await mountPage()
    expect(has('agent-runtimes-now-error')).toBe(true)
    await get('agent-runtimes-now-check-again').trigger('click')
    await flushPromises()
    expect(has('agent-runtimes-now-error')).toBe(false)
    io.query.mockRejectedValueOnce(new Error('network'))
    await get('agent-runtimes-now-check-again').trigger('click')
    await flushPromises()
    expect(has('agent-runtimes-now-check-failed')).toBe(true)
    expect(has('available-runtime-grok_build')).toBe(true)
  })

  it('says when no runtime is available', async () => {
    answer.agentRuntimes = []
    await mountPage()
    expect(textOf(get('agent-runtimes-now-empty'))).toContain('No agent runtime is available on this node.')
  })

  it('a remote-node window names that node', async () => {
    Object.assign(node, { isEmbeddedWindow: false, entryId: 'docker-1' })
    await mountPage()
    expect(textOf(get('agent-runtimes-now-node'))).toBe('Docker Node')
  })
})
