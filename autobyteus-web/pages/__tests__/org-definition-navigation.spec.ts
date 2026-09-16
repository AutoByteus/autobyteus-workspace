import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client/core'
import { createPinia, setActivePinia } from 'pinia'
import { computed, defineComponent, reactive } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import OrgPage from '~/pages/agent-orgs.vue'
import TeamPage from '~/pages/agent-teams.vue'
import AgentsPage from '~/pages/agents.vue'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'

const io = vi.hoisted(() => ({ client: null as any, route: null as any, push: vi.fn() }))
mockNuxtImport('useRoute', () => () => io.route)
mockNuxtImport('useRouter', () => () => ({ push: io.push }))
vi.mock('vue-router', () => ({ useRoute: () => io.route, useRouter: () => ({ push: io.push }) }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io.client }))
vi.mock('~/stores/workspace', () => ({ useWorkspaceStore: () => ({ fetchAllWorkspaces: async () => {} }) }))
vi.mock('~/composables/useRunActions', () => ({ useRunActions: () => ({ prepareTeamRun: vi.fn() }) }))
vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => ({ waitForBoundBackendReady: async () => true }),
}))

const orgId = 'local-owned-org'
const ownedTeamId = 'agent-org-owned-team:local-owned-org:local-team'
const sharedTeamId = 'shared-team'
const workerId = 'shared-worker'
const agent = {
  __typename: 'AgentDefinition', id: workerId, name: 'Research Worker', description: 'Shared member description',
  role: null, instructions: 'Actual shared Agent instructions', category: null, avatarUrl: null,
  toolNames: [], inputProcessorNames: [], llmResponseProcessorNames: [], toolExecutionResultProcessorNames: [],
  toolInvocationPreprocessorNames: [], lifecycleProcessorNames: [], skillNames: [], defaultLaunchConfig: null,
  ownershipScope: 'SHARED', ownerOrgId: null, ownerOrgName: null, ownerTeamId: null, ownerTeamName: null,
  ownerApplicationId: null, ownerApplicationName: null, ownerPackageId: null, ownerLocalApplicationId: null,
}
const team = {
  __typename: 'AgentTeamDefinition', id: ownedTeamId, name: 'Research Team', description: 'Exact bundled Team',
  instructions: 'Team instructions', category: null, avatarUrl: null, revision: 'team-rev', handoffs: [],
  coordinatorMemberName: 'worker', nodes: [{ __typename: 'TeamMember', memberName: 'worker', ref: workerId, refScope: 'SHARED' }],
  ownershipScope: 'AGENT_ORG_OWNED', ownerOrgId: orgId, ownerOrgName: 'Research Org',
  ownerTeamId: null, ownerTeamName: null, ownerApplicationId: null, ownerApplicationName: null,
  ownerPackageId: null, ownerLocalApplicationId: null, defaultLaunchConfig: null,
}
const org = {
  __typename: 'AgentOrgDefinition', id: orgId, name: 'Research Org', description: 'Org description',
  instructions: 'Org instructions', category: null, avatarUrl: null, revision: 'org-rev', defaultLaunchConfig: null,
  members: [{ __typename: 'AgentOrgMember', memberName: 'research', ref: ownedTeamId, refType: 'AGENT_TEAM', refScope: 'AGENT_ORG_OWNED' }],
  handoffs: [],
}
// Router transport is the only navigation double; all page handlers and buttons are real.
const Host = defineComponent({
  setup() {
    const page = computed(() => io.route.path === '/agent-orgs' ? OrgPage : io.route.path === '/agent-teams' ? TeamPage : AgentsPage)
    return { page, route: io.route }
  },
  template: '<component :is="page" :key="route.path" />',
})

