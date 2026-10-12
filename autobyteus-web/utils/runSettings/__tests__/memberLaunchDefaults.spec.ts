import { describe, expect, it, vi } from 'vitest'
import { orgMemberSeedTargets, seedMemberLaunchDefaults, seededAddresses } from '../memberLaunchDefaults'
import { editMemberOverride, normalizeMemberOverride, releasesMemberPin, resetMemberOverride, resolveMemberSettings } from '../memberOverrides'
import type { StartModelCatalog } from '../startModelDefaults'

const catalog = (models: Record<string, string[]>, disabled: string[] = []) => {
  const ensureCatalog = vi.fn(async () => undefined)
  const value: StartModelCatalog = {
    ensureAvailability: vi.fn(async () => undefined),
    isRuntimeEnabled: (runtimeKind) => !disabled.includes(runtimeKind),
    ensureCatalog,
    models: (runtimeKind) => models[runtimeKind] ?? [],
  }
  return { value, ensureCatalog }
}
const sol = { runtimeKind: 'codex_app_server', llmModelIdentifier: 'sol-6.1', llmConfig: { reasoning_effort: 'high' } }

describe('seedMemberLaunchDefaults (REQ-009, DS-006)', () => {
  it('AC-011: members with a usable default get it as their own row; others follow; unusable ones get a note', async () => {
    const { value, ensureCatalog } = catalog({ codex_app_server: ['sol-6.1'] }, ['grok_build'])
    const defaults: Record<string, typeof sol | Record<string, unknown> | null> = {
      ie: sol, cr: { ...sol, llmConfig: null }, sd: null,
      grok: { runtimeKind: 'grok_build', llmModelIdentifier: 'grok-4' },
      retired: { runtimeKind: 'codex_app_server', llmModelIdentifier: 'old' },
      partial: { runtimeKind: 'codex_app_server' },
    }
    const seed = await seedMemberLaunchDefaults({
      members: Object.keys(defaults).map((id) => ({ address: `/${id}`, agentDefinitionId: id })),
      getAgentDefault: (id) => defaults[id] as never,
      catalog: value,
      modelConfigFor: (choice) => ({ ...(choice.llmConfig ?? {}), explicit: true }),
    })
    expect(seed.agentOverrides).toEqual({
      '/ie': { runtimeKind: 'codex_app_server', llmModelIdentifier: 'sol-6.1', llmConfig: { reasoning_effort: 'high', explicit: true } },
      '/cr': { runtimeKind: 'codex_app_server', llmModelIdentifier: 'sol-6.1', llmConfig: { explicit: true } },
    })
    expect(seed.notes).toEqual({
      '/grok': { runtimeKind: 'grok_build', llmModelIdentifier: 'grok-4', reason: 'runtime_unavailable' },
      '/retired': { runtimeKind: 'codex_app_server', llmModelIdentifier: 'old', reason: 'model_unavailable' },
      '/partial': { runtimeKind: 'codex_app_server', llmModelIdentifier: null, reason: 'incomplete' },
    })
    expect(seededAddresses(seed)).toEqual(['/ie', '/cr'])
    // Only the runtimes named by usable-looking defaults are loaded; never a default runtime's first model.
    expect(new Set(ensureCatalog.mock.calls.map(([runtimeKind]) => runtimeKind))).toEqual(new Set(['codex_app_server']))
  })

  it('no member defaults: nothing is checked or loaded', async () => {
    const { value, ensureCatalog } = catalog({})
    await expect(seedMemberLaunchDefaults({
      members: [{ address: '/a', agentDefinitionId: 'a' }], getAgentDefault: () => null, catalog: value, modelConfigFor: () => null,
    })).resolves.toEqual({ agentOverrides: {}, teamOverrides: {}, notes: {} })
    expect(value.ensureAvailability).not.toHaveBeenCalled()
    expect(ensureCatalog).not.toHaveBeenCalled()
  })

  it('AC-012: an Org seeds placed teams from their team default and agents (direct and in teams) from their agent default', async () => {
    const targets = orgMemberSeedTargets({ members: [
      { memberName: 'writer', ref: 'writer', refType: 'AGENT', refScope: 'SHARED' },
      { memberName: 'se', ref: 'se-team', refType: 'AGENT_TEAM', refScope: 'SHARED' },
    ] }, { teams: { 'se-team': { id: 'se-team', nodes: [
      { memberName: 'lead', ref: 'lead', refScope: 'SHARED' },
      { memberName: 'ie', ref: 'implementation_engineer', refScope: 'TEAM_LOCAL' },
    ] } } } as never)
    expect(targets.placedTeams).toEqual([{ address: '/se', teamDefinitionId: 'se-team' }])
    expect(targets.members.map((member) => member.address)).toEqual(['/writer', '/se/lead', '/se/ie'])
    expect(targets.members[2]!.agentDefinitionId).not.toBe('implementation_engineer')
    const { value } = catalog({ codex_app_server: ['sol-6.1'], autobyteus: ['local'] })
    const seed = await seedMemberLaunchDefaults({
      ...targets,
      getAgentDefault: (id) => id === targets.members[2]!.agentDefinitionId ? sol : null,
      getTeamDefault: () => ({ runtimeKind: 'autobyteus', llmModelIdentifier: 'local' }),
      catalog: value, modelConfigFor: (choice) => choice.llmConfig,
    })
    expect(seed.teamOverrides).toEqual({ '/se': { runtimeKind: 'autobyteus', llmModelIdentifier: 'local', llmConfig: null } })
    expect(Object.keys(seed.agentOverrides)).toEqual(['/se/ie'])
    expect(seededAddresses(seed)).toEqual(['/se', '/se/ie'])
  })
})

