import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DocumentNode } from 'graphql'
import { getApolloClient } from '~/utils/apolloClient'
import { GET_INTEGRATIONS, GET_INTEGRATION_SOURCES } from '~/graphql/queries/integrationsQueries'
import {
  CONNECT_INTEGRATION,
  DISCONNECT_INTEGRATION,
  IMPORT_INTEGRATIONS,
  REMOVE_INTEGRATION_SOURCE,
  TEST_INTEGRATION,
  UPDATE_INTEGRATION_SOURCE,
} from '~/graphql/mutations/integrationsMutations'

export type IntegrationState = 'NEEDS_TOKEN' | 'CONNECTED' | 'NEEDS_NEWER_APP'
export type IntegrationSourceKind = 'LOCAL_PATH' | 'GITHUB_REPOSITORY'

/** One card, as the server reads it from the imported sources. Never carries a token. */
export interface IntegrationView {
  id: string
  name: string
  description: string
  /** `icon.svg` as a `data:image/svg+xml` URL; shown only as an `<img>`. */
  iconDataUrl: string | null
  state: IntegrationState
  login: string | null
  connectedAt: string | null
  /** The integration's own help text (repository text: shown as text, only `https:` links are links). */
  tokenHelp: string | null
  skillName: string
  source: { sourceId: string; kind: IntegrationSourceKind; label: string }
  tools: { tool: string; found: boolean }[]
}

export interface IntegrationSourceView {
  sourceId: string
  kind: IntegrationSourceKind
  /** `owner/repository`, or the folder path. */
  label: string
  /** The repository link, or the folder path. */
  location: string
  skillCount: number
  integrationIds: string[]
  integrationNames: string[]
  github: {
    status: string
    repositoryUrl: string
    defaultBranch: string
    installedRevision: string
    latestRevision: string | null
  } | null
}

export type CardBusy = 'connect' | 'test' | 'remove' | 'tools'
export type CardMessage = { kind: 'success' | 'error'; text: string }

/** A refused or failed request: the server's code (e.g. `TOKEN_REJECTED`) and its details (path, skill, reason…). */
export class IntegrationError extends Error {
  constructor(readonly code: string, readonly details: Readonly<Record<string, string>> = {}, message = code) {
    super(message)
    this.name = 'IntegrationError'
  }
}

type GraphqlErrorLike = { message?: string; extensions?: Record<string, unknown> }

const fromGraphqlError = (error: GraphqlErrorLike | undefined, fallback: unknown): IntegrationError => {
  const extensions = error?.extensions ?? {}
  const code = typeof extensions.code === 'string' ? extensions.code : 'FAILED'
  const details = Object.fromEntries(Object.entries(extensions)
    .filter(([key, value]) => key !== 'code' && typeof value === 'string')) as Record<string, string>
  const message = error?.message || (fallback instanceof Error ? fallback.message : String(fallback))
  return new IntegrationError(code, { reason: message, ...details }, message)
}

const toError = (cause: unknown): IntegrationError => {
  if (cause instanceof IntegrationError) return cause
  return fromGraphqlError((cause as { graphQLErrors?: GraphqlErrorLike[] } | null)?.graphQLErrors?.[0], cause)
}

/** The folder's name for a local source, `owner/repository` for a GitHub one: how notices and rows name a source. */
export const sourceDisplayName = (source: { kind: IntegrationSourceKind; label: string }): string =>
  source.kind === 'LOCAL_PATH' ? (source.label.split(/[\\/]/).filter(Boolean).pop() ?? source.label) : source.label

/**
 * The Integrations page's state. Cards and sources are read from this node (no network); only Import and Update
 * reach GitHub, on the server.
 */
