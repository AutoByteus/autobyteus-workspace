import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import type { DocumentNode } from 'graphql'
import GitHubIntegrationCard from '../GitHubIntegrationCard.vue'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'

type Status = { connected: boolean; login: string | null; connectedAt: string | null; agentDefinitionIds: string[] }

const TOKEN = 'test-dummy-card-token-5521'

const { apollo, server } = vi.hoisted(() => {
  const server = {
    status: { connected: false, login: null, connectedAt: null, agentDefinitionIds: [] } as Status,
    calls: [] as Array<{ operation: string; variables: Record<string, unknown> }>,
  }
  const operationOf = (document: DocumentNode): string =>
    (document.definitions[0] as { name?: { value: string } }).name?.value ?? ''
  const rejected = (code: string, message: string) => Object.assign(new Error(message), {
    graphQLErrors: [{ message, extensions: { code } }],
  })
  const apollo = {
    query: vi.fn(async () => ({ data: { githubIntegration: server.status } })),
    mutate: vi.fn(async ({ mutation, variables = {} }: { mutation: DocumentNode; variables?: Record<string, unknown> }) => {
      const operation = operationOf(mutation)
      server.calls.push({ operation, variables })
      if (operation === 'ConnectGitHubIntegration') {
        if (variables.token !== 'test-dummy-card-token-5521') throw rejected('TOKEN_REJECTED', 'TOKEN_REJECTED: GitHub rejected the token.')
        server.status = { ...server.status, connected: true, login: 'octo', connectedAt: '2026-10-30T08:00:00.000Z' }
        return { data: { connectGitHubIntegration: server.status } }
      }
      if (operation === 'TestGitHubIntegration') return { data: { testGitHubIntegration: server.status } }
      if (operation === 'DisconnectGitHubIntegration') {
        server.status = { ...server.status, connected: false, login: null, connectedAt: null }
        return { data: { disconnectGitHubIntegration: server.status } }
      }
      server.status = { ...server.status, agentDefinitionIds: variables.agentDefinitionIds as string[] }
      return { data: { setGitHubIntegrationAgentAccess: server.status } }
    }),
  }
  return { apollo, server }
})

vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => apollo }))

const flushPromises = async () => {
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

const mountCard = async () => {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: false,
    initialState: {
      agentDefinition: { agentDefinitions: [{ id: 'agent-z', name: 'Zed reviewer' }, { id: 'agent-a', name: 'Ada coder' }] },
    },
  })
  setActivePinia(pinia)
  useAgentDefinitionStore().fetchAllAgentDefinitions = vi.fn(async () => undefined)
  const wrapper = mount(GitHubIntegrationCard, { global: { plugins: [pinia] } })
  await flushPromises()
  return wrapper
}

const status = (wrapper: Awaited<ReturnType<typeof mountCard>>) => wrapper.get('[data-testid="github-integration-status"]').text()
const message = (wrapper: Awaited<ReturnType<typeof mountCard>>) => wrapper.get('[data-testid="github-integration-message"]').text()

describe('GitHubIntegrationCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    server.status = { connected: false, login: null, connectedAt: null, agentDefinitionIds: [] }
    server.calls = []
  })

  it('shows a node that is not connected, with its agents sorted and none ticked', async () => {
    const wrapper = await mountCard()

    expect(wrapper.text()).toContain('GitHub')
    expect(status(wrapper)).toBe('Not connected')
    expect(wrapper.find('[data-testid="github-integration-test"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="github-integration-remove"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="github-integration-save"]').attributes('disabled')).toBeDefined()
    const agents = wrapper.findAll('[data-testid="github-integration-agents"] li')
    expect(agents.map((row) => row.text())).toEqual(['Ada coder', 'Zed reviewer'])
    expect(wrapper.findAll('input[type="checkbox"]').map((box) => (box.element as HTMLInputElement).checked)).toEqual([false, false])
  })

  it('saves a token once, clears the field and shows the login, never the token', async () => {
    const wrapper = await mountCard()
    await wrapper.get('[data-testid="github-integration-token-input"]').setValue(`  ${TOKEN} `)
    await wrapper.get('[data-testid="github-integration-save"]').trigger('click')
    await flushPromises()

    expect(server.calls).toEqual([{ operation: 'ConnectGitHubIntegration', variables: { token: TOKEN } }])
    expect(status(wrapper)).toBe('Connected as @octo')
    expect(message(wrapper)).toBe('GitHub connected as @octo.')
    expect((wrapper.get('[data-testid="github-integration-token-input"]').element as HTMLInputElement).value).toBe('')
    expect(wrapper.get('[data-testid="github-integration-token-input"]').attributes('type')).toBe('password')
    expect(wrapper.html()).not.toContain(TOKEN)
    expect(wrapper.text()).toContain('Replace token')
  })

  it('says GitHub rejected the token and stays not connected', async () => {
    const wrapper = await mountCard()
    await wrapper.get('[data-testid="github-integration-token-input"]').setValue('test-dummy-wrong-token')
    await wrapper.get('[data-testid="github-integration-save"]').trigger('click')
    await flushPromises()

    expect(message(wrapper)).toBe('GitHub rejected the token.')
    expect(status(wrapper)).toBe('Not connected')
  })

  it('tests and removes a connected token, keeping the agent choices', async () => {
    server.status = { connected: true, login: 'octo', connectedAt: '2026-10-30T08:00:00.000Z', agentDefinitionIds: ['agent-a'] }
    const wrapper = await mountCard()

    await wrapper.get('[data-testid="github-integration-test"]').trigger('click')
    await flushPromises()
    expect(message(wrapper)).toBe('The token works: @octo.')

    await wrapper.get('[data-testid="github-integration-remove"]').trigger('click')
    await flushPromises()
    expect(message(wrapper)).toBe('GitHub token removed. The agent choices are kept.')
    expect(status(wrapper)).toBe('Not connected')
    expect((wrapper.get('[data-testid="github-integration-agent-agent-a"]').element as HTMLInputElement).checked).toBe(true)
  })

  it('saves each agent tick and untick as the whole allowed list', async () => {
    server.status = { connected: true, login: 'octo', connectedAt: null, agentDefinitionIds: ['agent-z'] }
    const wrapper = await mountCard()

    await wrapper.get('[data-testid="github-integration-agent-agent-a"]').trigger('change')
    await flushPromises()
    await wrapper.get('[data-testid="github-integration-agent-agent-z"]').trigger('change')
    await flushPromises()

    expect(server.calls.map((call) => call.variables)).toEqual([
      { agentDefinitionIds: ['agent-z', 'agent-a'] },
      { agentDefinitionIds: ['agent-a'] },
    ])
    expect((wrapper.get('[data-testid="github-integration-agent-agent-a"]').element as HTMLInputElement).checked).toBe(true)
    expect((wrapper.get('[data-testid="github-integration-agent-agent-z"]').element as HTMLInputElement).checked).toBe(false)
  })
})