describe('pinned member overrides (AR-003, DEC-009, REQ-010)', () => {
  const root = { runtimeKind: 'codex_app_server', llmModelIdentifier: 'sol-6.1', llmConfig: { reasoning_effort: 'medium' }, autoExecuteTools: true }
  const seeded = { runtimeKind: 'codex_app_server' as const, llmModelIdentifier: 'sol-6.1', llmConfig: { reasoning_effort: 'medium' } }
  const deps = { defaultConfigFor: () => ({ reasoning_effort: 'medium' }), schemaFor: () => null }
  const pinned = { pinnedModel: true }

  it('a pinned row equal to the root keeps its model through a thinking edit, so a later root change does not move it', () => {
    const edited = editMemberOverride(seeded, root, { field: 'thinking', llmConfig: { reasoning_effort: 'high' } }, deps, pinned)
    expect(edited).toEqual({ runtimeKind: 'codex_app_server', llmModelIdentifier: 'sol-6.1', llmConfig: { reasoning_effort: 'high' } })
    const newRoot = { ...root, runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'opus', llmConfig: null }
    expect(resolveMemberSettings(newRoot, edited)).toMatchObject({ runtimeKind: 'codex_app_server', llmModelIdentifier: 'sol-6.1', llmConfig: { reasoning_effort: 'high' } })
    // Unpinned, the same edit drops the equal model, and the row would follow the root.
    expect(editMemberOverride(seeded, root, { field: 'thinking', llmConfig: { reasoning_effort: 'high' } }, deps)).toEqual({ llmConfig: { reasoning_effort: 'high' } })
  })

  it('a pinned row set to the parent\'s model stays its own; unpinned rows keep the earlier rule', () => {
    const other = { runtimeKind: 'claude_agent_sdk' as const, llmModelIdentifier: 'opus', llmConfig: null }
    const choice = { runtimeKind: 'codex_app_server', llmModelIdentifier: 'sol-6.1' }
    expect(editMemberOverride(other, root, { field: 'model', choice } as never, deps, pinned)).toMatchObject({ runtimeKind: 'codex_app_server', llmModelIdentifier: 'sol-6.1' })
    expect(editMemberOverride(other, root, { field: 'model', choice } as never, deps)).toBeNull()
    expect(normalizeMemberOverride(seeded, root, pinned)).toEqual(seeded)
    expect(normalizeMemberOverride(seeded, root)).toBeNull()
  })

  it('only a model, row or Reset all releases the pin', () => {
    expect(releasesMemberPin({ field: 'model' })).toBe(true)
    expect(releasesMemberPin({ field: 'all' })).toBe(true)
    expect(releasesMemberPin({ field: 'thinking' })).toBe(false)
    expect(releasesMemberPin({ field: 'approval' })).toBe(false)
    expect(resetMemberOverride(seeded, root, { field: 'model' }, deps, pinned)).toBeNull()
    expect(resetMemberOverride({ ...seeded, autoExecuteTools: false }, root, { field: 'approval' }, deps, pinned)).toEqual(seeded)
  })
})
