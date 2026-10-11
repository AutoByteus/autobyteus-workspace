import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  DefinitionCatalogChangeFeed,
  deliverDefinitionCatalogChange,
  parseDefinitionCatalogChangeMessage,
} from '../definitionCatalogChangeFeed'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useAgentOrgDefinitionStore } from '~/stores/agentOrgDefinitionStore'
import { useAgentPackagesStore } from '~/stores/agentPackagesStore'
import { useDefinitionDiagnosticsStore } from '~/stores/definitionDiagnosticsStore'
import type { DefinitionCatalogChangeMessage } from '~/types/definitionCatalog'

class FakeSocket {
  onmessage: ((event: { data: unknown }) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  closed = false
  constructor(readonly url: string) {}
  close() { this.closed = true }
  receive(value: unknown) { this.onmessage?.({ data: typeof value === 'string' ? value : JSON.stringify(value) }) }
  drop() { this.onclose?.() }
}

const spies = () => ({
  agents: vi.spyOn(useAgentDefinitionStore(), 'reloadIfLoaded').mockResolvedValue(undefined),
  teams: vi.spyOn(useAgentTeamDefinitionStore(), 'reloadIfLoaded').mockResolvedValue(undefined),
  orgs: vi.spyOn(useAgentOrgDefinitionStore(), 'reloadIfLoaded').mockResolvedValue(undefined),
  packages: vi.spyOn(useAgentPackagesStore(), 'reloadIfLoaded').mockResolvedValue(undefined),
  diagnostics: vi.spyOn(useDefinitionDiagnosticsStore(), 'reloadIfLoaded').mockResolvedValue(undefined),
})

describe('definition catalog change feed', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

  it('accepts only connected and definitions_changed frames with known subjects', () => {
    expect(parseDefinitionCatalogChangeMessage('{"type":"connected"}')).toEqual({ type: 'connected' })
    expect(parseDefinitionCatalogChangeMessage('{"type":"definitions_changed","subjects":["agent","agent_package"]}'))
      .toEqual({ type: 'definitions_changed', subjects: ['agent', 'agent_package'] })
    expect(parseDefinitionCatalogChangeMessage('{"type":"definitions_changed","subjects":["skill"]}')).toBeNull()
    expect(parseDefinitionCatalogChangeMessage('{"type":"definitions_changed","subjects":[]}')).toBeNull()
    expect(parseDefinitionCatalogChangeMessage('not json')).toBeNull()
  })

  it('reloads only the loaded lists of the named subjects, with their diagnostics', async () => {
    const stores = spies()
    deliverDefinitionCatalogChange({ type: 'definitions_changed', subjects: ['agent_team', 'agent_org'] })
    await vi.runAllTimersAsync()
    expect(stores.agents).not.toHaveBeenCalled()
    expect(stores.teams).toHaveBeenCalledOnce()
    expect(stores.orgs).toHaveBeenCalledOnce()
    expect(stores.packages).not.toHaveBeenCalled()
    expect(stores.diagnostics).toHaveBeenCalledWith(['AGENT_TEAM', 'AGENT_ORG'])
  })

  it('re-reads every loaded catalog on each (re)connection', async () => {
    const stores = spies()
    const delivered: DefinitionCatalogChangeMessage[] = []
    const sockets: FakeSocket[] = []
    const feed = new DefinitionCatalogChangeFeed({
      endpoint: () => 'ws://node/ws/definition-catalog',
      deliver: (message) => { delivered.push(message); deliverDefinitionCatalogChange(message) },
      createSocket: (url) => { const socket = new FakeSocket(url); sockets.push(socket); return socket },
    })
    const release = feed.retain()
    sockets[0]!.receive({ type: 'connected' })
    sockets[0]!.drop()
    vi.advanceTimersByTime(1000)
    sockets[1]!.receive({ type: 'connected' })
    await vi.runAllTimersAsync()
    expect(delivered).toEqual([{ type: 'connected' }, { type: 'connected' }])
    for (const spy of [stores.agents, stores.teams, stores.orgs, stores.packages]) expect(spy).toHaveBeenCalledTimes(2)
    release()
    expect(sockets[1]!.closed).toBe(true)
  })
})
