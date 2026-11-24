/**
 * The GitHub connection line (autobyteus-627, DS-003) through the real store over a mocked GraphQL server: not
 * connected, the token form with its guidance, connect (success, every coded refusal), connected with Replace token
 * and Disconnect. The token is sent once and never shown.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import type { DocumentNode } from 'graphql'

const { apollo, server, external } = vi.hoisted(() => {
  const server = {
    connection: { connected: false, login: null as string | null },
    calls: [] as Array<{ operation: string; variables: Record<string, unknown> }>,
    failNext: null as null | { code: string },
  }
  const operationOf = (document: DocumentNode): string =>
    (document.definitions.find((definition) => definition.kind === 'OperationDefinition') as { name?: { value: string } }).name?.value ?? ''
  const refuse = () => {
    const { code } = server.failNext!
    server.failNext = null
    return Object.assign(new Error(code), { graphQLErrors: [{ message: code, extensions: { code } }] })
  }
  const apollo = {
    query: vi.fn(async ({ query }: { query: DocumentNode }) => {
      server.calls.push({ operation: operationOf(query), variables: {} })
      return { data: { githubConnection: { ...server.connection } } }
    }),
    mutate: vi.fn(async ({ mutation, variables = {} }: { mutation: DocumentNode; variables?: Record<string, unknown> }) => {
      const operation = operationOf(mutation)
      server.calls.push({ operation, variables })
      if (server.failNext) throw refuse()
      if (operation === 'ConnectGitHub') {
        server.connection = { connected: true, login: 'octo-dev' }
        return { data: { connectGitHub: { ...server.connection } } }
      }
      server.connection = { connected: false, login: null }
      return { data: { disconnectGitHub: { ...server.connection } } }
    }),
  }
  return { apollo, server, external: { openExternalLink: vi.fn() } }
})

vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => apollo }))
vi.mock('~/utils/externalLink', () => external)

import GitHubConnectionLine from '../GitHubConnectionLine.vue'

const TOKEN = 'github_pat_SPEC_TOKEN_627'
let wrapper: VueWrapper | null = null

const mountLine = async () => {
  wrapper = mount(GitHubConnectionLine, { global: { stubs: { Icon: true } } })
  await flushPromises()
  return wrapper
}
const byTestId = (id: string) => wrapper!.find(`[data-testid="${id}"]`)

describe('GitHubConnectionLine', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    server.connection = { connected: false, login: null }
    server.calls = []
    server.failNext = null
    apollo.query.mockClear()
    apollo.mutate.mockClear()
    external.openExternalLink.mockClear()
  })
  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
  })

  it('reads the connection on mount and says GitHub is not connected and needed only for private repositories', async () => {
    await mountLine()
    expect(server.calls.map((call) => call.operation)).toEqual(['GetGitHubConnection'])
    expect(byTestId('github-connection-status').text()).toBe('GitHub · not connected — needed only for private repositories.')
    expect(byTestId('github-connection-connect').text()).toBe('Connect GitHub')
    expect(byTestId('github-connection-token-input').exists()).toBe(false)
  })

  it('opens a password field with the fine-grained token guidance and GitHub link', async () => {
    await mountLine()
    await byTestId('github-connection-connect').trigger('click')
    const input = byTestId('github-connection-token-input')
    expect(input.attributes('type')).toBe('password')
    expect(byTestId('github-connection-save').attributes('disabled')).toBeDefined()
    const help = byTestId('github-connection-help')
    expect(help.text()).toContain('Create a fine-grained token on GitHub')
    expect(help.text()).toContain('Repository permissions → Contents: Read-only')
    expect(help.text()).toContain("Saved in this node's vault, never shown again.")
    await help.find('a').trigger('click')
    expect(external.openExternalLink).toHaveBeenCalledWith('https://github.com/settings/personal-access-tokens/new')
  })

  it('connects with the trimmed token once, then shows the login, what the token is used for, and clears the field', async () => {
    await mountLine()
    await byTestId('github-connection-connect').trigger('click')
    await byTestId('github-connection-token-input').setValue(`  ${TOKEN}  `)
    await wrapper!.find('form').trigger('submit')
    await flushPromises()
    expect(server.calls.filter((call) => call.operation === 'ConnectGitHub')).toEqual([{ operation: 'ConnectGitHub', variables: { token: TOKEN } }])
    expect(byTestId('github-connection-status').text()).toBe('GitHub · connected as @octo-dev')
    expect(byTestId('github-connection-usage').text()).toBe('Used for private repositories here and by agents that have the GitHub integration.')
    expect(byTestId('github-connection-token-input').exists()).toBe(false)
    expect(wrapper!.html()).not.toContain(TOKEN)
  })

  it.each([
    ['TOKEN_REJECTED', 'GitHub rejected this token. Check that you copied all of it, and that it has not expired.'],
    ['TOKEN_CHECK_FAILED', 'The token could not be checked with GitHub. Try again.'],
    ['VAULT_UNAVAILABLE', "This node's secret vault is unavailable, so the token can't be saved."],
    ['TOKEN_REQUIRED', 'Enter a token.'],
    ['SOMETHING_ELSE', 'Could not connect GitHub.'],
  ])('a refused connect (%s) keeps the form open, shows its text and never the token', async (code, text) => {
    await mountLine()
    await byTestId('github-connection-connect').trigger('click')
    server.failNext = { code }
    await byTestId('github-connection-token-input').setValue(TOKEN)
    await wrapper!.find('form').trigger('submit')
    await flushPromises()
    expect(byTestId('github-connection-error').text()).toBe(text)
    expect(byTestId('github-connection-status').text()).toContain('not connected')
    expect(byTestId('github-connection-token-input').exists()).toBe(true)
    expect(byTestId('github-connection-error').text()).not.toContain(TOKEN)
  })

  it('when connected: Replace token opens the form with Cancel; Disconnect removes the connection', async () => {
    server.connection = { connected: true, login: 'octo-dev' }
    await mountLine()
    expect(byTestId('github-connection-status').text()).toBe('GitHub · connected as @octo-dev')
    await byTestId('github-connection-replace').trigger('click')
    expect(byTestId('github-connection-token-input').exists()).toBe(true)
    await byTestId('github-connection-cancel').trigger('click')
    expect(byTestId('github-connection-token-input').exists()).toBe(false)
    await byTestId('github-connection-disconnect').trigger('click')
    await flushPromises()
    expect(server.calls.at(-1)?.operation).toBe('DisconnectGitHub')
    expect(byTestId('github-connection-status').text()).toBe('GitHub · not connected — needed only for private repositories.')
  })
})
