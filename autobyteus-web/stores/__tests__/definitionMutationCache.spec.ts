// Healthy definition creation and edits must remain readable through the current cached catalog query.
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
import { CreateAgentDefinition, UpdateAgentDefinition } from '~/graphql/mutations/agentDefinitionMutations'
import { CreateAgentOrgDefinition, UpdateAgentOrgDefinition } from '~/graphql/mutations/agentOrgDefinitionMutations'

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
  ownerApplicationName: null, ownerPackageId: null, ownerLocalApplicationId: null, internal: false, defaultLaunchConfig: null, loadIssue: null,
}
const org = {
  __typename: 'AgentOrgDefinition', id: 'existing-org', name: 'Existing Org', description: 'Healthy definition',
  instructions: '', category: null, avatarUrl: null, revision: 'revision-1', handoffs: [],
  members: [{ __typename: 'AgentOrgMember', memberName: 'worker', ref: agent.id, refType: 'AGENT', refScope: 'SHARED' }],
  defaultLaunchConfig: null, loadIssues: [],
}

const missingCacheFields = (calls: unknown[][]): string[] => calls.flatMap(([message]) => {
  const encoded = /err#([^\s]+)/.exec(String(message))?.[1]
  if (!encoded) return []
  const details = JSON.parse(decodeURIComponent(encoded))
  return details.message === 13 ? [details.args[0]] : []
})

// Populated payloads witness the existing selection/catalog contract, NOT a malformed-save
// workflow or a change to the server's healthy mutation defaults (Agent null / Org []).
const issue = {
  code: 'DEFINITION_CONTRACT_INVALID', reason: 'Cannot read definition JSON',
  definitionPath: '/packages/agents/existing-agent/agent-config.json', packageRoot: '/packages',
}
const issues = [
  { kind: 'AGENT_ORG', definitionId: org.id, name: org.name, ...issue, definitionPath: '/packages/agent-orgs/existing-org/org-config.json', usingLastGood: true },
  { kind: 'AGENT', definitionId: 'nested-agent', name: null, ...issue, usingLastGood: false },
]
let rows: Record<string, any[]>

