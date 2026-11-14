import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount, type VueWrapper } from '@vue/test-utils'
import ExistingRunSettings from '../ExistingRunSettings.vue'
import { collaborationDelegatedLaunchNodes, teamDelegatedLaunchNodes } from '~/utils/runSettings/delegatedLaunchRows'
import type { RunMemberNode } from '~/utils/runSettings/runMemberTree'
import type { TeamRunExecutionTreeDto } from '@autobyteus/team-stream-contracts'

vi.mock('~/composables/chat/useChatModelCatalog', () => ({ useChatModelCatalog: () => ({
  ensureCatalog: vi.fn(), schemaFor: () => null, modelLabel: (_runtimeKind: string, id: string) => id,
}) }))

/**
 * autobyteus-461 V-11 (CR-461-078, DCP-001, DCP-005): an edit is recorded as the user's own (`settings`) and shows no
 * origin, for an agent run and a team member; a member that follows its team, and a configured placement's member,
 * keep their team's origin; a member with no source recorded still says so.
 */
const created = '2026-11-01T00:00:00.000Z'
const claude = { runtime_kind: 'claude_agent_sdk' as const, llm_model_identifier: 'opus', llm_config: null, auto_execute_tools: false, workspace_root_path: '/w' }
const codex = { ...claude, runtime_kind: 'codex_app_server' as const, llm_model_identifier: 'sol-6.1' }
const settingsSource = { origin: 'settings' as const, fallbacks: [] }
const member = (address: string, extra: Record<string, unknown>) => ({ address, agent_definition_id: address.slice(4), launch_configuration: claude, ...extra })
const tree = (defaultSource: Record<string, unknown> | undefined): TeamRunExecutionTreeDto => ({
  created_at: created, archived_at: null, application_binding: null, handoffs: [],
  root_team: {
    address: '/', team_definition_id: 'pm', team_definition_name: 'PM', team_run_id: 'root', coordinator_address: '/pm',
    default_launch_configuration: claude, members: [],
    task_executions: [{
      kind: 'task_agent', address: '/writer', agent_run_id: 'writer-run', platform_agent_run_id: null, delegator_agent_run_id: 'pm-run', started_at: created,
      source: { kind: 'agent', agent_definition_id: 'writer', launch_configuration: codex, launch_source: settingsSource },
    }, {
      kind: 'task_team', address: '/se', team_run_id: 'se-copy', delegator_agent_run_id: 'pm-run', started_at: created, task_executions: [],
      members: ['/se/lead', '/se/edited', '/se/own', '/se/bare'].map((address) => ({ kind: 'task_team_agent' as const, address, agent_run_id: `${address.slice(4)}-run`, platform_agent_run_id: null })),
      source: {
        kind: 'agent_team', team_definition_id: 'se', coordinator_address: '/se/lead', handoffs: [], default_launch_configuration: claude,
        ...(defaultSource ? { default_launch_source: defaultSource } : {}),
        members: [
          member('/se/lead', { follows_team: true }),
          member('/se/edited', { launch_configuration: codex, follows_team: false, launch_source: settingsSource }),
          // A configured placement's member: its own launch, not following its team, with the team's recorded source.
          member('/se/own', { launch_configuration: codex, follows_team: false }),
          member('/se/bare', { follows_team: true }),
        ],
      },
    }],
  },
}) as TeamRunExecutionTreeDto
const deps = { schemaFor: () => null, sameWorkspace: () => true }
const root = { workspace: null, runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'opus', llmConfig: null, autoExecuteTools: false }
const subjectOf = (rows: readonly RunMemberNode[], key: string) => {
  const top = rows.find((row) => row.key === key)
  if (top) return { origin: 'delegated' as const, subject: top, group: null }
  const group = rows.find((row) => row.children.some((child) => child.key === key))!
  return { origin: 'delegated' as const, subject: group.children.find((child) => child.key === key)!, group }
}
let wrapper: VueWrapper | null = null
const sourceOf = (rows: readonly RunMemberNode[], key: string) => {
  wrapper?.unmount()
  wrapper = mount(ExistingRunSettings, { props: { kind: 'team', name: 'PM', isActive: false, canEdit: true, state: 'editable',
    stop: { label: 'Stop', pending: false, error: null }, root, subject: subjectOf(rows, key), dirty: false, canSave: false, saving: false, saved: false } })
  const card = wrapper.get('[data-test="existing-run-subject-card"]')
  const line = card.find('[data-test="run-subject-source"]')
  return { key: card.attributes('data-source'), text: line.exists() ? line.text() : '' }
}

beforeEach(() => setActivePinia(createPinia()))
afterEach(() => { wrapper?.unmount(); wrapper = null })

describe('Settings: an edit shows no origin (V-11)', () => {
  it('an edited agent run and an edited member show no origin; the edit is not the team\'s', () => {
    const rows = teamDelegatedLaunchNodes(tree({ origin: 'configured', fallbacks: [] }), deps)
    expect(sourceOf(rows, '/writer@writer-run')).toEqual({ key: 'settings', text: '' })
    expect(sourceOf(rows, '/se/edited@edited-run')).toEqual({ key: 'settings', text: '' })
  })

  it('a follower and a configured placement\'s member keep their team\'s origin', () => {
    const rows = teamDelegatedLaunchNodes(tree({ origin: 'configured', fallbacks: [] }), deps)
    expect(sourceOf(rows, '/se/lead@lead-run').key).toBe('configured')
    expect(sourceOf(rows, '/se/own@own-run').key).toBe('configured')
    expect(sourceOf(rows, '/se/own@own-run').text).not.toBe('')
  })

  it('a member with no source recorded (nor its team) still says "Not recorded"', () => {
    const rows = teamDelegatedLaunchNodes(tree(undefined), deps)
    expect(sourceOf(rows, '/se/bare@bare-run').key).toBe('not_recorded')
    expect(sourceOf(rows, '/se/bare@bare-run').text).not.toBe('')
  })

  it('the Org and Agent views\' rows (camel case) record the edit the same way', () => {
    const rows = collaborationDelegatedLaunchNodes({ taskExecutions: [{ address: '/writer', agentRunId: 'writer-run', platformAgentRunId: null, startedAt: created,
      source: { kind: 'agent', agentDefinitionId: 'writer', launchSource: { origin: 'settings', fallbacks: [] },
        launchConfiguration: { runtimeKind: 'codex_app_server', llmModelIdentifier: 'sol-6.1', llmConfig: null, autoExecuteTools: false, workspaceRootPath: '/w' } } }] }, deps)
    expect(sourceOf(rows, '/writer@writer-run')).toEqual({ key: 'settings', text: '' })
  })
})
