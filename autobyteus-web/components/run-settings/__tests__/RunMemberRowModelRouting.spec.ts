import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { RunMemberNode } from '~/utils/runSettings/runMemberTree'

const nav = vi.hoisted(() => ({ push: vi.fn(async () => undefined) }))
vi.mock('vue-router', () => ({ useRouter: () => nav }))
vi.mock('~/composables/chat/useChatModelCatalog', () => ({ useChatModelCatalog: () => ({
  ensureCatalog: vi.fn(), schemaFor: () => null, modelLabel: (_runtimeKind: string, id: string) => id,
}) }))

import RunMemberRow from '../RunMemberRow.vue'

/** autobyteus-32 VIS-016: a copy row the Model Router chose for, and a copy another node runs. */
const values = { workspace: null, runtimeKind: 'codex_app_server', llmModelIdentifier: 'gpt-sol', llmConfig: null, autoExecuteTools: true }
const node = (overrides: Partial<RunMemberNode>): RunMemberNode => ({
  key: '/se/ie@ie-run', kind: 'agent', name: 'ie', isCoordinator: false, values, parentValues: values, fields: ['model'],
  customized: {}, customizedOptionKeys: [], modelRequired: false, children: [], launchNotes: [], badge: 'delegated_copy', ...overrides,
})

describe('RunMemberRow with Model Routing (autobyteus-32)', () => {
  it('says "Model Router · <task kind>", shows the reason and opens the decision with View decision', async () => {
    const wrapper = mount(RunMemberRow, { props: { expandedKeys: new Set<string>(), node: node({
      sourceKey: 'model_router',
      routing: { decision: { runId: 'pm-run', copy: '/se', agent: '/se/ie' }, taskKind: 'implementation', reason: 'Codex fits a server change.' },
    }) } })
    expect(wrapper.get('[data-test="run-member-summary"]').text()).toMatch(/Model Router · implementation$/)
    expect(wrapper.get('[data-test="run-member-routing-reason"]').text()).toContain('Codex fits a server change.')
    await wrapper.get('[data-test="run-member-view-decision"]').trigger('click')
    expect(nav.push).toHaveBeenCalledWith({ path: '/settings', query: { section: 'model-routing', tab: 'decisions',
      decisionRun: 'pm-run', decisionCopy: '/se', decisionAgent: '/se/ie' } })
  })

  it('a copy another node runs shows its node and no View decision', () => {
    const wrapper = mount(RunMemberRow, { props: { expandedKeys: new Set<string>(), node: node({
      remoteNode: 'docker', sourceKey: 'model_router',
      routing: { decision: null, taskKind: 'writing', reason: 'Writing goes to Antigravity.' },
    }) } })
    expect(wrapper.text()).toContain('docker')
    expect(wrapper.find('[data-test="run-member-view-decision"]').exists()).toBe(false)
  })
})
