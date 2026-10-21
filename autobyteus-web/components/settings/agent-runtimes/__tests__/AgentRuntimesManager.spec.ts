import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'

const io = vi.hoisted(() => ({ query: vi.fn(), mutate: vi.fn() }))
const node = vi.hoisted(() => ({ isEmbeddedWindow: true, nodeId: 'embedded-local', bindingRevision: 0 }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io }))
vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => ({ ...node, lastReadyError: null, waitForBoundBackendReady: async () => true }),
}))
vi.mock('~/stores/nodeStore', () => ({
  useNodeStore: () => ({ getNodeById: (id: string) => ({ name: id === 'embedded-local' ? 'Embedded Node' : 'Docker Node' }) }),
}))

import AgentRuntimesManager from '../AgentRuntimesManager.vue'
import { BUSY_POLL_MS, IDLE_POLL_MS } from '~/composables/settings/useAgentRuntimes'
import type { AgentRuntime } from '~/types/agentRuntimes'

const runtime = (runtimeKind: string, overrides: Partial<AgentRuntime> = {}): AgentRuntime => ({
  runtimeKind,
  installed: true,
  installedVersion: '1.0.0',
  updates: { state: 'UP_TO_DATE', latestVersion: '1.0.0' },
  account: { state: 'SIGNED_IN' },
  signInRoute: runtimeKind === 'codex_app_server' || runtimeKind === 'grok_build' ? 'BROWSER' : 'COMMAND_LINE',
  installInstructionsUrl: `https://install.example/${runtimeKind}`,
  runningAgentCount: 0,
  operation: null,
  checkedAt: new Date().toISOString(),
  ...overrides,
})

/** One of each state: Codex signed out, Claude behind, Antigravity check failed, Grok not installed. */
const baseline = (): AgentRuntime[] => [
  runtime('codex_app_server', { installedVersion: '0.163.0', updates: { state: 'UP_TO_DATE', latestVersion: '0.163.0' }, account: { state: 'SIGNED_OUT' } }),
  runtime('claude_agent_sdk', { installedVersion: '2.1.302', updates: { state: 'UPDATE_AVAILABLE', latestVersion: '2.1.304' } }),
  runtime('antigravity_cli', { installedVersion: '1.4.3', updates: { state: 'CHECK_FAILED', latestVersion: null }, account: { state: 'UNKNOWN' } }),
  runtime('grok_build', { installed: false, installedVersion: null, updates: { state: 'NOT_CHECKED', latestVersion: null }, account: { state: 'NOT_APPLICABLE' }, checkedAt: null }),
]

let current: AgentRuntime[]
/** The node's answer to "can its runtimes' logins open a browser on its own desktop". */
let browserAvailable: boolean
const respond = () => structuredClone({ data: { agentRuntimes: current, agentRuntimeSignInBrowserAvailable: browserAvailable } })
const set = (runtimeKind: string, change: Partial<AgentRuntime>) => {
  current = current.map((entry) => (entry.runtimeKind === runtimeKind ? { ...entry, ...change } : entry))
}
const mutations = () => io.mutate.mock.calls.map(([options]) => ({ name: options.mutation.definitions[0].name.value, variables: options.variables }))
/** Visible text with the separator dot spaced as rendered (the dot is its own element). */
const textOf = (element: { text: () => string }) => element.text().replace(/\s*·\s*/g, ' · ').replace(/\s+/g, ' ').trim()

let wrapper: VueWrapper | null = null
const mountPage = async () => {
  wrapper = mount(AgentRuntimesManager, { attachTo: document.body })
  await flushPromises()
  return wrapper
}
const get = (testId: string) => wrapper!.get(`[data-testid="${testId}"]`)
const has = (testId: string) => wrapper!.find(`[data-testid="${testId}"]`).exists()
const poll = async (ms = IDLE_POLL_MS) => { await vi.advanceTimersByTimeAsync(ms); await flushPromises() }

