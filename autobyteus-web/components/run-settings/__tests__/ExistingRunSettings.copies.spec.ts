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
 * REQ-007 / AC-010 refined by SR-006; autobyteus-366: a delegated copy's settings show on its own card when it is
 * focused, with the facts its row showed (badge, source, notes); a Team copy's other agents are one switch away.
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
          { address: '/se/lead', agent_definition_id: 'lead', launch_configuration: claude, follows_team: true },
          { address: '/se/cr', agent_definition_id: 'cr', launch_configuration: claude, follows_team: true, launch_source: { origin: 'inherited', fallbacks: [{ layer: 'agent_default', runtime_kind: 'codex_app_server', llm_model_identifier: 'sol-6.1', reason: 'runtime_unavailable', detail: 'no codex' }] } },
        ],
      },
    }],
  },
}
const nodes = (): RunMemberNode[] => teamDelegatedLaunchNodes(tree, [], { schemaFor: () => null, sameWorkspace: () => true })
const root = { workspace: null, runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'opus', llmConfig: null, autoExecuteTools: false }
type Subject = Readonly<{ origin: 'delegated'; subject: RunMemberNode; group: RunMemberNode | null }>
const copyOf = (rows: readonly RunMemberNode[], key: string): Subject => {
  const top = rows.find((row) => row.key === key)
  if (top) return { origin: 'delegated', subject: top, group: null }
  const group = rows.find((row) => row.children.some((child) => child.key === key))!
  return { origin: 'delegated', subject: group.children.find((child) => child.key === key)!, group }
}
const settings = (subject: Subject, extra: Record<string, unknown> = {}) => mount(ExistingRunSettings, { props: {
  kind: 'team', name: 'PM', isActive: false, canEdit: true, state: 'editable',
  stop: { label: 'Stop', pending: false, error: null }, root, subject,
  dirty: false, canSave: false, saving: false, saved: false, ...extra,
} })
const card = (wrapper: VueWrapper) => wrapper.get('[data-test="existing-run-subject-card"]')
const row = (wrapper: VueWrapper, key: string) => wrapper.get(`[data-test="run-member-${key}"]`)

let wrapper: VueWrapper | null = null
beforeEach(() => setActivePinia(createPinia()))
afterEach(() => { wrapper?.unmount(); wrapper = null })

