import { createHash } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed, defineComponent, h, ref } from 'vue'
import type { AgentOrgExecutionViewDto } from '@autobyteus/collaboration-stream-contracts'
import { AgentOrgExecutionContext } from '~/services/agentOrgExecution/agentOrgExecutionContext'
import { AgentContext } from '~/types/agent/AgentContext'
import { AgentRunState } from '~/types/agent/AgentRunState'
import { parseAgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import CollaborationMessagesSection from '../CollaborationMessagesSection.vue'

// Real Org root: real AgentOrgExecutionContext, real perspective projection and the real
// crypto-js hash, counted. Only presentation leaves (icon, Markdown, file viewer) are stubbed.
const counters = vi.hoisted(() => ({ hashes: 0, projections: 0 }))

vi.mock('crypto-js/sha256', async (importOriginal) => {
  const real = (await importOriginal<typeof import('crypto-js/sha256')>()).default
  return { default: (...args: Parameters<typeof real>) => { counters.hashes += 1; return real(...args) } }
})
vi.mock('~/services/agentOrgExecution/agentOrgCommunicationPerspective', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/services/agentOrgExecution/agentOrgCommunicationPerspective')>()
  return {
    ...actual,
    projectAgentOrgCommunicationPerspective: (...args: Parameters<typeof actual.projectAgentOrgCommunicationPerspective>) => {
      counters.projections += 1
      return actual.projectAgentOrgCommunicationPerspective(...args)
    },
  }
})

const PREVIEW = 20
const REFS_PER_MESSAGE = 3_000
const HISTORY_MESSAGES = 14 // 42,000 references for each of the two focused members
const launch = {
  runtimeKind: 'codex_app_server' as const, llmModelIdentifier: 'gpt-5.6-sol', llmConfig: null,
  autoExecuteTools: false, workspaceRootPath: null,
}
const agent = (address: string, agentRunId: string) => ({
  address, agentDefinitionId: `${agentRunId}-def`, role: null, description: null,
  agentRunId, platformAgentRunId: null, launchConfiguration: launch,
})
const idle = (member_address: string, agent_run_id: string) => ({
  member_address, agent_run_id, status: 'idle' as const, trigger: null, tool_name: null,
  error_message: null, error_details: null, recoverableBlock: null,
})
const referencePaths = (messageIndex: number) =>
  Array.from({ length: REFS_PER_MESSAGE }, (_, index) => `/repo/m${messageIndex}/file-${index}.ts`)
const timestamp = (minute: number) => new Date(Date.UTC(2026, 9, 1, 10, minute)).toISOString()
const message = (index: number, senderAgentRunId: string, receiverAgentRunId: string, referenceFiles: string[]) => ({
  messageId: `message-${index}`, senderAgentRunId, receiverAgentRunId,
  content: `Handoff ${index}`, messageType: 'handoff', referenceFiles, createdAt: timestamp(index),
})

const largeOrgView = (): AgentOrgExecutionViewDto => ({
  base_change_sequence: 4,
  is_active: true,
  execution_tree: {
    subjectKind: 'agent_org', createdAt: timestamp(0), archivedAt: null, applicationBinding: null, handoffs: [],
    rootOrg: {
      collaborators: [], address: '/', orgDefinitionId: 'org-def', orgDefinitionName: 'Org', orgRunId: 'org-run',
      defaultLaunchConfiguration: launch, taskExecutions: [],
      members: [agent('/designer', 'agent-designer'), agent('/reviewer', 'agent-reviewer'), agent('/tester', 'agent-tester')],
    },
  },
  communication_messages: {
    schemaVersion: 1, subjectKind: 'agent_org', orgRunId: 'org-run',
    messages: [
      ...Array.from({ length: HISTORY_MESSAGES }, (_, index) => index % 2
        ? message(index + 1, 'agent-reviewer', 'agent-designer', referencePaths(index + 1))
        : message(index + 1, 'agent-designer', 'agent-reviewer', referencePaths(index + 1))),
      message(HISTORY_MESSAGES + 1, 'agent-tester', 'agent-reviewer', []),
    ],
  },
  agent_input_states: [],
  agent_statuses: [idle('/designer', 'agent-designer'), idle('/reviewer', 'agent-reviewer'), idle('/tester', 'agent-tester')],
})
const agentContext = (runId: string) => new AgentContext({
  agentDefinitionId: `${runId}-def`, agentDefinitionName: runId, llmModelIdentifier: launch.llmModelIdentifier,
  runtimeKind: launch.runtimeKind, workspaceId: null, workspaceMetadata: null, autoExecuteTools: false,
  isLocked: true, llmConfig: null,
}, new AgentRunState(runId, {
  id: runId, messages: [], createdAt: timestamp(0), updatedAt: timestamp(0),
  agentDefinitionId: `${runId}-def`, agentName: runId, llmModelIdentifier: launch.llmModelIdentifier,
}))
const serverReferenceId = (messageId: string, path: string) =>
  createHash('sha256').update(`${messageId}\0${path}`).digest('hex')

