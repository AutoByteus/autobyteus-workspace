/**
 * The Integrations page against the approved r2 design, through the real store over a mocked GraphQL server: the empty
 * state, cards with their chips and actions, the Import dialog (hints, every coded error, the success notice), Manage
 * sources (rows, Update, the Remove texts with the connection sentence, the last removal's notice), the integration
 * dialog (help text links, connect, test, remove), focus return, and the card focused from a Skills-page link.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import type { DocumentNode } from 'graphql'

type Card = Record<string, unknown> & { id: string; name: string; state: string }
type Source = Record<string, unknown> & { sourceId: string; integrationIds: string[] }

const { apollo, server, routing, external } = vi.hoisted(() => {
  const server = {
    cards: [] as Card[],
    sources: [] as Source[],
    calls: [] as Array<{ operation: string; variables: Record<string, unknown> }>,
    failNext: null as null | { code: string; message?: string; [key: string]: unknown },
    onImport: null as null | ((location: string) => Card[]),
  }
  const operationOf = (document: DocumentNode): string =>
    (document.definitions.find((definition) => definition.kind === 'OperationDefinition') as { name?: { value: string } }).name?.value ?? ''
  const refuse = () => {
    const failure = server.failNext!
    server.failNext = null
    const { message, ...extensions } = failure
    return Object.assign(new Error(message ?? failure.code), { graphQLErrors: [{ message: message ?? failure.code, extensions }] })
  }
  const card = (id: string) => server.cards.find((candidate) => candidate.id === id)!
  const apollo = {
    query: vi.fn(async ({ query }: { query: DocumentNode }) => {
      const operation = operationOf(query)
      server.calls.push({ operation, variables: {} })
      // Copies, as a real response: the page never shares objects with the server.
      if (operation === 'GetIntegrations') return { data: { integrations: structuredClone(server.cards) } }
      return { data: { integrationSources: structuredClone(server.sources) } }
    }),
    mutate: vi.fn(async ({ mutation, variables = {} }: { mutation: DocumentNode; variables?: Record<string, unknown> }) => {
      const operation = operationOf(mutation)
      server.calls.push({ operation, variables })
      if (server.failNext) throw refuse()
      switch (operation) {
        case 'ImportIntegrations': {
          const added = server.onImport!(variables.location as string)
          server.cards = [...server.cards, ...added]
          return { data: { importIntegrations: structuredClone(added) } }
        }
        case 'ConnectIntegration':
          Object.assign(card(variables.id as string), { state: 'CONNECTED', login: 'octo', connectedAt: '2026-11-01T08:00:00.000Z' })
          return { data: { connectIntegration: structuredClone(card(variables.id as string)) } }
        case 'TestIntegration':
          return { data: { testIntegration: structuredClone(card(variables.id as string)) } }
        case 'DisconnectIntegration':
          Object.assign(card(variables.id as string), { state: 'NEEDS_TOKEN', login: null, connectedAt: null })
          return { data: { disconnectIntegration: structuredClone(card(variables.id as string)) } }
        case 'UpdateIntegrationSource':
          server.sources = server.sources.map((source) => source.sourceId === variables.sourceId
            ? { ...source, github: { ...(source.github as object), status: 'UP_TO_DATE' } } : source)
          return { data: { updateIntegrationSource: structuredClone(server.sources) } }
        case 'RemoveIntegrationSource': {
          const removed = server.sources.find((source) => source.sourceId === variables.sourceId)!
          const names = server.cards.filter((c) => removed.integrationIds.includes(c.id) && c.state === 'CONNECTED').map((c) => c.name)
          server.sources = server.sources.filter((source) => source !== removed)
          server.cards = server.cards.filter((c) => !removed.integrationIds.includes(c.id))
          return { data: { removeIntegrationSource: { removedConnectionNames: names } } }
        }
        default:
          throw new Error(`unexpected ${operation}`)
      }
    }),
  }
  const routing = { route: { path: '/integrations', hash: '', query: {} } }
  const external = { open: vi.fn() }
  return { apollo, server, routing, external }
})

vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => apollo }))
vi.mock('vue-router', () => ({ useRoute: () => routing.route, useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }))
vi.mock('~/utils/externalLink', () => ({ openExternalLink: external.open }))

import IntegrationsPage from '~/pages/integrations.vue'

const SVG_URL = 'data:image/svg+xml;base64,PHN2Zy8+'
const githubCard = (overrides: Partial<Card> = {}): Card => ({
  id: 'github', name: 'GitHub', description: 'Work with GitHub issues.', iconDataUrl: SVG_URL, state: 'NEEDS_TOKEN',
  login: null, connectedAt: null, skillName: 'github-integration',
  tokenHelp: 'Create one at https://github.com/settings/tokens. Not http://insecure.example or javascript:alert(1) or data:text/html,x.',
  source: { sourceId: 'gh-1', kind: 'GITHUB_REPOSITORY', label: 'AutoByteus/autobyteus-integrations' },
  tools: [{ tool: 'curl', found: true }, { tool: 'jq', found: true }], ...overrides,
})
const jiraCard = (): Card => ({
  id: 'jira', name: 'Jira', description: 'Jira issues.', iconDataUrl: null, state: 'NEEDS_NEWER_APP', login: null, connectedAt: null,
  skillName: 'jira-integration', tokenHelp: null, source: { sourceId: 'local:/work/integrations', kind: 'LOCAL_PATH', label: '/work/integrations' },
  tools: [{ tool: 'jq', found: false }],
})
const githubSource = (status = 'UPDATE_AVAILABLE'): Source => ({
  sourceId: 'gh-1', kind: 'GITHUB_REPOSITORY', label: 'AutoByteus/autobyteus-integrations',
  location: 'https://github.com/AutoByteus/autobyteus-integrations', skillCount: 1, integrationIds: ['github'], integrationNames: ['GitHub'],
  github: { status, repositoryUrl: 'https://github.com/AutoByteus/autobyteus-integrations', defaultBranch: 'main',
    installedRevision: 'a'.repeat(40), latestRevision: 'b'.repeat(40) },
})
const folderSource = (): Source => ({
  sourceId: 'local:/work/integrations', kind: 'LOCAL_PATH', label: '/work/integrations', location: '/work/integrations',
  skillCount: 2, integrationIds: ['jira'], integrationNames: ['Jira'], github: null,
})

const mounted: VueWrapper[] = []
const mountPage = async () => {
  const wrapper = mount(IntegrationsPage, {
    attachTo: document.body,
    global: { stubs: { NuxtLink: { props: ['to'], template: '<a :data-to="JSON.stringify(to)"><slot /></a>' } } },
  })
  mounted.push(wrapper)
  await flushPromises()
  return wrapper
}
const byTestId = (testId: string) => document.querySelector<HTMLElement>(`[data-testid="${testId}"]`)

beforeEach(() => {
  setActivePinia(createPinia())
  server.cards = []
  server.sources = []
  server.calls = []
  server.failNext = null
  server.onImport = null
  routing.route.hash = ''
  external.open.mockClear()
})
afterEach(() => {
  mounted.splice(0).forEach((wrapper) => wrapper.unmount())
  document.body.innerHTML = ''
})

describe('Integrations page', () => {
  it('invites Import when nothing is imported, with no toolbar', async () => {
    const page = await mountPage()
    expect(page.find('[data-testid="integrations-empty"]').text()).toContain('No integrations yet')
    expect(page.find('[data-testid="integrations-toolbar"]').exists()).toBe(false)
    expect(page.find('[data-testid="integrations-empty-import"]').text()).toBe('Import')
  })

  it('shows one card per integration with its chip, icon as an <img> data URL or a letter, and one action', async () => {
    server.cards = [githubCard(), jiraCard(), { ...githubCard({ id: 'connected', name: 'Linear', state: 'CONNECTED', login: 'octo', iconDataUrl: null }) }]
    const page = await mountPage()
    expect(page.find('[data-testid="integrations-toolbar"]').text()).toContain('Manage sources')
    expect(page.find('[data-testid="integration-status-github"]').text()).toBe('Installed, needs a token')
    expect(page.find('[data-testid="integration-open-github"]').text()).toBe('Connect')
    const img = page.find('[data-testid="integration-icon-github"] img')
    expect(img.attributes('src')).toBe(SVG_URL)
    expect(page.find('[data-testid="integration-icon-github"] svg').exists()).toBe(false)
    expect(page.find('[data-testid="integration-icon-jira"]').text()).toBe('J')
    expect(page.find('[data-testid="integration-status-jira"]').text()).toBe('Needs a newer AutoByteus')
    expect(page.find('[data-testid="integration-newer-jira"]').text()).toBe('Check for updates')
    expect(page.find('[data-testid="integration-tools-missing-jira"]').text()).toBe('jq not found on this node.')
    expect(page.find('[data-testid="integration-status-connected"]').text()).toBe('Connected as @octo')
    expect(page.find('[data-testid="integration-access-hint-connected"]').text()).toBe('Add github-integration to an agent to give it access.')
    expect(page.find('[data-testid="integration-open-connected"]').text()).toBe('Manage')
  })

  it('imports a repository link: trust hint, busy state, then the notice and the new card', async () => {
    server.onImport = () => [githubCard()]
    const page = await mountPage()
    await page.find('[data-testid="integrations-empty-import"]').trigger('click')
    await flushPromises()
    const input = byTestId('integration-import-input') as HTMLInputElement
    expect(document.activeElement).toBe(input)
    expect(byTestId('integration-import-hint')!.textContent).toContain('A public GitHub repository, or a folder on this computer')
    input.value = '/Users/alex/my-integrations'
    input.dispatchEvent(new Event('input'))
    await flushPromises()
    expect(byTestId('integration-import-hint')!.textContent).toContain('The folder stays where it is; nothing is copied.')
    input.value = 'https://github.com/AutoByteus/autobyteus-integrations'
    input.dispatchEvent(new Event('input'))
    await flushPromises()
    expect(byTestId('integration-import-hint')!.textContent).toContain('Import only repositories you trust.')

    byTestId('integration-import-submit')!.click()
    await flushPromises()
    expect(server.calls.find((call) => call.operation === 'ImportIntegrations')?.variables).toEqual({ location: 'https://github.com/AutoByteus/autobyteus-integrations' })
    expect(byTestId('integration-import-dialog')).toBeNull()
    expect(page.find('[data-testid="integrations-notice"]').text()).toBe('Imported GitHub from AutoByteus/autobyteus-integrations.')
    expect(page.find('[data-testid="integration-card-github"]').exists()).toBe(true)
  })

  it.each([
    [{ code: 'NOT_A_LINK_OR_PATH' }, 'Enter a GitHub repository link, like https://github.com/owner/repository, or the full path of a folder.'],
    [{ code: 'DIRECTORY_NOT_FOUND', path: '/missing' }, 'Directory not found: /missing'],
    [{ code: 'NO_INTEGRATIONS_FOUND', kind: 'GITHUB_REPOSITORY' }, 'No integrations in this repository. Nothing was imported.'],
    [{ code: 'NO_INTEGRATIONS_FOUND', kind: 'LOCAL_PATH' }, 'No integrations in this folder. Nothing was imported.'],
    [{ code: 'SKILL_NAME_CONFLICT', skill: 'github-integration' }, 'Could not import. A skill named “github-integration” already exists in another skill source. Remove or rename it on the Skills page, then try again.'],
    [{ code: 'GITHUB_UNREACHABLE', reason: 'the request timed out after 30 seconds' }, 'Could not reach GitHub: the request timed out after 30 seconds. Check your internet connection, then try again.'],
    [{ code: 'ALREADY_IMPORTED', kind: 'GITHUB_REPOSITORY' }, 'This repository is already imported. Use Manage sources to update it.'],
    [{ code: 'ALREADY_IMPORTED', kind: 'LOCAL_PATH' }, 'This folder is already imported. Use Manage sources to see it.'],
    [{ code: 'INTEGRATION_ALREADY_IMPORTED', id: 'github', existingSource: 'AutoByteus/autobyteus-integrations' }, 'Could not import. The “github” integration is already imported from AutoByteus/autobyteus-integrations. Remove that source in Manage sources first, then try again.'],
    [{ code: 'IMPORT_FAILED', message: 'Removal incomplete.' }, 'Could not import: Removal incomplete.'],
  ])('shows the import refusal %j under the field, keeping the field focused', async (failure, text) => {
    const page = await mountPage()
    await page.find('[data-testid="integrations-empty-import"]').trigger('click')
    await flushPromises()
    const input = byTestId('integration-import-input') as HTMLInputElement
    input.value = 'something'
    input.dispatchEvent(new Event('input'))
    await flushPromises()
    server.failNext = failure
    byTestId('integration-import-submit')!.click()
    await flushPromises()
    expect(byTestId('integration-import-error')!.textContent!.trim()).toBe(text)
    expect(byTestId('integration-import-error')!.getAttribute('role')).toBe('alert')
    expect(input.value).toBe('something')
    expect(document.activeElement).toBe(input)
  })

  it('returns focus to the button that opened a dialog, and Esc closes it', async () => {
    server.cards = [githubCard()]
    await mountPage()
    const opener = byTestId('integrations-import')!
    opener.focus()
    opener.click()
    await flushPromises()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()
    expect(byTestId('integration-import-dialog')).toBeNull()
    expect(document.activeElement).toBe(opener)
  })

  it('keeps Tab inside an open dialog', async () => {
    server.cards = [githubCard()]
    await mountPage()
    byTestId('integrations-import')!.click()
    await flushPromises()
    const cancel = byTestId('integration-import-cancel')!
    cancel.focus()
    const tab = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true })
    document.dispatchEvent(tab)
    expect(tab.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(byTestId('integration-import-close'))
  })

  it('connects a card: help text with only https links, the token form, then connected with test and remove', async () => {
    server.cards = [githubCard()]
    const page = await mountPage()
    await page.find('[data-testid="integration-open-github"]').trigger('click')
    await flushPromises()
    expect(byTestId('integration-source-github')!.textContent).toBe('Imported from AutoByteus/autobyteus-integrations')
    const help = byTestId('integration-help-github')!
    const links = [...help.querySelectorAll('a')]
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['https://github.com/settings/tokens'])
    expect(help.textContent).toContain('http://insecure.example')
    expect(help.textContent).toContain('javascript:alert(1)')
    expect(help.innerHTML).not.toContain('href="http://')
    expect(help.innerHTML).not.toContain('href="javascript')
    links[0]!.click()
    expect(external.open).toHaveBeenCalledWith('https://github.com/settings/tokens')

    const token = byTestId('integration-token-input-github') as HTMLInputElement
    expect(token.type).toBe('password')
    token.value = 'test-dummy-ui-token'
    token.dispatchEvent(new Event('input'))
    await flushPromises()
    byTestId('integration-connect-github')!.click()
    await flushPromises()
    expect(server.calls.find((call) => call.operation === 'ConnectIntegration')?.variables).toEqual({ id: 'github', token: 'test-dummy-ui-token' })
    expect(byTestId('integration-status-github')!.textContent!.trim()).toBe('Connected as @octo')
    expect(document.body.innerHTML).not.toContain('test-dummy-ui-token')

    byTestId('integration-test-github')!.click()
    await flushPromises()
    expect(byTestId('integration-message-github')!.textContent!.trim()).toBe('The token works: @octo.')
    byTestId('integration-remove-github')!.click()
    await flushPromises()
    expect(byTestId('integration-message-github')!.textContent!.trim()).toBe('GitHub token removed.')
  })

  it('says the service rejected a token, and that the stored token was rejected on Test', async () => {
    server.cards = [githubCard({ state: 'CONNECTED', login: 'octo' })]
    const page = await mountPage()
    await page.find('[data-testid="integration-open-github"]').trigger('click')
    await flushPromises()
    server.failNext = { code: 'TOKEN_REJECTED' }
    byTestId('integration-test-github')!.click()
    await flushPromises()
    expect(byTestId('integration-message-github')!.textContent!.trim()).toBe('GitHub rejected the stored token. Replace it or remove it.')
    byTestId('integration-replace-github')!.click()
    await flushPromises()
    const token = byTestId('integration-token-input-github') as HTMLInputElement
    token.value = 'test-dummy-bad'
    token.dispatchEvent(new Event('input'))
    await flushPromises()
    server.failNext = { code: 'TOKEN_REJECTED' }
    byTestId('integration-connect-github')!.click()
    await flushPromises()
    expect(byTestId('integration-message-github')!.textContent!.trim()).toBe('GitHub rejected the token.')
  })

  it('manages sources: rows, Update through the product confirmation, and Remove with the connection sentence', async () => {
    server.cards = [githubCard({ state: 'CONNECTED', login: 'octo' }), jiraCard()]
    server.sources = [githubSource(), folderSource()]
    const page = await mountPage()
    await page.find('[data-testid="integrations-manage-sources"]').trigger('click')
    await flushPromises()
    expect(byTestId('integration-source-status-gh-1')!.textContent).toContain('Update available')
    expect(byTestId('integration-source-status-local:/work/integrations')!.textContent!.trim()).toBe('Local folder')
    expect(byTestId('integration-source-update-local:/work/integrations')).toBeNull()

    byTestId('integration-source-update-gh-1')!.click()
    await flushPromises()
    // The product's confirmation (teleported to the end of the page), not the row's Update chip.
    const updateConfirm = [...document.querySelectorAll('button')].filter((button) => button.textContent?.trim() === 'Update').pop()
    expect(updateConfirm).toBeDefined()
    updateConfirm!.click()
    await flushPromises()
    expect(byTestId('integration-sources-message')!.textContent!.trim()).toBe('AutoByteus/autobyteus-integrations is up to date.')
    expect(byTestId('integration-source-status-gh-1')!.textContent).toContain('Up to date')

    byTestId('integration-source-remove-gh-1')!.click()
    await flushPromises()
    expect(byTestId('integration-source-remove-confirm')!.textContent).toContain('Remove “AutoByteus/autobyteus-integrations”? This deletes the whole source and its 1 skill')
    expect(byTestId('integration-source-remove-connections')!.textContent!.trim()).toBe('This also removes your GitHub connection.')
  })

  it('removes a folder with its own text, and closes with a page notice when the last source goes', async () => {
    server.cards = [jiraCard()]
    server.sources = [folderSource()]
    const page = await mountPage()
    await page.find('[data-testid="integrations-manage-sources"]').trigger('click')
    await flushPromises()
    byTestId('integration-source-remove-local:/work/integrations')!.click()
    await flushPromises()
    expect(byTestId('integration-source-remove-confirm')!.textContent).toContain('Its 2 skills will no longer be available, and its integrations leave this page. The files on disk are not deleted.')
    expect(byTestId('integration-source-remove-connections')).toBeNull()
    const remove = [...document.querySelectorAll('button')].filter((button) => button.textContent?.trim() === 'Remove').pop()!
    remove.click()
    await flushPromises()
    expect(byTestId('integration-sources-dialog')).toBeNull()
    expect(page.find('[data-testid="integrations-notice"]').text()).toBe('Removed integrations.')
    expect(page.find('[data-testid="integrations-empty"]').exists()).toBe(true)
  })

  it('shows an update failure with GitHub unreachable and its reason', async () => {
    server.cards = [githubCard()]
    server.sources = [githubSource()]
    const page = await mountPage()
    await page.find('[data-testid="integrations-manage-sources"]').trigger('click')
    await flushPromises()
    byTestId('integration-source-update-gh-1')!.click()
    await flushPromises()
    server.failNext = { code: 'GITHUB_UNREACHABLE', reason: 'the request timed out' }
    ;[...document.querySelectorAll('button')].filter((button) => button.textContent?.trim() === 'Update').pop()!.click()
    await flushPromises()
    expect(byTestId('integration-sources-message')!.textContent!.trim())
      .toBe('Could not update AutoByteus/autobyteus-integrations: GitHub could not be reached (the request timed out). Nothing was changed.')
    expect(byTestId('integration-sources-message')!.getAttribute('role')).toBe('alert')
  })

  it('scrolls to and focuses the card a Skills-page label links to', async () => {
    server.cards = [githubCard(), jiraCard()]
    routing.route.hash = '#integration-github'
    const scroll = vi.fn()
    Element.prototype.scrollIntoView = scroll
    await mountPage()
    await flushPromises()
    expect(document.activeElement).toBe(byTestId('integration-card-github'))
    expect(scroll).toHaveBeenCalled()
  })
})
