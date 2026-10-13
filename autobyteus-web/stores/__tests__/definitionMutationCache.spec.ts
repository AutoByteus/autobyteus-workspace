// Healthy definition creation must remain readable through the current cached catalog query.
// Real stores/Apollo cache, current documents; the server double returns ONLY selected fields,
// like GraphQL does. Supplying a whole fixture to mutations would hide missing fragment fields.
// Run: pnpm -C autobyteus-web test:nuxt stores/__tests__/definitionMutationCache.spec.ts --run
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client/core'
import { createPinia, setActivePinia } from 'pinia'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentOrgDefinitionStore } from '~/stores/agentOrgDefinitionStore'
import { GetAgentDefinitions } from '~/graphql/queries/agentDefinitionQueries'
import { GetAgentOrgDefinitions } from '~/graphql/queries/agentOrgDefinitionQueries'

const io = vi.hoisted(() => ({ client: null as any }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io.client }))
vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => ({ waitForBoundBackendReady: async () => true }),
}))

// Test-boundary projection, not a production reader/schema. Unknown fields fail instead of
// silently returning an incomplete mock. Nullable fields and array/nested selections are retained.
function selected(source: any, selectionSet: any, fragments: Map<string, any>): any {
  const result: Record<string, any> = {}
  for (const node of selectionSet.selections) {
    if (node.kind === 'FragmentSpread' || node.kind === 'InlineFragment') {
      Object.assign(result, selected(source, node.selectionSet ?? fragments.get(node.name.value).selectionSet, fragments))
    } else {
      const key = node.name.value
      if (!(key in source)) throw new Error(`Unconfigured GraphQL fixture field: ${key}`)
      const value = source[key]
      result[node.alias?.value ?? key] = node.selectionSet && value != null
        ? Array.isArray(value) ? value.map(item => selected(item, node.selectionSet, fragments)) : selected(value, node.selectionSet, fragments)
        : value
    }
  }
  return result
}
const agent = {
  __typename: 'AgentDefinition', id: 'existing-agent', name: 'Existing Agent', description: 'Healthy definition',
  instructions: 'Inspect only', role: null, category: null, avatarUrl: null,
  toolNames: [], inputProcessorNames: [], llmResponseProcessorNames: [], toolExecutionResultProcessorNames: [],
  toolInvocationPreprocessorNames: [], lifecycleProcessorNames: [], skillNames: [], skillScope: 'CONFIGURED',
  ownershipScope: 'SHARED', ownerTeamId: null, ownerTeamName: null, ownerApplicationId: null,
  ownerApplicationName: null, ownerPackageId: null, ownerLocalApplicationId: null, defaultLaunchConfig: null, loadIssue: null,
}
const org = {
  __typename: 'AgentOrgDefinition', id: 'existing-org', name: 'Existing Org', description: 'Healthy definition',
  instructions: '', category: null, avatarUrl: null, revision: 'revision-1', handoffs: [],
  members: [{ __typename: 'AgentOrgMember', memberName: 'worker', ref: agent.id, refType: 'AGENT', refScope: 'SHARED' }],
  defaultLaunchConfig: null, loadIssues: [],
}

describe('definition creation publishes a complete current-query cache row', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const rows: Record<string, any[]> = { agentDefinitions: [structuredClone(agent)], agentOrgDefinitions: [structuredClone(org)] }
    io.client = new ApolloClient({ cache: new InMemoryCache(), link: new ApolloLink(operation => new Observable(observer => {
      try {
        const definition: any = operation.query.definitions.find((node: any) => node.kind === 'OperationDefinition')
        const field = definition.selectionSet.selections[0].name.value
        const fragments = new Map(operation.query.definitions.filter((node: any) => node.kind === 'FragmentDefinition').map((node: any) => [node.name.value, node] as const))
        let value: any
        if (field === 'agentDefinitions' || field === 'agentOrgDefinitions') value = rows[field]
        else if (field === 'createAgentDefinition') {
          value = { ...agent, ...operation.variables.input, id: 'new-agent' }; rows.agentDefinitions.push(value)
        } else if (field === 'createAgentOrgDefinition') {
          value = { ...org, ...operation.variables.input, id: 'new-org', members: operation.variables.input.members.map((member: any) => ({ ...member, __typename: 'AgentOrgMember' })) }; rows.agentOrgDefinitions.push(value)
        } else throw new Error(`Unexpected operation: ${field}`)
        observer.next({ data: selected({ [field]: value }, definition.selectionSet, fragments) }); observer.complete()
      } catch (error) { observer.error(error) }
    })) })
  })
  afterEach(() => { io.client.stop(); vi.restoreAllMocks() })

  it.each(['Agent', 'Org'] as const)('creates a healthy %s without missing-field errors or an unreadable catalog cache', async kind => {
    const agents = useAgentDefinitionStore(), orgs = useAgentOrgDefinitionStore()
    const query = kind === 'Agent' ? GetAgentDefinitions : GetAgentOrgDefinitions
    if (kind === 'Agent') await agents.fetchAllAgentDefinitions(); else await orgs.fetchAll()
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    if (kind === 'Agent') await agents.createAgentDefinition({ name: 'New Agent', description: 'Healthy', instructions: 'Inspect only' })
    else await orgs.create({ name: 'New Org', description: 'Healthy', instructions: '', handoffs: [], members: org.members, defaultLaunchConfig: null })
    const missingFields = error.mock.calls.flatMap(([message]) => {
      const encoded = /err#([^\s]+)/.exec(String(message))?.[1]
      if (!encoded) return []
      const details = JSON.parse(decodeURIComponent(encoded))
      return details.message === 13 ? [details.args[0]] : []
    })
    expect(missingFields, 'Creation must not publish a row missing fields required by its catalog query').toEqual([])
    const cached = io.client.readQuery({ query })
    expect(cached).not.toBeNull()
    if (kind === 'Agent') expect(cached.agentDefinitions).toContainEqual(expect.objectContaining({ id: 'new-agent', loadIssue: null }))
    else expect(cached.agentOrgDefinitions).toContainEqual(expect.objectContaining({ id: 'new-org', loadIssues: [] }))
  })
})
