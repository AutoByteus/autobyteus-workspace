import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount, type VueWrapper } from '@vue/test-utils'
import ExistingRunSettings from '../ExistingRunSettings.vue'
import RunMemberRow from '../RunMemberRow.vue'
import { teamDelegatedLaunchNodes } from '~/utils/runSettings/delegatedLaunchRows'
import type { RunMemberNode } from '~/utils/runSettings/runMemberTree'
import type { TeamRunExecutionTreeDto } from '@autobyteus/team-stream-contracts'

vi.mock('~/composables/chat/useChatModelCatalog', () => ({ useChatModelCatalog: () => ({
  ensureCatalog: vi.fn(), schemaFor: () => null, modelLabel: (_runtimeKind: string, id: string) => id,
}) }))

/**
 * REQ-007 / AC-010 refined by SR-006: Settings shows delegated copies with the
 * read-only member rows, collapsed until opened, the same for a running and a stopped run.
 */
const created = '2026-10-12T00:00:00.000Z'
const claude = { runtime_kind: 'claude_agent_sdk' as const, llm_model_identifier: 'opus', llm_config: null, auto_execute_tools: false, workspace_root_path: '/w' }
const codex = { ...claude, runtime_kind: 'codex_app_server' as const, llm_model_identifier: 'sol-6.1' }
const tree: TeamRunExecutionTreeDto = {
  created_at: created, archived_at: null, application_binding: null, handoffs: [],
  root_team: {
    address: '/', team_definition_id: 'pm', team_definition_name: 'PM', team_run_id: 'root', coordinator_address: '/pm',
    default_launch_configuration: claude, members: [],
    task_executions: [{
      kind: 'task_agent', address: '/writer', agent_run_id: 'writer-run', platform_agent_run_id: null, delegator_agent_run_id: 'pm-run', started_at: created,
      source: { kind: 'agent', agent_definition_id: 'writer', launch_configuration: codex, launch_source: { origin: 'agent_default', fallbacks: [] } },
    }, {
      kind: 'task_team', address: '/se', team_run_id: 'se-copy', delegator_agent_run_id: 'pm-run', started_at: created, task_executions: [],
      members: [
        { kind: 'task_team_agent', address: '/se/lead', agent_run_id: 'lead-run', platform_agent_run_id: null },
        { kind: 'task_team_agent', address: '/se/cr', agent_run_id: 'cr-run', platform_agent_run_id: null },
      ],
      source: {
        kind: 'agent_team', team_definition_id: 'se', coordinator_address: '/se/lead', handoffs: [], default_launch_configuration: claude,
        default_launch_source: { origin: 'inherited', fallbacks: [{ layer: 'team_default', runtime_kind: 'grok_build', llm_model_identifier: 'grok-4', reason: 'runtime_unavailable', detail: 'no grok' }] },
        members: [
          { address: '/se/lead', agent_definition_id: 'lead' },
          { address: '/se/cr', agent_definition_id: 'cr', launch_source: { origin: 'inherited', fallbacks: [{ layer: 'agent_default', runtime_kind: 'codex_app_server', llm_model_identifier: 'sol-6.1', reason: 'runtime_unavailable', detail: 'no codex' }] } },
        ],
      },
    }],
  },
}
const nodes = (): RunMemberNode[] => teamDelegatedLaunchNodes(tree, [], { schemaFor: () => null, sameWorkspace: () => true })
const root = { workspace: null, runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'opus', llmConfig: null, autoExecuteTools: false }
const settings = (isActive: boolean) => mount(ExistingRunSettings, { props: {
  kind: 'team', name: 'PM', isActive, canEdit: !isActive, state: isActive ? 'read_only' : 'editable',
  stop: { label: 'Stop', pending: false, error: null }, root, delegated: nodes(),
  dirty: false, canSave: false, saving: false, saved: false,
} })
const section = (wrapper: VueWrapper) => wrapper.get('[data-test="run-delegated-launches"]')
const row = (wrapper: VueWrapper, key: string) => section(wrapper).get(`[data-test="run-member-${key}"]`)

let wrapper: VueWrapper | null = null
beforeEach(() => setActivePinia(createPinia()))
afterEach(() => { wrapper?.unmount(); wrapper = null })

