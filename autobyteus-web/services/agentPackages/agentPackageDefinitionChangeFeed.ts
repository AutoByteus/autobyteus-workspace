import { watch } from 'vue'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useAgentOrgDefinitionStore } from '~/stores/agentOrgDefinitionStore'
import { useAgentPackagesStore } from '~/stores/agentPackagesStore'
import { useDefinitionProblemsStore } from '~/stores/definitionProblemsStore'
import { buildAuthenticatedWebSocketUrl } from '~/utils/remoteAccess/websocketAuth'
import { getActiveRemoteAccessCredential } from '~/utils/remoteAccess/authorizedTransport'
import { NodeChangeFeed, type NodeChangeSocket } from '~/services/nodeChangeFeed/nodeChangeFeed'
import type { AgentPackageDefinitionChangeMessage, AgentPackageDefinitionList, DefinitionKind } from '~/types/agentPackageDefinitions'

const ALL_LISTS: readonly AgentPackageDefinitionList[] = ['agents', 'agent_teams', 'agent_orgs', 'agent_packages']
const KNOWN_LISTS: ReadonlySet<string> = new Set(ALL_LISTS)

export const parseAgentPackageDefinitionChangeMessage = (raw: string): AgentPackageDefinitionChangeMessage | null => {
  try {
    const value = JSON.parse(raw) as { type?: unknown; changedLists?: unknown }
    if (!value || typeof value !== 'object') return null
    if (value.type === 'connected') return { type: 'connected' }
    if (value.type === 'agent_package_definitions_changed' && Array.isArray(value.changedLists)
      && value.changedLists.length > 0 && value.changedLists.every((list) => typeof list === 'string' && KNOWN_LISTS.has(list))) {
      return { type: 'agent_package_definitions_changed', changedLists: value.changedLists as AgentPackageDefinitionList[] }
    }
    return null
  } catch { return null }
}

/** Reloads the named lists this window has loaded; each store keeps its list while reloading and on error. */
export const reloadAgentPackageDefinitionLists = async (changedLists: readonly AgentPackageDefinitionList[]): Promise<void> => {
  const reloads: Promise<unknown>[] = []
  const problemKinds: DefinitionKind[] = []
  if (changedLists.includes('agents')) { reloads.push(useAgentDefinitionStore().reloadIfLoaded()); problemKinds.push('AGENT') }
  if (changedLists.includes('agent_teams')) { reloads.push(useAgentTeamDefinitionStore().reloadIfLoaded()); problemKinds.push('AGENT_TEAM') }
  if (changedLists.includes('agent_orgs')) { reloads.push(useAgentOrgDefinitionStore().reloadIfLoaded()); problemKinds.push('AGENT_ORG') }
  if (changedLists.includes('agent_packages')) reloads.push(useAgentPackagesStore().reloadIfLoaded())
  if (problemKinds.length > 0) reloads.push(useDefinitionProblemsStore().reloadIfLoaded(problemKinds))
  await Promise.all(reloads)
}

/**
 * The window node's `/ws/agent-package-definitions` feed: agent package definition changes made
 * outside this window (package files, other clients, Reload, package Update) reload the affected
 * loaded lists, and every `connected` frame (first connect and each reconnect) re-reads them all.
 */
export class AgentPackageDefinitionChangeFeed extends NodeChangeFeed<AgentPackageDefinitionChangeMessage> {
  constructor(options: Readonly<{
    endpoint(): string | null
    deliver(message: AgentPackageDefinitionChangeMessage): void
    createSocket?(url: string): NodeChangeSocket
    retryDelayMs?(attempt: number): number
  }>) {
    super({ ...options, label: 'agent package definitions', parse: parseAgentPackageDefinitionChangeMessage })
  }
}

export const deliverAgentPackageDefinitionChange = (message: AgentPackageDefinitionChangeMessage): void => {
  const changedLists = message.type === 'connected' ? ALL_LISTS : message.changedLists
  void reloadAgentPackageDefinitionLists(changedLists).catch((error) => console.error('Failed to reload agent package definition lists:', error))
}

let feed: AgentPackageDefinitionChangeFeed | null = null
/** The process feed of the bound node, reopened when the window is bound to another node. */
export const getAgentPackageDefinitionChangeFeed = (): AgentPackageDefinitionChangeFeed => {
  if (feed) return feed
  const node = useWindowNodeContextStore()
  const created = new AgentPackageDefinitionChangeFeed({
    endpoint: () => {
      try { return buildAuthenticatedWebSocketUrl(node.getBoundEndpoints().agentPackageDefinitionsWs, getActiveRemoteAccessCredential() ?? '') }
      catch { return null }
    },
    deliver: deliverAgentPackageDefinitionChange,
  })
  watch(() => node.bindingRevision, () => created.rebind())
  feed = created
  return created
}
export const resetAgentPackageDefinitionChangeFeedForTests = (): void => { feed = null }