// Mirrors production: the store keeps the Org context in a deep ref and the right panel reads
// `selectedTarget().collaborationMessages` reactively (activeContextStore → RightSideTabs).
const mountOrgMessages = () => {
  const store = ref<Record<string, AgentOrgExecutionContext>>({})
  store.value['org-run'] = new AgentOrgExecutionContext({
    orgRunId: 'org-run', view: largeOrgView(),
    entries: ['designer', 'reviewer', 'tester'].map((name) => ({
      agentRunId: `agent-${name}`, memberAddress: parseAgentTeamAddress(`/${name}`), context: agentContext(`agent-${name}`),
    })),
  })
  const org = () => store.value['org-run']
  org().select('/reviewer')
  const messages = computed(() => org().selectedTarget()!.collaborationMessages)
  const Host = defineComponent({ setup: () => () => h(CollaborationMessagesSection, { messages: messages.value }) })
  const wrapper = mount(Host, {
    global: {
      stubs: {
        Icon: { props: ['icon'], template: '<span :data-icon="icon"></span>' },
        MarkdownRenderer: { props: ['content'], template: '<article>{{ content }}</article>' },
        CollaborationMessageReferenceViewer: { props: ['contentPath', 'reference'], template: '<div data-test="reference-viewer">{{ contentPath }}</div>' },
      },
      mocks: { $t: (key: string) => key.endsWith('messages_count') ? 'Messages' : key },
    },
  })
  return { wrapper, org }
}
const referenceRows = (wrapper: ReturnType<typeof mountOrgMessages>['wrapper']) =>
  wrapper.findAll('[data-test="team-communication-reference-row"]')
const messageRows = (wrapper: ReturnType<typeof mountOrgMessages>['wrapper']) =>
  wrapper.findAll('[data-test="team-communication-message-row"]')
const header = (wrapper: ReturnType<typeof mountOrgMessages>['wrapper']) =>
  wrapper.get('[data-test="collaboration-messages-header"]').text()
const resetCounters = () => { counters.hashes = 0; counters.projections = 0 }

describe('Collaboration messages on a large Agent Org root', () => {
  beforeEach(resetCounters)

  it('projects once and hashes only the displayed preview on mount and on a member switch (42,000 references)', async () => {
    const { wrapper, org } = mountOrgMessages()
    await wrapper.vm.$nextTick()
    expect(header(wrapper)).toContain('15 Messages')
    expect(messageRows(wrapper)).toHaveLength(HISTORY_MESSAGES + 1)
    expect(wrapper.findAll('[data-test="team-communication-reference-count"]')).toHaveLength(HISTORY_MESSAGES)
    expect(referenceRows(wrapper)).toHaveLength(0) // newest message (from tester) has no files
    expect(counters.projections).toBe(1)
    expect(counters.hashes).toBe(0)

    resetCounters()
    org().select('/designer')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    expect(header(wrapper)).toContain('14 Messages')
    expect(messageRows(wrapper)[0].classes()).toContain('border-blue-500')
    expect(messageRows(wrapper)[0].get('[data-test="team-communication-reference-count"]').text()).toContain('3,000')
    expect(referenceRows(wrapper)).toHaveLength(PREVIEW)
    expect(counters.projections).toBe(1)
    expect(counters.hashes).toBe(PREVIEW)
  })

  it('reveals and opens the last reference with the server identity; switching member collapses the list', async () => {
    const { wrapper, org } = mountOrgMessages()
    org().select('/designer')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    await wrapper.get('[data-test="team-communication-show-all-references"]').trigger('click')
    const rows = referenceRows(wrapper)
    expect(rows).toHaveLength(REFS_PER_MESSAGE)
    resetCounters()
    await rows[REFS_PER_MESSAGE - 1].trigger('click')
    const lastPath = `/repo/m${HISTORY_MESSAGES}/file-${REFS_PER_MESSAGE - 1}.ts`
    expect(wrapper.get('[data-test="reference-viewer"]').text()).toBe(
      `agent-org-runs/org-run/communication/messages/message-${HISTORY_MESSAGES}/references/${serverReferenceId(`message-${HISTORY_MESSAGES}`, lastPath)}/content`)
    expect(counters.hashes).toBe(0) // already derived for the rendered row; memoized

    // The newest designer message is shared with reviewer: it stays selected, Show all collapses.
    org().select('/reviewer')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    expect(referenceRows(wrapper).length).toBeLessThanOrEqual(PREVIEW)
  })

  it('applies a live communication message with one projection and identity work bounded by the visible rows', async () => {
    const { wrapper, org } = mountOrgMessages()
    org().select('/designer')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    resetCounters()
    expect(org().applyEvent(5, { kind: 'communication',
      message: message(HISTORY_MESSAGES + 2, 'agent-reviewer', 'agent-designer', ['/repo/live/new.md']) }))
      .toBe('applied')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    expect(header(wrapper)).toContain('15 Messages')
    expect(messageRows(wrapper)[0].text()).toContain(`Handoff ${HISTORY_MESSAGES + 2}`)
    expect(messageRows(wrapper)[1].classes()).toContain('border-blue-500') // selection kept
    expect(referenceRows(wrapper)).toHaveLength(PREVIEW)
    expect(counters.projections).toBe(1)
    expect(counters.hashes).toBeLessThanOrEqual(PREVIEW)

    // Expanded list on the selected message survives the arrival (same message).
    await wrapper.get('[data-test="team-communication-show-all-references"]').trigger('click')
    expect(referenceRows(wrapper)).toHaveLength(REFS_PER_MESSAGE)
    resetCounters()
    org().applyEvent(6, { kind: 'communication',
      message: message(HISTORY_MESSAGES + 3, 'agent-designer', 'agent-tester', []) })
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    expect(header(wrapper)).toContain('16 Messages')
    expect(referenceRows(wrapper)).toHaveLength(REFS_PER_MESSAGE)
    expect(counters.projections).toBe(1)
    expect(counters.hashes).toBeLessThanOrEqual(REFS_PER_MESSAGE) // only the selected message's visible rows
  })
})
