import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApolloClient, ApolloLink, InMemoryCache, Observable, gql } from '@apollo/client/core'
import { createPinia, setActivePinia } from 'pinia'
import { useAgentOrgDefinitionStore } from '../agentOrgDefinitionStore'
import { GetAgentOrgDefinitions } from '~/graphql/queries/agentOrgDefinitionQueries'
const io = vi.hoisted(() => ({ client: null as any }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io.client }))
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => ({ waitForBoundBackendReady: async () => true }) }))
const definition = (id = 'one') => ({ __typename: 'AgentOrgDefinition', id, name: id, description: 'Keep description', instructions: 'Keep instructions', category: 'Keep category', avatarUrl: '/old.png', revision: 'r1', members: [], handoffs: [], defaultLaunchConfig: null })
const historyQuery = gql`query Preserved { retainedHistory { id text } }`
let response: any, failure: Error | undefined, calls: any[], store: ReturnType<typeof useAgentOrgDefinitionStore>
beforeEach(async () => {
  setActivePinia(createPinia()); calls = []; failure = undefined
  io.client = new ApolloClient({ cache: new InMemoryCache(), link: new ApolloLink((operation: any) => new Observable((observer: any) => {
    calls.push(operation); if (failure) observer.error(failure); else { observer.next(response); observer.complete() }
  })) })
  io.client.cache.writeQuery({ query: GetAgentOrgDefinitions, data: { agentOrgDefinitions: [definition()] } })
  io.client.cache.writeQuery({ query: historyQuery, data: { retainedHistory: { __typename: 'History', id: 'run', text: 'Preserve conversation' } } })
  store = useAgentOrgDefinitionStore(); await store.fetchAll()
})
afterEach(() => io.client.stop())
const cached = () => io.client.cache.readQuery({ query: GetAgentOrgDefinitions }).agentOrgDefinitions
const reread = async () => { store.definitions = []; await store.fetchAll(); return store.definitions }
describe('verified Org mutation publication through real Apollo cache and Pinia', () => {
  it('adds create membership and applies avatar replacement/clear to cache-first rereads', async () => {
    const created = definition('two'); response = { data: { createAgentOrgDefinition: created } }
    await store.create({ ...created }); expect(cached().map((o: any) => o.id)).toEqual(['one', 'two'])
    response = { data: { updateAgentOrgDefinition: { ...created, avatarUrl: '/uploaded.png', revision: 'r2' } } }
    await store.update('two', 'r1', { avatarUrl: '/uploaded.png' }); expect((await reread())[1]?.avatarUrl).toBe('/uploaded.png')
    response = { data: { updateAgentOrgDefinition: { ...created, avatarUrl: null, revision: 'r3' } } }
    await store.update('two', 'r2', { avatarUrl: '' }); expect(calls.at(-1).variables.input).toEqual({ id: 'two', expectedRevision: 'r2', avatarUrl: '' })
    expect((await reread())[1]).toMatchObject({ avatarUrl: null, instructions: 'Keep instructions', category: 'Keep category' })
    expect(calls).toHaveLength(3) // All list rereads use the real cache, not the transport.
  })
  it('removes only successful exact membership, preventing cache-first resurrection and preserving history', async () => {
    response = { data: { deleteAgentOrgDefinition: true } }; expect(await store.remove('one')).toBe(true)
    expect(cached()).toEqual([]); expect(await reread()).toEqual([]); expect(calls).toHaveLength(1)
    expect(io.client.cache.extract()['AgentOrgDefinition:one']).toBeUndefined()
    expect(io.client.cache.readQuery({ query: historyQuery }).retainedHistory.text).toBe('Preserve conversation')
  })
  it.each(['false', 'graphql', 'network', 'missing'])('does not evict on %s delete failure', async mode => {
    response = mode === 'false' ? { data: { deleteAgentOrgDefinition: false } }
      : mode === 'missing' ? { data: {} } : { data: { deleteAgentOrgDefinition: true }, errors: [{ message: 'Read-only source' }] }
    if (mode === 'network') failure = new Error('Disconnected')
    if (mode === 'false' || mode === 'missing') expect(await store.remove('one')).toBe(false)
    else await expect(store.remove('one')).rejects.toThrow()
    expect((await reread())[0]).toEqual(definition()); expect(cached()).toEqual([definition()])
  })
  it('rejects failed/partial creates without inserting catalog membership', async () => {
    response = { data: { createAgentOrgDefinition: definition('two') }, errors: [{ message: 'Rejected create' }] }
    await expect(store.create(definition('two'))).rejects.toThrow()
    response = { data: { createAgentOrgDefinition: { ...definition('two'), revision: '' } } }
    await expect(store.create(definition('two'))).rejects.toThrow()
    expect(cached()).toEqual([definition()]); expect(await reread()).toEqual([definition()])
  })
  it.each(['graphql', 'missing', 'wrong-id', 'missing-revision'])('does not publish %s partial update or poison normalized entities', async mode => {
    const updated = { ...definition(), avatarUrl: '/must-not-publish.png' }
    response = { data: { updateAgentOrgDefinition: mode === 'missing' ? null : mode === 'wrong-id' ? { ...updated, id: 'other' } : mode === 'missing-revision' ? { ...updated, revision: '' } : updated }, ...(mode === 'graphql' ? { errors: [{ message: 'Rejected' }] } : {}) }
    await expect(store.update('one', 'r1', { avatarUrl: '/must-not-publish.png' })).rejects.toThrow()
    expect(cached()).toEqual([definition()]); expect((await reread())[0]).toEqual(definition())
  })
})
