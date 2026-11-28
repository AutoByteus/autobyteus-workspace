import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DocumentNode } from 'graphql'
import { getApolloClient } from '~/utils/apolloClient'
import {
  GetAgentDefinitionAvatars,
  GetAgentOrgDefinitionAvatars,
  GetAgentTeamDefinitionAvatars,
} from '~/graphql/queries/definitionAvatarQueries'

export type DefinitionAvatarKind = 'agent' | 'team' | 'org'

const QUERIES: Readonly<Record<DefinitionAvatarKind, Readonly<{ query: DocumentNode; field: string }>>> = {
  agent: { query: GetAgentDefinitionAvatars, field: 'agentDefinitions' },
  team: { query: GetAgentTeamDefinitionAvatars, field: 'agentTeamDefinitions' },
  org: { query: GetAgentOrgDefinitionAvatars, field: 'agentOrgDefinitions' },
}

/**
 * Each definition's picture address, for the rows that show a run's agent, team or org by its definition ID
 * (autobyteus-669 W-3): the Runs view, the Workspaces tree and the phone's run list. One light read per kind on first
 * use, desktop and phone alike, read again when the node says that kind's definitions changed (package files, another
 * window's upload or reset) and after this window's own save. A failed read leaves the last addresses (or none: the
 * fallback shows).
 */
export const useDefinitionAvatarStore = defineStore('definitionAvatars', () => {
  const addresses = ref<Record<DefinitionAvatarKind, Readonly<Record<string, string>>>>({ agent: {}, team: {}, org: {} })
  const reads = new Map<DefinitionAvatarKind, Promise<void>>()
  const requested = new Set<DefinitionAvatarKind>()

  /** One read of a kind; a read asked while one runs follows it (a change during a read is not lost). */
  const read = (kind: DefinitionAvatarKind): Promise<void> => {
    const { query, field } = QUERIES[kind]
    const next = (reads.get(kind) ?? Promise.resolve())
      .then(() => getApolloClient().query<Record<string, { id: string; avatarUrl?: string | null }[]>>({ query, fetchPolicy: 'network-only' }))
      .then(({ data }) => {
        const byId: Record<string, string> = {}
        for (const definition of data?.[field] ?? []) {
          const url = definition.avatarUrl?.trim()
          if (definition.id && url) byId[definition.id] = url
        }
        addresses.value = { ...addresses.value, [kind]: Object.freeze(byId) }
      })
      .catch((error: unknown) => console.warn(`Definition pictures (${kind}) could not be read.`, error))
      .finally(() => { if (reads.get(kind) === next) reads.delete(kind) })
    reads.set(kind, next)
    return next
  }

  /** The picture address of a definition, or null (its fallback); the first ask of a kind reads that kind. */
  const avatarOf = (kind: DefinitionAvatarKind, definitionId: string | null | undefined): string | null => {
    if (!requested.has(kind)) { requested.add(kind); void read(kind) }
    return definitionId ? addresses.value[kind][definitionId] ?? null : null
  }

  /** Reads the given kinds again, those this page has shown. */
  const reloadIfLoaded = async (kinds: readonly DefinitionAvatarKind[]): Promise<void> => {
    await Promise.all(kinds.filter((kind) => requested.has(kind)).map(read))
  }

  return { avatarOf, reloadIfLoaded }
})
