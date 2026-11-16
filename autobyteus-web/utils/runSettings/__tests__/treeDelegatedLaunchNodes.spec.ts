import { describe, expect, it } from 'vitest'
import type { RunTreeRowDto } from '@autobyteus/collaboration-stream-contracts'
import { delegatedRowsByKey, treeDelegatedLaunchNodes, treeDelegatedSaveTargets, type DelegatedRowControl } from '../delegatedLaunchRows'

/**
 * autobyteus-461 SR-084 (CR-461-079, CR-461-086 folded in; REQ-007, SR-006, SR-007): Settings' delegated rows are the run's
 * tree's rows: each with its launch and origin as its run has them (the server's), a team with its members as its rows.
 * Nothing about a run is read or derived on the client.
 */
const deps = { schemaFor: () => null, sameWorkspace: () => true }
const control = (overrides: Partial<DelegatedRowControl> = {}): DelegatedRowControl =>
  ({ editable: true, isAgentLive: () => false, isStopping: () => false, draftOf: () => null, ...overrides })
const launch = (llmModelIdentifier: string, source: unknown, ownSource = true) => ({ runtimeKind: 'claude_agent_sdk', llmModelIdentifier,
  llmConfig: null, autoExecuteTools: false, workspaceRootPath: '/w', source, ownSource }) as RunTreeRowDto['launch']
const routed = { origin: 'model_router', fallbacks: [{ layer: 'agent_default', runtimeKind: 'codex_app_server', llmModelIdentifier: 'sol', reason: 'runtime_unavailable', detail: 'no codex' }],
  choiceReason: 'Writes prose.', taskKind: 'writing' }
const row = (key: string, parentKey: string, kind: RunTreeRowDto['kind'], target: RunTreeRowDto['openTarget'], rowLaunch?: RunTreeRowDto['launch'], extra: Partial<RunTreeRowDto> = {}): RunTreeRowDto =>
  ({ key, parentKey, depth: 1, kind, name: key.split(':').at(-1)!, address: `/${key.split(':').at(-1)}`, openTarget: target, statusIds: [target?.agentRunId ?? key],
    ...(rowLaunch ? { launch: rowLaunch } : {}), ...extra })
const top = { kind: 'agent' as const, runId: 'manager' }
const tree: RunTreeRowDto[] = [
  row('agent:manager', null as never, 'agent', { runKind: 'agent', runId: 'manager', agentRunId: 'manager' }),
  row('agent:writer', 'agent:manager', 'agent', { runKind: 'agent', runId: 'writer', agentRunId: 'writer' }, launch('opus', routed)),
  row('team:squad', 'agent:manager', 'team', { runKind: 'agent_team', runId: 'squad', agentRunId: 'lead' }, launch('sonnet', { origin: 'configured', fallbacks: [] })),
  row('team_member:squad:lead', 'team:squad', 'team_member', { runKind: 'agent_team', runId: 'squad', agentRunId: 'lead' }, launch('sonnet', { origin: 'configured', fallbacks: [] }, false)),
  row('team_member:squad:dev', 'team:squad', 'team_member', { runKind: 'agent_team', runId: 'squad', agentRunId: 'dev' }, launch('haiku', { origin: 'settings', fallbacks: [] })),
  row('peer_agent:pub', 'agent:manager', 'peer_agent', { runKind: 'agent', runId: 'pub', agentRunId: 'pub', nodeId: 'beta' }, launch('gemini', { origin: 'agent_default', fallbacks: [] }),
    { peer: { nodeId: 'beta', nodeName: 'beta-node', title: null, reachable: true } }),
]