describe('AgentRuntimesManager', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    Object.assign(node, { isEmbeddedWindow: true, nodeId: 'embedded-local', bindingRevision: 0 })
    current = baseline()
    browserAvailable = true
    io.query.mockImplementation(async () => respond())
    io.mutate.mockResolvedValue({ data: {} })
  })
  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  it('checks the node on open behind a skeleton, then shows one row per runtime', async () => {
    let finishCheck!: () => void
    io.mutate.mockImplementationOnce(() => new Promise((done) => { finishCheck = () => done({ data: {} }) }))
    wrapper = mount(AgentRuntimesManager, { attachTo: document.body })
    await flushPromises()
    expect(get('agent-runtimes-loading').attributes('aria-busy')).toBe('true')
    expect(io.query).not.toHaveBeenCalled()
    finishCheck()
    await flushPromises()

    expect(mutations()).toEqual([{ name: 'CheckAgentRuntimes', variables: undefined }])
    expect(textOf(get('agent-runtimes-node'))).toBe('Embedded Node · This computer')
    expect(has('agent-runtimes-remote-note')).toBe(false)
    expect(wrapper!.findAll('li').map((item) => item.get('h4').text())).toEqual(['Codex', 'Claude', 'Antigravity', 'Grok'])
    expect(textOf(get('runtime-claude_agent_sdk-status'))).toBe('Update available (version 2.1.304)')
    expect(textOf(get('runtime-codex_app_server-status'))).toBe('Up to date')
    expect(textOf(get('runtime-antigravity_cli-check-failed-note'))).toBe("Couldn't reach the update source. Antigravity still works.")
    expect(get('runtime-antigravity_cli-installed').find('.sr-only').text()).toBe('Version')
    expect(textOf(get('runtime-antigravity_cli-installed'))).toContain('Version 1.4.3')
    expect(textOf(get('runtime-antigravity_cli-signin'))).toBe('Sign-in unknown')
    expect(textOf(get('agent-runtimes-checked'))).toBe('Checked just now')
  })

  it('points a missing runtime to its install page and says to restart AutoByteus, with no action', async () => {
    await mountPage()
    const link = get('runtime-grok_build-install-link')
    expect(link.attributes()).toMatchObject({ href: 'https://install.example/grok_build', target: '_blank', rel: 'noopener noreferrer' })
    expect(textOf(link)).toBe('Install instructions (opens in your browser)')
    expect(textOf(get('runtime-grok_build-restart-hint'))).toBe('After installing, restart AutoByteus.')
    expect(textOf(get('runtime-grok_build-not-installed'))).toBe('Not installed')
    expect(get('runtime-grok_build-signin').get('[aria-hidden="true"]').text()).toBe('–')
    expect(get('runtime-grok_build-signin').get('.sr-only').text()).toBe('Not applicable')
    expect(get('runtime-grok_build-actions').findAll('button')).toHaveLength(0)
  })

  it('offers Sign in for browser-route runtimes and the command-line hint for the others', async () => {
    set('claude_agent_sdk', { account: { state: 'SIGNED_OUT' } })
    await mountPage()
    expect(textOf(get('runtime-codex_app_server-signin'))).toBe('Not signed in')
    expect(get('runtime-codex_app_server-signin-button').attributes('aria-label')).toBe('Sign in Codex')
    expect(has('runtime-codex_app_server-signin-hint')).toBe(false)
    expect(textOf(get('runtime-claude_agent_sdk-signin-hint'))).toBe('Sign in from its command line.')
    expect(has('runtime-claude_agent_sdk-signin-button')).toBe(false)
  })

  it('signs in through the runtime, offers Cancel while waiting, and says when it did not finish', async () => {
    await mountPage()
    io.mutate.mockClear()
    await get('runtime-codex_app_server-signin-button').trigger('click')
    await flushPromises()
    expect(mutations()).toEqual([{ name: 'StartAgentRuntimeSignIn', variables: { runtimeKind: 'codex_app_server' } }])

    set('codex_app_server', { operation: { kind: 'SIGN_IN', state: 'RUNNING', command: null, step: null, fromVersion: null, toVersion: null, error: null } })
    await poll()
    const button = get('runtime-codex_app_server-signin-button')
    expect(button.text()).toBe('Signing in…')
    expect(button.attributes('disabled')).toBeDefined()
    expect(textOf(get('runtime-codex_app_server-signin-waiting'))).toBe('Finish signing in to Codex in your browser.')
    io.mutate.mockClear()
    await get('runtime-codex_app_server-signin-cancel').trigger('click')
    await flushPromises()
    expect(mutations()).toEqual([{ name: 'CancelAgentRuntimeSignIn', variables: { runtimeKind: 'codex_app_server' } }])

    set('codex_app_server', { operation: { kind: 'SIGN_IN', state: 'DID_NOT_FINISH', command: null, step: null, fromVersion: null, toVersion: null, error: null } })
    await poll(BUSY_POLL_MS)
    expect(textOf(get('runtime-codex_app_server-signin-failed'))).toBe("Sign-in didn't finish. Try again.")
    expect(get('runtime-codex_app_server-signin-button').text()).toBe('Try again')
  })

  it('announces a finished sign-in', async () => {
    set('codex_app_server', { operation: { kind: 'SIGN_IN', state: 'RUNNING', command: null, step: null, fromVersion: null, toVersion: null, error: null } })
    await mountPage()
    set('codex_app_server', { operation: null, account: { state: 'SIGNED_IN' } })
    await poll(BUSY_POLL_MS)
    expect(textOf(get('runtime-codex_app_server-signin'))).toBe('Signed in')
    expect(has('runtime-codex_app_server-signin-button')).toBe(false)
    expect(get('agent-runtimes-announce').text()).toBe('Codex is signed in.')
  })

  it('updates with progress from the vendor, then shows the result and announces it', async () => {
    await mountPage()
    io.mutate.mockClear()
    const update = get('runtime-claude_agent_sdk-update')
    expect(update.attributes('aria-label')).toBe('Update Claude')
    await update.trigger('click')
    await flushPromises()
    expect(mutations()).toEqual([{ name: 'UpdateAgentRuntime', variables: { runtimeKind: 'claude_agent_sdk' } }])

    set('claude_agent_sdk', { operation: { kind: 'UPDATE', state: 'RUNNING', command: 'claude update', step: 'Downloading 2.1.304…', fromVersion: '2.1.302', toVersion: null, error: null } })
    await poll()
    expect(get('runtime-claude_agent_sdk-updating').attributes('disabled')).toBeDefined()
    // One operation per runtime: Sign in waits while that runtime updates.
    set('codex_app_server', { operation: { kind: 'UPDATE', state: 'RUNNING', command: 'codex update', step: null, fromVersion: '0.163.0', toVersion: null, error: null } })
    await poll(BUSY_POLL_MS)
    expect(get('runtime-codex_app_server-signin-button').attributes('disabled')).toBeDefined()
    set('codex_app_server', { operation: null })
    expect(textOf(get('runtime-claude_agent_sdk-progress'))).toBe('claude update · Downloading 2.1.304…')
    expect(get('runtime-claude_agent_sdk-outcome').find('[role="progressbar"]').attributes('aria-label')).toBe('Claude: Updating…')

    set('claude_agent_sdk', {
      installedVersion: '2.1.304',
      updates: { state: 'UP_TO_DATE', latestVersion: '2.1.304' },
      operation: { kind: 'UPDATE', state: 'SUCCEEDED', command: 'claude update', step: null, fromVersion: '2.1.302', toVersion: '2.1.304', error: null },
    })
    await poll(BUSY_POLL_MS)
    expect(textOf(get('runtime-claude_agent_sdk-updated'))).toBe('Updated from 2.1.302 to 2.1.304.')
    expect(textOf(get('runtime-claude_agent_sdk-status'))).toBe('Up to date')
    expect(has('runtime-claude_agent_sdk-update')).toBe(false)
    expect(get('agent-runtimes-announce').text()).toBe('Claude updated to 2.1.304.')
  })

  it("shows a failed update with the vendor's own message and offers Try again", async () => {
    set('claude_agent_sdk', { operation: { kind: 'UPDATE', state: 'RUNNING', command: 'claude update', step: null, fromVersion: '2.1.302', toVersion: null, error: null } })
    await mountPage()
    expect(textOf(get('runtime-claude_agent_sdk-progress'))).toBe('claude update')
    set('claude_agent_sdk', { operation: { kind: 'UPDATE', state: 'FAILED', command: 'claude update', step: null, fromVersion: '2.1.302', toVersion: null, error: 'Error: EACCES: permission denied' } })
    await poll(BUSY_POLL_MS)
    expect(get('runtime-claude_agent_sdk-update-failed').findAll('p').map(textOf)).toEqual([
      'Update failed. Version 2.1.302 is unchanged.', 'Error: EACCES: permission denied',
    ])
    expect(get('runtime-claude_agent_sdk-update-failed').attributes('role')).toBe('alert')
    expect(get('runtime-claude_agent_sdk-update').text()).toBe('Try again')
    expect(textOf(get('runtime-claude_agent_sdk-status'))).toBe('Update available (version 2.1.304)')
    expect(get('agent-runtimes-announce').text()).toBe('Claude update failed.')
  })

  it('keeps Update visible but inert while that runtime has running agents, and enables it when they finish', async () => {
    set('claude_agent_sdk', { runningAgentCount: 2 })
    await mountPage()
    io.mutate.mockClear()
    const update = get('runtime-claude_agent_sdk-update')
    expect(update.attributes('aria-disabled')).toBe('true')
    expect(update.attributes('aria-describedby')).toBe('runtime-claude_agent_sdk-blocked')
    expect(textOf(get('runtime-claude_agent_sdk-blocked'))).toBe('Update unavailable while 2 agents are running.')
    await update.trigger('click')
    expect(io.mutate).not.toHaveBeenCalled()

    set('claude_agent_sdk', { runningAgentCount: 1 })
    await poll()
    expect(textOf(get('runtime-claude_agent_sdk-blocked'))).toBe('Update unavailable while 1 agent is running.')
    set('claude_agent_sdk', { runningAgentCount: 0 })
    await poll()
    expect(has('runtime-claude_agent_sdk-blocked')).toBe(false)
    expect(get('runtime-claude_agent_sdk-update').attributes('aria-disabled')).toBeUndefined()
  })

  it("offers Sign in on a remote node that can open a browser on its own desktop, finished in that node's browser", async () => {
    Object.assign(node, { isEmbeddedWindow: false, nodeId: 'docker-1' })
    set('claude_agent_sdk', { account: { state: 'SIGNED_OUT' }, runningAgentCount: 1 })
    await mountPage()
    expect(textOf(get('agent-runtimes-node'))).toBe('Docker Node · Remote node')
    expect(textOf(get('agent-runtimes-remote-note'))).toBe(
      "Sign-in opens the browser on that node; finish it in the VNC Viewer. Update these runtimes on that node's computer.",
    )
    expect(get('runtime-codex_app_server-signin-button').attributes('aria-label')).toBe('Sign in Codex')
    expect(textOf(get('runtime-claude_agent_sdk-signin-hint'))).toBe('Sign in from its command line on that node.')
    expect(has('runtime-claude_agent_sdk-signin-button')).toBe(false)
    // No Update and no blocked-update line on a remote node (REQ-005).
    expect(has('runtime-claude_agent_sdk-update')).toBe(false)
    expect(has('runtime-claude_agent_sdk-blocked')).toBe(false)
    expect(textOf(get('runtime-claude_agent_sdk-status'))).toBe('Update available (version 2.1.304)')
    expect(wrapper!.findAll('[data-testid$="-actions"] button').map((button) => button.attributes('data-testid')))
      .toEqual(['runtime-codex_app_server-signin-button'])

    io.mutate.mockClear()
    await get('runtime-codex_app_server-signin-button').trigger('click')
    await flushPromises()
    expect(mutations()).toEqual([{ name: 'StartAgentRuntimeSignIn', variables: { runtimeKind: 'codex_app_server' } }])
    set('codex_app_server', { operation: { kind: 'SIGN_IN', state: 'RUNNING', command: null, step: null, fromVersion: null, toVersion: null, error: null } })
    await poll()
    expect(get('runtime-codex_app_server-signin-button').text()).toBe('Signing in…')
    expect(textOf(get('runtime-codex_app_server-signin-waiting'))).toBe('Finish signing in to Codex in the browser on that node (VNC Viewer).')
    io.mutate.mockClear()
    await get('runtime-codex_app_server-signin-cancel').trigger('click')
    await flushPromises()
    expect(mutations()).toEqual([{ name: 'CancelAgentRuntimeSignIn', variables: { runtimeKind: 'codex_app_server' } }])

    set('codex_app_server', { operation: { kind: 'SIGN_IN', state: 'DID_NOT_FINISH', command: null, step: null, fromVersion: null, toVersion: null, error: null } })
    await poll(BUSY_POLL_MS)
    expect(textOf(get('runtime-codex_app_server-signin-failed'))).toBe("Sign-in didn't finish. Try again.")
    set('codex_app_server', { operation: { kind: 'SIGN_IN', state: 'RUNNING', command: null, step: null, fromVersion: null, toVersion: null, error: null } })
    await poll()
    set('codex_app_server', { operation: null, account: { state: 'SIGNED_IN' } })
    await poll(BUSY_POLL_MS)
    expect(textOf(get('runtime-codex_app_server-signin'))).toBe('Signed in')
    expect(get('agent-runtimes-announce').text()).toBe('Codex is signed in.')
  })

  it('keeps a remote node that cannot open a browser status only: no Update, no Sign in, no sign-in hint', async () => {
    Object.assign(node, { isEmbeddedWindow: false, nodeId: 'docker-1' })
    browserAvailable = false
    set('claude_agent_sdk', { account: { state: 'SIGNED_OUT' }, runningAgentCount: 1 })
    await mountPage()
    expect(textOf(get('agent-runtimes-node'))).toBe('Docker Node · Remote node')
    expect(textOf(get('agent-runtimes-remote-note'))).toBe("Status only. Update these runtimes on that node's computer.")
    expect(wrapper!.findAll('[data-testid$="-actions"] button')).toHaveLength(0)
    expect(has('runtime-claude_agent_sdk-signin-hint')).toBe(false)
    expect(has('runtime-claude_agent_sdk-blocked')).toBe(false)
    expect(textOf(get('runtime-claude_agent_sdk-status'))).toBe('Update available (version 2.1.304)')
    expect(has('runtime-grok_build-install-link')).toBe(true)
  })

  it("offers Sign in and Update on the desktop's own node whatever its server reports about a browser", async () => {
    browserAvailable = false
    set('claude_agent_sdk', { account: { state: 'SIGNED_OUT' } })
    await mountPage()
    expect(has('agent-runtimes-remote-note')).toBe(false)
    expect(get('runtime-codex_app_server-signin-button').attributes('aria-label')).toBe('Sign in Codex')
    expect(textOf(get('runtime-claude_agent_sdk-signin-hint'))).toBe('Sign in from its command line.')
    expect(get('runtime-claude_agent_sdk-update').attributes('aria-label')).toBe('Update Claude')
  })

  it('checks again on request, polls fast while rows check, and announces when all are done', async () => {
    await mountPage()
    io.mutate.mockClear()
    set('claude_agent_sdk', { updates: { state: 'CHECKING', latestVersion: null } })
    await get('agent-runtimes-check-again').trigger('click')
    await flushPromises()
    expect(mutations()).toEqual([{ name: 'CheckAgentRuntimes', variables: undefined }])
    const button = get('agent-runtimes-check-again')
    expect(button.text()).toBe('Checking…')
    expect(button.attributes('disabled')).toBeDefined()
    expect(textOf(get('runtime-claude_agent_sdk-status'))).toBe('Checking for updates…')
    expect(has('agent-runtimes-checked')).toBe(false)

    const queries = io.query.mock.calls.length
    set('claude_agent_sdk', { updates: { state: 'UPDATE_AVAILABLE', latestVersion: '2.1.304' } })
    await poll(BUSY_POLL_MS)
    expect(io.query.mock.calls.length).toBe(queries + 1)
    expect(get('agent-runtimes-check-again').text()).toBe('Check again')
    expect(get('agent-runtimes-announce').text()).toBe('Checked for updates.')
  })

  it("says when the node can't be read, and Retry checks again", async () => {
    io.query.mockRejectedValueOnce(new Error('offline'))
    await mountPage()
    expect(textOf(get('agent-runtimes-load-error').get('span'))).toBe("Couldn't read the agent runtimes on this node.")
    expect(get('agent-runtimes-load-retry').text()).toBe('Retry')
    io.mutate.mockClear()
    await get('agent-runtimes-load-retry').trigger('click')
    await flushPromises()
    expect(mutations()).toEqual([{ name: 'CheckAgentRuntimes', variables: undefined }])
    expect(wrapper!.findAll('li')).toHaveLength(4)
  })
})
