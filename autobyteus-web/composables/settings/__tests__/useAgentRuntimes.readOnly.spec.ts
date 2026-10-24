import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { effectScope, reactive } from 'vue'

/** `useAgentRuntimes({ checkOnRebind: false })`: the Notification Center reads runtimes and never starts a check. */
const io = vi.hoisted(() => ({ query: vi.fn(), mutate: vi.fn() }))
const node = vi.hoisted(() => ({ value: null as any }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io }))
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => node.value }))

import { useAgentRuntimes } from '../useAgentRuntimes'

const operationName = (document: { definitions: Array<{ name?: { value: string } }> }) => document.definitions[0]?.name?.value

beforeEach(() => {
  node.value = reactive({ bindingRevision: 0, lastReadyError: null, waitForBoundBackendReady: async () => true })
  io.query.mockResolvedValue({ data: { agentRuntimes: [], agentRuntimeSignInBrowserAvailable: false } })
  io.mutate.mockResolvedValue({ data: { checkAgentRuntimes: true } })
})
afterEach(() => { vi.clearAllMocks() })

describe('useAgentRuntimes read-only option', () => {
  it('refresh() reads without a check, and binding another node reads again without a check', async () => {
    const scope = effectScope()
    const state = scope.run(() => useAgentRuntimes({ checkOnRebind: false }))!
    await state.refresh()
    expect(io.query).toHaveBeenCalledTimes(1)
    node.value.bindingRevision += 1
    await flushPromises()
    expect(io.query).toHaveBeenCalledTimes(2)
    expect(io.mutate.mock.calls.map(([options]) => operationName(options.mutation))).not.toContain('CheckAgentRuntimes')
    scope.stop()
  })

  it('the page (default) still checks when another node is bound', async () => {
    const scope = effectScope()
    scope.run(() => useAgentRuntimes())
    node.value.bindingRevision += 1
    await flushPromises()
    expect(io.mutate.mock.calls.map(([options]) => operationName(options.mutation))).toContain('CheckAgentRuntimes')
    scope.stop()
  })
})