describe('definition mutations publish a complete current-query cache row', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    rows = { agentDefinitions: [structuredClone(agent)], agentOrgDefinitions: [structuredClone(org)] }
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
        } else if (field === 'updateAgentDefinition' || field === 'updateAgentOrgDefinition') {
          const list = field === 'updateAgentDefinition' ? rows.agentDefinitions : rows.agentOrgDefinitions
          const { expectedRevision, ...input } = operation.variables.input
          const index = list.findIndex(row => row.id === input.id)
          if (index === -1) throw new Error(`Unknown definition: ${input.id}`)
          if (field === 'updateAgentOrgDefinition' && expectedRevision !== list[index].revision) throw new Error('Revision mismatch')
          value = { ...list[index], ...input, ...(field === 'updateAgentOrgDefinition' ? { revision: 'revision-2' } : {}) }
          list[index] = value
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
    const created = kind === 'Agent'
      ? await agents.createAgentDefinition({ name: 'New Agent', description: 'Healthy', instructions: 'Inspect only' })
      : await orgs.create({ name: 'New Org', description: 'Healthy', instructions: '', handoffs: [], members: org.members, defaultLaunchConfig: null })
    expect(created).toMatchObject(kind === 'Agent'
      ? { id: 'new-agent', name: 'New Agent', loadIssue: null }
      : { id: 'new-org', name: 'New Org', revision: org.revision, members: org.members, handoffs: [], loadIssues: [] })
    const missingFields = missingCacheFields(error.mock.calls)
    expect(missingFields, 'Creation must not publish a row missing fields required by its catalog query').toEqual([])
    const cached = io.client.readQuery({ query })
    expect(cached).not.toBeNull()
    if (kind === 'Agent') {
      expect(cached.agentDefinitions).toHaveLength(2)
      expect(cached.agentDefinitions).toContainEqual(expect.objectContaining({ id: 'new-agent', loadIssue: null }))
      expect(cached.agentDefinitions).toContainEqual(expect.objectContaining({ id: agent.id, name: agent.name }))
    } else {
      expect(cached.agentOrgDefinitions).toHaveLength(2)
      expect(cached.agentOrgDefinitions).toContainEqual(expect.objectContaining({ id: 'new-org', loadIssues: [] }))
      expect(cached.agentOrgDefinitions).toContainEqual(expect.objectContaining({ id: org.id, name: org.name }))
    }
  })

  it.each(['Agent', 'Org'] as const)('edits a healthy %s with complete issue fields and cache-first rereads', async kind => {
    const agents = useAgentDefinitionStore(), orgs = useAgentOrgDefinitionStore()
    const query = kind === 'Agent' ? GetAgentDefinitions : GetAgentOrgDefinitions
    if (kind === 'Agent') await agents.fetchAllAgentDefinitions(); else await orgs.fetchAll()
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const updated = kind === 'Agent'
      ? await agents.updateAgentDefinition({ id: agent.id, name: 'Edited Agent' })
      : await orgs.update(org.id, org.revision, { name: 'Edited Org' })
    // A normalized existing entity can mask an incomplete mutation response by retaining
    // old fields. Check the response too, since both edits share the create fragments.
    const expected = kind === 'Agent'
      ? { id: agent.id, name: 'Edited Agent', loadIssue: null }
      : { id: org.id, name: 'Edited Org', revision: 'revision-2', loadIssues: [] }
    expect(updated).toMatchObject(expected)
    expect(updated).toMatchObject(kind === 'Agent'
      ? { description: agent.description, instructions: agent.instructions, ownershipScope: agent.ownershipScope }
      : { description: org.description, instructions: org.instructions, members: org.members, handoffs: org.handoffs })
    expect(missingCacheFields(error.mock.calls)).toEqual([])
    const cached = io.client.readQuery({ query })
    expect(cached).not.toBeNull()
    if (kind === 'Agent') {
      expect(cached.agentDefinitions).toContainEqual(expect.objectContaining(expected))
      agents.agentDefinitions = []; await agents.fetchAllAgentDefinitions()
      expect(agents.getAgentDefinitionById(agent.id)).toMatchObject(expected)
    } else {
      expect(cached.agentOrgDefinitions).toContainEqual(expect.objectContaining(expected))
      orgs.definitions = []; await orgs.fetchAll()
      expect(orgs.byId(org.id)).toMatchObject(expected)
    }
  })
  it.each([
    ['Agent create', CreateAgentDefinition, 'createAgentDefinition', agent, 'loadIssue', issue],
    ['Agent edit', UpdateAgentDefinition, 'updateAgentDefinition', agent, 'loadIssue', issue],
    ['Org create', CreateAgentOrgDefinition, 'createAgentOrgDefinition', org, 'loadIssues', issues],
    ['Org edit', UpdateAgentOrgDefinition, 'updateAgentOrgDefinition', org, 'loadIssues', issues],
  ] as const)('preserves every populated diagnostic value selected by %s (contract only)', (_label, document, field, row, diagnosticKey, payload) => {
    const operation: any = document.definitions.find(node => node.kind === 'OperationDefinition')
    const fragments = new Map(document.definitions.filter((node: any) => node.kind === 'FragmentDefinition').map((node: any) => [node.name.value, node] as const))
    const response = selected({ [field]: { ...row, [diagnosticKey]: payload } }, operation.selectionSet, fragments)

    expect(response[field][diagnosticKey]).toEqual(payload)
  })

  it.each(['Agent', 'Org'] as const)('keeps nonempty %s catalog diagnostics readable through the real cache', async kind => {
    // Configure the transport's supported diagnostic-bearing catalog DTO, not hidden cache
    // state or definition files. Apollo adds typename selections, as the real server does.
    rows.agentDefinitions[0].loadIssue = { ...issue, __typename: 'DefinitionLoadIssue' }
    rows.agentOrgDefinitions[0].loadIssues = issues.map(entry => ({ ...entry, __typename: 'DefinitionLoadIssueEntry' }))
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    if (kind === 'Agent') {
      const store = useAgentDefinitionStore()
      await store.fetchAllAgentDefinitions()
      expect(store.getAgentDefinitionById(agent.id)?.loadIssue).toMatchObject(issue)
      expect(io.client.readQuery({ query: GetAgentDefinitions }).agentDefinitions[0].loadIssue).toMatchObject(issue)
    } else {
      const store = useAgentOrgDefinitionStore()
      await store.fetchAll()
      expect(store.byId(org.id)?.loadIssues).toHaveLength(issues.length)
      expect(store.byId(org.id)?.loadIssues).toMatchObject(issues)
      expect(io.client.readQuery({ query: GetAgentOrgDefinitions }).agentOrgDefinitions[0].loadIssues).toMatchObject(issues)
    }
    expect(missingCacheFields(error.mock.calls)).toEqual([])
  })

})