describe('Settings: delegated copies (SR-006)', () => {
  it('lists one collapsed row per copy, with its badge, source and a note count on a collapsed Team', () => {
    wrapper = settings(false)
    expect(section(wrapper).findAll('[data-test="run-member-detail"]')).toHaveLength(0)
    const writer = row(wrapper, '/writer@writer-run')
    expect(writer.attributes('data-source')).toBe('agent_default')
    expect(writer.find('[data-test="run-member-badge"]').exists()).toBe(true)
    // The Members summary (model · runtime · approval), then the source.
    const writerSummary = writer.get('[data-test="run-member-summary"]').text()
    expect(writerSummary).toContain('sol-6.1')
    expect(writerSummary.indexOf('sol-6.1')).toBeLessThan(writerSummary.lastIndexOf('·'))
    const team = row(wrapper, '/se@se-copy')
    expect(team.get('[data-test="run-member-note-count"]').text()).toContain('2')
    // The Team's agents stay hidden until the Team is opened.
    expect(section(wrapper).find('[data-test="run-member-/se/lead@lead-run"]').exists()).toBe(false)
    expect(section(wrapper).findAll('[data-test="run-member-reset"]')).toHaveLength(0)
  })

  it('a Team opens to its own note once and its agents; an agent opens to its read-only settings card', async () => {
    wrapper = settings(false)
    await row(wrapper, '/se@se-copy').get('[data-test="run-member-toggle"]').trigger('click')
    const team = row(wrapper, '/se@se-copy')
    expect(team.find('[data-test="run-member-note-count"]').exists()).toBe(false)
    const teamNotes = team.findAll('[data-test="run-member-launch-note"]')
      .filter((note) => note.element.closest('[data-source]') === team.element)
    expect(teamNotes.map((note) => note.text())).toEqual([expect.stringContaining('no grok')])
    // Like the run's own Members: the Team's read-only settings card, then its agents (the coordinator with its chip).
    expect(team.find('[data-test="run-settings-card-/se@se-copy"]').exists()).toBe(true)
    expect(row(wrapper, '/se/lead@lead-run').text()).toContain('Coordinator')
    expect(row(wrapper, '/se/cr@cr-run').text()).not.toContain('Coordinator')
    const lead = row(wrapper, '/se/lead@lead-run')
    expect(lead.findAll('[data-test="run-member-launch-note"]')).toHaveLength(0)
    expect(row(wrapper, '/se/cr@cr-run').get('[data-test="run-member-launch-note"]').text()).toContain('no codex')
    expect(lead.find('[data-test="run-member-detail"]').exists()).toBe(false)
    await lead.get('[data-test="run-member-toggle"]').trigger('click')
    const card = row(wrapper, '/se/lead@lead-run').get('[data-test="run-settings-card-/se/lead@lead-run"]')
    expect(card.findAll('[data-test="run-setting-locked"]').length).toBeGreaterThan(0)
  })

  it('renders the same collapsed rows for a running and a stopped run', () => {
    const shape = (w: VueWrapper) => section(w).findAll('[data-source]').map((el) => [el.attributes('data-test'), el.attributes('data-source')])
    const running = settings(true)
    const stopped = settings(false)
    expect(shape(running)).toEqual(shape(stopped))
    expect(section(running).findAll('[data-test="run-member-detail"]')).toHaveLength(0)
    running.unmount(); stopped.unmount()
  })
})

describe('RunMemberRow launch note (AC-011)', () => {
  it('shows why a member\'s own default is not used', () => {
    const values = { workspace: null, runtimeKind: 'autobyteus', llmModelIdentifier: 'm', llmConfig: null, autoExecuteTools: true }
    const node: RunMemberNode = {
      key: '/cr', kind: 'agent', name: 'cr', isCoordinator: false, values, parentValues: values, fields: ['model'],
      customized: {}, customizedOptionKeys: [], modelRequired: false, children: [],
      launchNotes: [{ kind: 'unusable_default', runtimeKind: 'grok_build', llmModelIdentifier: 'grok-4', reason: 'runtime_unavailable' }],
    }
    wrapper = mount(RunMemberRow, { props: { node, expandedKeys: new Set<string>() } })
    expect(wrapper.get('[data-test="run-member-launch-note"]').text()).toContain('grok-4')
    expect(wrapper.get('[data-test="run-member-launch-note"]').text()).toContain('the runtime is not available')
  })
})

describe('Settings: stop and change a copy (SR-007)', () => {
  const runningRows = (live: readonly string[]) => teamDelegatedLaunchNodes(tree, [], { schemaFor: () => null, sameWorkspace: () => true }, {
    editable: true, isAgentLive: (id) => live.includes(id), isStopping: () => false, draftOf: () => null,
  })
  const mounted = (delegated: RunMemberNode[]) => mount(ExistingRunSettings, { props: {
    kind: 'team', name: 'PM', isActive: true, canEdit: false, state: 'read_only',
    stop: { label: 'Stop', pending: false, error: null }, root, delegated,
    dirty: false, canSave: false, saving: false, saved: false,
  } })

  it('a running copy has the run\'s stop icon on its own row (not on its Team members) and its model stays locked', async () => {
    wrapper = mounted(runningRows(['lead-run']))
    const team = row(wrapper, '/se@se-copy')
    expect(team.find('[data-test="run-member-stop"]').exists()).toBe(true)
    expect(row(wrapper, '/writer@writer-run').find('[data-test="run-member-stop"]').exists()).toBe(false)
    await team.get('[data-test="run-member-stop"]').trigger('click')
    expect(wrapper.emitted('stop-delegated')).toEqual([[{ teamRunId: 'se-copy' }]])
    await team.get('[data-test="run-member-toggle"]').trigger('click')
    const opened = row(wrapper, '/se@se-copy')
    expect(opened.find('[data-test="run-member-stop-hint"]').exists()).toBe(true)
    expect(opened.get('[data-test="run-settings-card-/se@se-copy"] [data-test="run-setting-model"]').find('[data-test="run-setting-locked"]').exists()).toBe(true)
    expect(row(wrapper, '/se/lead@lead-run').find('[data-test="run-member-stop"]').exists()).toBe(false)
  })

  it('a stopped copy\'s model is editable like a stopped run\'s member; runtime and approval stay locked', async () => {
    wrapper = mounted(runningRows([]))
    await row(wrapper, '/writer@writer-run').get('[data-test="run-member-toggle"]').trigger('click')
    const card = row(wrapper, '/writer@writer-run').get('[data-test="run-settings-card-/writer@writer-run"]')
    expect(card.get('[data-test="run-setting-model"]').find('[data-test="run-setting-locked"]').exists()).toBe(false)
    expect(card.get('[data-test="run-setting-approval"]').find('[data-test="run-setting-locked"]').exists()).toBe(true)
    expect(row(wrapper, '/writer@writer-run').find('[data-test="run-member-stop"]').exists()).toBe(false)
    expect(row(wrapper, '/writer@writer-run').find('[data-test="run-member-stop-hint"]').exists()).toBe(false)
    // No separate Reset for a copy's choice (SR-007).
    expect(section(wrapper).findAll('[data-test="run-member-reset"]')).toHaveLength(0)
  })
})