describe('treeDelegatedLaunchNodes (SR-084)', () => {
  it('one row per delegated run, keyed by its tree row\'s key; a team with its members as its rows, its coordinator marked; never the run\'s own row', () => {
    const rows = treeDelegatedLaunchNodes(tree, top, deps, control())
    expect(rows.map((node) => node.key)).toEqual(['agent:writer', 'team:squad', 'peer_agent:pub'])
    const squad = rows.find((node) => node.key === 'team:squad')!
    expect(squad.children.map((member) => [member.key, member.isCoordinator])).toEqual([['team_member:squad:lead', true], ['team_member:squad:dev', false]])
    expect(delegatedRowsByKey(rows).get('team_member:squad:dev')?.agentRunId).toBe('dev')
  })

  // autobyteus-461 SR-091: a delegated run's row is named as the server named its tree row; its team's members by their addresses.
  it('names each delegated run as the server named its row; a team\'s member by its address', () => {
    const named = tree.map((r) => r.key === 'agent:writer' ? { ...r, name: 'release writer' } : r.key === 'team:squad' ? { ...r, name: 'review squad' } : r)
    const rows = treeDelegatedLaunchNodes(named, top, deps, control())
    expect(rows.map((node) => node.name)).toEqual(['release writer', 'review squad', 'pub'])
    expect(rows.find((node) => node.key === 'team:squad')!.children.map((member) => member.name)).toEqual(['lead', 'dev'])
  })

  it('each row shows the launch and origin its run has now: an edit\'s "settings" origin; a member without its own source shows its team\'s', () => {
    const rows = delegatedRowsByKey(treeDelegatedLaunchNodes(tree, top, deps, control()))
    expect(rows.get('team_member:squad:dev')).toMatchObject({ values: { llmModelIdentifier: 'haiku' }, sourceKey: 'settings' })
    expect(rows.get('team_member:squad:lead')).toMatchObject({ values: { llmModelIdentifier: 'sonnet' }, sourceKey: 'configured' })
    // The Model Router's choice: its task kind and reason, and where its decision is; its skipped default stays a note.
    expect(rows.get('agent:writer')).toMatchObject({ sourceKey: 'model_router', routing: { taskKind: 'writing', reason: 'Writes prose.', decision: { runId: 'manager', copy: '/writer', agent: '/writer' } } })
    expect(rows.get('agent:writer')!.launchNotes).toEqual([expect.objectContaining({ kind: 'fallback', layer: 'agent_default' })])
  })

  it('a stopped run\'s model is editable while the run allows it; a running one is locked; a choice applies and hides the origin', () => {
    const editable = delegatedRowsByKey(treeDelegatedLaunchNodes(tree, top, deps, control({ isAgentLive: (id) => id === 'lead',
      draftOf: (target) => target === 'agent:writer' ? { llmModelIdentifier: 'opus-2', llmConfig: null } : null })))
    expect(editable.get('agent:writer')).toMatchObject({ values: { llmModelIdentifier: 'opus-2' }, locked: { model: false } })
    expect(editable.get('agent:writer')!.sourceKey).toBeUndefined()
    expect(editable.get('team:squad')!.locked?.model).toBe(true)
    expect(editable.get('team_member:squad:dev')!.locked?.model).toBe(true)
  })

  it('a peer\'s run is read-only, with its node\'s name and the launch its node answered; it has no stop and no save target', () => {
    const peer = delegatedRowsByKey(treeDelegatedLaunchNodes(tree, top, deps, control())).get('peer_agent:pub')!
    expect(peer).toMatchObject({ remoteNode: 'beta-node', values: { llmModelIdentifier: 'gemini' }, locked: { model: true, approval: true } })
    expect(peer.delegated?.stop).toBeNull()
    const targets = treeDelegatedSaveTargets(tree, top)
    expect([...targets]).toEqual([
      ['agent:writer', { kind: 'agent', agentRunId: 'writer' }],
      ['team:squad', { kind: 'team', teamRunId: 'squad' }],
      ['agent:lead', { kind: 'team_member', teamRunId: 'squad', memberAddress: '/lead' }],
      ['agent:dev', { kind: 'team_member', teamRunId: 'squad', memberAddress: '/dev' }],
    ])
  })

  it('a team run\'s own members are not delegated rows (its Settings shows them as its own)', () => {
    const teamTop = { kind: 'agent_team' as const, runId: 'squad' }
    const own = [row('team:squad', null as never, 'team', { runKind: 'agent_team', runId: 'squad', agentRunId: 'lead' }), ...tree.slice(3, 5)]
    expect(treeDelegatedLaunchNodes(own, teamTop, deps, control())).toEqual([])
    expect(treeDelegatedSaveTargets(own, teamTop).size).toBe(0)
  })
})