export const useIntegrationsStore = defineStore('integrations', () => {
  const items = ref<IntegrationView[]>([])
  const sources = ref<IntegrationSourceView[]>([])
  const loaded = ref(false)
  const loadError = ref<IntegrationError | null>(null)
  const busy = ref<Record<string, CardBusy | undefined>>({})
  const messages = ref<Record<string, CardMessage | undefined>>({})
  const sourceBusy = ref<Record<string, 'update' | 'remove' | undefined>>({})
  const importing = ref(false)

  async function query<T>(document: DocumentNode): Promise<T> {
    const { data, errors } = await getApolloClient().query<T>({ query: document, fetchPolicy: 'network-only' })
    if (errors?.length) throw fromGraphqlError(errors[0], errors[0]?.message)
    return data
  }

  async function mutate<T>(document: DocumentNode, variables: Record<string, unknown>): Promise<T> {
    try {
      const { data, errors } = await getApolloClient().mutate<T>({ mutation: document, variables })
      if (errors?.length) throw fromGraphqlError(errors[0], errors[0]?.message)
      if (!data) throw new IntegrationError('FAILED')
      return data
    } catch (cause) {
      throw toError(cause)
    }
  }

  /** The cards, alphabetical (the server sorts them). */
  async function load(): Promise<void> {
    try {
      items.value = (await query<{ integrations: IntegrationView[] }>(GET_INTEGRATIONS)).integrations
      loadError.value = null
    } catch (cause) {
      loadError.value = toError(cause)
    } finally {
      loaded.value = true
    }
  }

  async function loadSources(): Promise<void> {
    sources.value = (await query<{ integrationSources: IntegrationSourceView[] }>(GET_INTEGRATION_SOURCES)).integrationSources
  }

  const replaceItem = (item: IntegrationView) => {
    items.value = items.value.map((current) => (current.id === item.id ? item : current))
  }

  /** Imports a GitHub repository link or a folder path; resolves with the new integrations and the source's name. */
  async function importLocation(location: string): Promise<{ names: string[]; source: string }> {
    if (importing.value) return { names: [], source: '' }
    importing.value = true
    try {
      const { importIntegrations } = await mutate<{ importIntegrations: IntegrationView[] }>(IMPORT_INTEGRATIONS, { location })
      await load()
      const first = importIntegrations[0]
      return { names: importIntegrations.map((item) => item.name), source: first ? sourceDisplayName(first.source) : '' }
    } finally {
      importing.value = false
    }
  }

  /** Updates a GitHub source or removes a source (Remove also removes its integrations' connections). */
  async function sourceAction(sourceId: string, kind: 'update' | 'remove'): Promise<string[]> {
    if (sourceBusy.value[sourceId]) return []
    sourceBusy.value = { ...sourceBusy.value, [sourceId]: kind }
    try {
      let removedConnections: string[] = []
      if (kind === 'update') {
        sources.value = (await mutate<{ updateIntegrationSource: IntegrationSourceView[] }>(UPDATE_INTEGRATION_SOURCE, { sourceId }))
          .updateIntegrationSource
      } else {
        removedConnections = (await mutate<{ removeIntegrationSource: { removedConnectionNames: string[] } }>(
          REMOVE_INTEGRATION_SOURCE, { sourceId })).removeIntegrationSource.removedConnectionNames
        await loadSources()
      }
      await load()
      return removedConnections
    } finally {
      sourceBusy.value = { ...sourceBusy.value, [sourceId]: undefined }
    }
  }

  async function act<T>(id: string, kind: CardBusy, action: () => Promise<T>): Promise<T | null> {
    if (busy.value[id]) return null
    busy.value = { ...busy.value, [id]: kind }
    messages.value = { ...messages.value, [id]: undefined }
    try {
      return await action()
    } finally {
      busy.value = { ...busy.value, [id]: undefined }
    }
  }

  const setMessage = (id: string, message: CardMessage | undefined) => {
    messages.value = { ...messages.value, [id]: message }
  }

  /** Sends the token once; the server checks it with the service before storing it. */
  const connect = (id: string, token: string) => act(id, 'connect', async () => {
    const item = (await mutate<{ connectIntegration: IntegrationView }>(CONNECT_INTEGRATION, { id, token })).connectIntegration
    replaceItem(item)
    return item
  })
  /** Checks the stored token again; resolves with the login. */
  const test = (id: string) => act(id, 'test', async () => {
    const item = (await mutate<{ testIntegration: IntegrationView }>(TEST_INTEGRATION, { id })).testIntegration
    replaceItem(item)
    return item.login ?? ''
  })
  const remove = (id: string) => act(id, 'remove', async () => {
    replaceItem((await mutate<{ disconnectIntegration: IntegrationView }>(DISCONNECT_INTEGRATION, { id })).disconnectIntegration)
  })
  /** Reads the cards again: the tools are looked up on this node at every read. */
  const checkTools = (id: string) => act(id, 'tools', load)

  return {
    items, sources, loaded, loadError, busy, messages, sourceBusy, importing,
    load, loadSources, importLocation, sourceAction, setMessage, connect, test, remove, checkTools,
  }
})
