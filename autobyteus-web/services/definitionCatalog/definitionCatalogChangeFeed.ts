import { watch } from 'vue'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useAgentOrgDefinitionStore } from '~/stores/agentOrgDefinitionStore'
import { useAgentPackagesStore } from '~/stores/agentPackagesStore'
import { useDefinitionDiagnosticsStore } from '~/stores/definitionDiagnosticsStore'
import { buildAuthenticatedWebSocketUrl } from '~/utils/remoteAccess/websocketAuth'
import { getActiveRemoteAccessCredential } from '~/utils/remoteAccess/authorizedTransport'
import { NodeChangeFeed, type NodeChangeSocket } from '~/services/nodeChangeFeed/nodeChangeFeed'
import type { DefinitionCatalogChangeMessage, DefinitionCatalogChangeSubject } from '~/types/definitionCatalog'

const SUBJECTS: ReadonlySet<string> = new Set(['agent', 'agent_team', 'agent_org', 'agent_package'])
const ALL_SUBJECTS: readonly DefinitionCatalogChangeSubject[] = ['agent', 'agent_team', 'agent_org', 'agent_package']

export const parseDefinitionCatalogChangeMessage = (raw: string): DefinitionCatalogChangeMessage | null => {
  try {
    const value = JSON.parse(raw) as { type?: unknown; subjects?: unknown }
    if (!value || typeof value !== 'object') return null
    if (value.type === 'connected') return { type: 'connected' }
    if (value.type === 'definitions_changed' && Array.isArray(value.subjects)
      && value.subjects.length > 0 && value.subjects.every((subject) => typeof subject === 'string' && SUBJECTS.has(subject))) {
      return { type: 'definitions_changed', subjects: value.subjects as DefinitionCatalogChangeSubject[] }
    }
    return null
  } catch { return null }
}

/** Reloads the loaded lists of the named subjects; each store keeps its list while reloading and on error. */
export const reloadDefinitionCatalogSubjects = async (subjects: readonly DefinitionCatalogChangeSubject[]): Promise<void> => {
  const reloads: Promise<unknown>[] = []
  const diagnostics: Array<'AGENT' | 'AGENT_TEAM' | 'AGENT_ORG'> = []
  if (subjects.includes('agent')) { reloads.push(useAgentDefinitionStore().reloadIfLoaded()); diagnostics.push('AGENT') }
  if (subjects.includes('agent_team')) { reloads.push(useAgentTeamDefinitionStore().reloadIfLoaded()); diagnostics.push('AGENT_TEAM') }
  if (subjects.includes('agent_org')) { reloads.push(useAgentOrgDefinitionStore().reloadIfLoaded()); diagnostics.push('AGENT_ORG') }
  if (subjects.includes('agent_package')) reloads.push(useAgentPackagesStore().reloadIfLoaded())
  if (diagnostics.length > 0) reloads.push(useDefinitionDiagnosticsStore().reloadIfLoaded(diagnostics))
  await Promise.all(reloads)
}

/**
 * The window node's `/ws/definition-catalog` feed: catalog changes made outside this window
 * (package files, other clients, Reload, package Update) reload the affected loaded lists, and
 * every `connected` frame (first connect and each reconnect) re-reads all loaded catalogs.
 */
export class DefinitionCatalogChangeFeed extends NodeChangeFeed<DefinitionCatalogChangeMessage> {
  constructor(options: Readonly<{
    endpoint(): string | null
    deliver(message: DefinitionCatalogChangeMessage): void
    createSocket?(url: string): NodeChangeSocket
    retryDelayMs?(attempt: number): number
  }>) {
    super({ ...options, label: 'definition catalog', parse: parseDefinitionCatalogChangeMessage })
  }
}

export const deliverDefinitionCatalogChange = (message: DefinitionCatalogChangeMessage): void => {
  const subjects = message.type === 'connected' ? ALL_SUBJECTS : message.subjects
  void reloadDefinitionCatalogSubjects(subjects).catch((error) => console.error('Failed to reload definition catalogs:', error))
}

let feed: DefinitionCatalogChangeFeed | null = null
/** The process feed of the bound node, reopened when the window is bound to another node. */
export const getDefinitionCatalogChangeFeed = (): DefinitionCatalogChangeFeed => {
  if (feed) return feed
  const node = useWindowNodeContextStore()
  const created = new DefinitionCatalogChangeFeed({
    endpoint: () => {
      try { return buildAuthenticatedWebSocketUrl(node.getBoundEndpoints().definitionCatalogWs, getActiveRemoteAccessCredential() ?? '') }
      catch { return null }
    },
    deliver: deliverDefinitionCatalogChange,
  })
  watch(() => node.bindingRevision, () => created.rebind())
  feed = created
  return created
}
export const resetDefinitionCatalogChangeFeedForTests = (): void => { feed = null }
