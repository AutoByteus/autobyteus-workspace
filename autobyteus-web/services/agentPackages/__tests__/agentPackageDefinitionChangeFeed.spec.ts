import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import {
  AgentPackageDefinitionChangeFeed,
  deliverAgentPackageDefinitionChange,
  parseAgentPackageDefinitionChangeMessage,
} from '../agentPackageDefinitionChangeFeed'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useAgentOrgDefinitionStore } from '~/stores/agentOrgDefinitionStore'
import { useAgentPackagesStore } from '~/stores/agentPackagesStore'
import { useDefinitionProblemsStore } from '~/stores/definitionProblemsStore'
import type { AgentPackageDefinitionChangeMessage } from '~/types/agentPackageDefinitions'

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
  problems: vi.spyOn(useDefinitionProblemsStore(), 'reloadIfLoaded').mockResolvedValue(undefined),
})

describe('agent package definition change feed', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

  it('accepts only connected and agent_package_definitions_changed frames with known lists', () => {
    expect(parseAgentPackageDefinitionChangeMessage('{"type":"connected"}')).toEqual({ type: 'connected' })
    expect(parseAgentPackageDefinitionChangeMessage('{"type":"agent_package_definitions_changed","changedLists":["agents","agent_packages"]}'))
      .toEqual({ type: 'agent_package_definitions_changed', changedLists: ['agents', 'agent_packages'] })
    expect(parseAgentPackageDefinitionChangeMessage('{"type":"agent_package_definitions_changed","changedLists":["skills"]}')).toBeNull()
    expect(parseAgentPackageDefinitionChangeMessage('{"type":"agent_package_definitions_changed","changedLists":[]}')).toBeNull()
    // The pre-SR-009 frame is not accepted (clean cut).
    expect(parseAgentPackageDefinitionChangeMessage('{"type":"definitions_changed","subjects":["agent"]}')).toBeNull()
    expect(parseAgentPackageDefinitionChangeMessage('not json')).toBeNull()
  })

  it('reloads only the named loaded lists, with their definition problems', async () => {
    const stores = spies()
    deliverAgentPackageDefinitionChange({ type: 'agent_package_definitions_changed', changedLists: ['agent_teams', 'agent_orgs'] })
    await vi.runAllTimersAsync()
    expect(stores.agents).not.toHaveBeenCalled()
    expect(stores.teams).toHaveBeenCalledOnce()
    expect(stores.orgs).toHaveBeenCalledOnce()
    expect(stores.packages).not.toHaveBeenCalled()
    expect(stores.problems).toHaveBeenCalledWith(['AGENT_TEAM', 'AGENT_ORG'])
  })

  it('re-reads every loaded list on each (re)connection', async () => {
    const stores = spies()
    const delivered: AgentPackageDefinitionChangeMessage[] = []
    const sockets: FakeSocket[] = []
    const feed = new AgentPackageDefinitionChangeFeed({
      endpoint: () => 'ws://node/ws/agent-package-definitions',
      deliver: (message) => { delivered.push(message); deliverAgentPackageDefinitionChange(message) },
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