describe('Settings: a focused delegated copy (SR-006, autobyteus-366)', () => {
  it('shows one card with its badge and source, and no list of copies or switch', () => {
    wrapper = settings(copyOf(nodes(), '/writer@writer-run'))
    expect(wrapper.get('[data-test="run-subject-header"]').text()).toContain('writer')
    expect(wrapper.find('[data-test="run-member-badge"]').exists()).toBe(true)
    expect(card(wrapper).attributes('data-source')).toBe('agent_default')
    expect(card(wrapper).get('[data-test="run-subject-source"]').text()).toBe('Agent default')
    expect(card(wrapper).get('[data-test="run-settings-card-subject"]').text()).toContain('sol-6.1')
    expect(wrapper.find('[data-test="run-members"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="existing-run-root-card"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="run-settings-switch"]').exists()).toBe(false)
  })

  it('a Team copy\'s member shows its own card and note, names its Team, and switches to the Team and its agents', async () => {
    const subject = copyOf(nodes(), '/se/cr@cr-run')
    wrapper = settings(subject)
    expect(wrapper.find('[data-test="run-subject-group"]').exists()).toBe(true)
    expect(card(wrapper).get('[data-test="run-member-launch-note"]').text()).toContain('no codex')
    expect(wrapper.find('[data-test="run-members"]').exists()).toBe(false)

    await wrapper.setProps({ showGroup: true })
    // Like the run's own Members: the Team's card with its own note once, then its agents (the coordinator with its chip).
    expect(wrapper.get('[data-test="run-subject-header"]').text()).toContain(subject.group!.name)
    expect(card(wrapper).findAll('[data-test="run-member-launch-note"]').map((note) => note.text())).toEqual([expect.stringContaining('no grok')])
    expect(row(wrapper, '/se/lead@lead-run').text()).toContain('Coordinator')
    expect(row(wrapper, '/se/cr@cr-run').text()).not.toContain('Coordinator')
    expect(row(wrapper, '/se/lead@lead-run').find('[data-test="run-member-detail"]').exists()).toBe(false)
    await row(wrapper, '/se/lead@lead-run').get('[data-test="run-member-toggle"]').trigger('click')
    const opened = row(wrapper, '/se/lead@lead-run').get('[data-test="run-settings-card-/se/lead@lead-run"]')
    expect(opened.findAll('[data-test="run-setting-locked"]').length).toBeGreaterThan(0)
    expect(wrapper.findAll('[data-test="run-member-reset"]')).toHaveLength(0)
  })

  it('the switch asks for the group and back', async () => {
    wrapper = settings(copyOf(nodes(), '/se/lead@lead-run'))
    const toGroup = wrapper.get('[data-test="run-settings-switch-group"]')
    expect(toGroup.text()).toBe('Team settings')
    await toGroup.trigger('click')
    await wrapper.get('[data-test="run-settings-switch-agent"]').trigger('click')
    expect(wrapper.emitted('update:show-group')).toEqual([[true], [false]])
  })

  it('edits route to the copy that is shown', async () => {
    const subject = copyOf(nodes(), '/se/lead@lead-run')
    wrapper = settings(subject, { showGroup: true })
    wrapper.getComponent({ name: 'RunSubjectCard' }).vm.$emit('change', { field: 'thinking', llmConfig: null })
    expect(wrapper.emitted('change-delegated')).toEqual([['/se@se-copy', { field: 'thinking', llmConfig: null }]])
    expect(wrapper.emitted('change-member')).toBeUndefined()
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
  const running = (subject: Subject) => settings(subject, { isActive: true, canEdit: false, state: 'read_only', subjectActive: Boolean(subject.subject.delegated?.running) })

  it('a running copy\'s header stops that copy, not the run; its model stays locked and says why', async () => {
    wrapper = running(copyOf(runningRows(['writer-run']), '/writer@writer-run'))
    expect(wrapper.get('[data-test="run-subject-status"]').attributes('data-status')).toBe('active')
    expect(wrapper.find('[data-test="existing-run-stop"]').exists()).toBe(false)
    await wrapper.get('[data-test="run-member-stop"]').trigger('click')
    expect(wrapper.emitted('stop-delegated')).toEqual([[{ agentRunId: 'writer-run' }]])
    expect(wrapper.emitted('stop')).toBeUndefined()
    expect(card(wrapper).find('[data-test="run-member-stop-hint"]').exists()).toBe(true)
    expect(card(wrapper).get('[data-test="run-setting-model"]').find('[data-test="run-setting-locked"]').exists()).toBe(true)
  })

  it('a running Team copy\'s member: the header stops its Team copy (never one member)', async () => {
    wrapper = running(copyOf(runningRows(['lead-run']), '/se/cr@cr-run'))
    expect(wrapper.get('[data-test="run-member-stop"]').attributes('title')).toContain('se')
    await wrapper.get('[data-test="run-member-stop"]').trigger('click')
    expect(wrapper.emitted('stop-delegated')).toEqual([[{ teamRunId: 'se-copy' }]])
  })

  it('a stopped copy\'s model is editable while the run runs; approval stays locked, no stop and no hint', () => {
    wrapper = running(copyOf(runningRows([]), '/writer@writer-run'))
    expect(wrapper.get('[data-test="run-subject-status"]').attributes('data-status')).toBe('stopped')
    expect(card(wrapper).get('[data-test="run-setting-model"]').find('[data-test="run-setting-locked"]').exists()).toBe(false)
    expect(card(wrapper).get('[data-test="run-setting-approval"]').find('[data-test="run-setting-locked"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="run-member-stop"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="run-member-stop-hint"]').exists()).toBe(false)
  })

  it('a remote copy is read-only with its node chip, and has no stop', () => {
    const values = { workspace: null, runtimeKind: 'codex_app_server', llmModelIdentifier: 'sol', llmConfig: null, autoExecuteTools: true }
    const locked = { workspace: true, model: true, thinking: true, approval: true }
    const remote = { key: '/publisher@docker', kind: 'agent', name: 'publisher', agentRunId: 'remote-run', isCoordinator: false, values, parentValues: values,
      fields: ['model', 'approval'], customized: {}, customizedOptionKeys: [], modelRequired: false, launchNotes: [], children: [], locked, remoteNode: 'docker', badge: 'delegated_copy' } as unknown as RunMemberNode
    wrapper = settings({ origin: 'delegated', subject: remote, group: null }, { isActive: true, state: 'read_only', canEdit: false })
    expect(wrapper.get('[data-test="run-subject-details"]').text()).toContain('docker')
    expect(card(wrapper).get('[data-test="run-setting-model"]').find('[data-test="run-setting-locked"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="run-member-stop"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="existing-run-stop"]').exists()).toBe(false)
  })
})