describe('definition inspection return through actual pages and stores', () => {
  let wrapper: VueWrapper | undefined
  let calls: Array<{ field: string; variables: any }>
  beforeEach(() => {
    setActivePinia(createPinia()); calls = []
    io.route = reactive({ path: '/agent-orgs', query: {} })
    io.push.mockReset().mockImplementation(async ({ path, query }) => { io.route.path = path; io.route.query = query })
    io.client = new ApolloClient({ cache: new InMemoryCache(), link: new ApolloLink(operation => new Observable(observer => {
      const field = (operation.query.definitions.find((d: any) => d.kind === 'OperationDefinition') as any).selectionSet.selections[0].name.value
      calls.push({ field, variables: structuredClone(operation.variables) })
      if (field === 'getServerSettings') {
        observer.next({ data: { getServerSettings: [], getEffectiveWorkingContextCompactionStrategyId: 'default', getEffectiveStreamingContentFlushIntervalMs: 0 } })
        observer.complete(); return
      }
      let value: unknown
      if (field === 'agentOrgDefinitions') value = [org]
      else if (field === 'agentDefinitions') value = [agent]
      else if (field === 'agentTeamDefinitions') value = [{ ...team, id: sharedTeamId, ownershipScope: 'SHARED', ownerOrgId: null, ownerOrgName: null }]
      else if (field === 'agentTeamDefinition' && operation.variables.id === ownedTeamId) value = team
      else throw new Error(`Unexpected I/O: ${field}`)
      observer.next({ data: { [field]: structuredClone(value) } }); observer.complete()
    })) })
  })
  afterEach(() => { wrapper?.unmount(); wrapper = undefined; io.client.stop() })
  const click = async (label: RegExp) => {
    const button = wrapper!.findAll('button').find(button => label.test(button.text()))
    expect(button, `button ${label}`).toBeDefined()
    await button!.trigger('click'); await flushPromises()
  }
  const expectLocation = (path: string, query: Record<string, string>) => {
    expect(io.route.path).toBe(path); expect(io.route.query).toEqual(query)
  }

  it('returns Org -> exact owned Team -> shared member -> same Team -> same Org without catalog exposure', async () => {
    wrapper = mount(Host); await flushPromises()
    await click(/View Details/)
    expectLocation('/agent-orgs', { view: 'org-detail', id: orgId })
    await click(/^View ↗/)
    expectLocation('/agent-teams', { view: 'team-detail', id: ownedTeamId, returnToOrg: orgId })
    expect(wrapper.text()).toContain('Exact bundled Team')
    await wrapper.get('[data-test="agent-member-view"]').trigger('click'); await flushPromises()
    expectLocation('/agents', { view: 'detail', id: workerId, returnToTeam: ownedTeamId, returnToOrg: orgId })
    expect(wrapper.text()).toContain(agent.instructions)
    await click(/Back to Team/i)
    expectLocation('/agent-teams', { view: 'team-detail', id: ownedTeamId, returnToOrg: orgId })
    expect(wrapper.text()).toContain('Exact bundled Team')
    expect(wrapper.text()).not.toContain('Agent team not found')
    expect(useAgentTeamDefinitionStore().getCatalogAgentTeamDefinitionById(ownedTeamId)).toBeNull()
    await click(/Back to Agent Orgs/i)
    expectLocation('/agent-orgs', { view: 'org-detail', id: orgId })
    expect(wrapper.text()).toContain('Org description')
    expect(calls.filter(call => call.field === 'agentTeamDefinition').every(call => call.variables.id === ownedTeamId)).toBe(true)
    expect(calls.every(call => ['getServerSettings', 'agentOrgDefinitions', 'agentDefinitions', 'agentTeamDefinitions', 'agentTeamDefinition'].includes(call.field))).toBe(true)
  })

  it('keeps standalone Team -> shared member -> Team -> catalog navigation free of Org return scope', async () => {
    io.route.path = '/agent-teams'; io.route.query = { view: 'team-detail', id: sharedTeamId }
    wrapper = mount(Host); await flushPromises()
    await wrapper.get('[data-test="agent-member-view"]').trigger('click'); await flushPromises()
    expectLocation('/agents', { view: 'detail', id: workerId, returnToTeam: sharedTeamId })
    await click(/Back to Team/i)
    expectLocation('/agent-teams', { view: 'team-detail', id: sharedTeamId })
    await click(/Back to agent teams/i)
    expectLocation('/agent-teams', { view: 'team-list' })
    expect(calls.some(call => call.field === 'agentTeamDefinition')).toBe(false)
  })
})
