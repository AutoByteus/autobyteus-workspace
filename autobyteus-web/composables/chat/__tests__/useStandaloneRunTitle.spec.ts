import { describe, expect, it, vi } from 'vitest'
import { reactive, ref } from 'vue'
import { useStandaloneRunTitle } from '../useStandaloneRunTitle'

const historyStore = reactive({ workspaceGroups: [] as any[] })
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => historyStore }))

const PACKET = 'You have a new task from Planner on node alpha.\n\nTask: Write the report'

const setStoredTitle = (summary: string) => {
  historyStore.workspaceGroups = [{
    workspaceRootPath: '/ws',
    workspaceName: 'ws',
    teamDefinitions: [],
    agentDefinitions: [{ agentDefinitionId: 'agent', agentName: 'Agent', runs: [{ runId: 'run-1', summary }] }],
  }]
}

const contextWithFirstUserMessage = (text: string) => ref({
  state: {
    runId: 'run-1',
    conversation: { messages: [{ type: 'user', text, timestamp: new Date(0), contextFilePaths: [] }] },
  },
} as any)

describe('useStandaloneRunTitle', () => {
  it('shows the stored title of a peer-started run, not the work packet in its conversation', () => {
    setStoredTitle('Write the report')
    const { fullTitle, title } = useStandaloneRunTitle(contextWithFirstUserMessage(PACKET))
    expect(fullTitle.value).toBe('Write the report')
    expect(title.value).toBe('Write the report')
  })

  it('uses the live first user message while the run has no stored title yet', () => {
    setStoredTitle('   ')
    const { fullTitle } = useStandaloneRunTitle(
      contextWithFirstUserMessage('Use the writer skill for this request.\n\nDraft a note'),
    )
    expect(fullTitle.value).toBe('Draft a note')
  })

  it('reads a skill-tagged stored title without the instruction, as the live summary does', () => {
    setStoredTitle('Use the writer skill for this request. Draft a note')
    const { fullTitle } = useStandaloneRunTitle(
      contextWithFirstUserMessage('Use the writer skill for this request.\n\nDraft a note'),
    )
    expect(fullTitle.value).toBe('Draft a note')
  })

  it('is null without a context', () => {
    setStoredTitle('Write the report')
    expect(useStandaloneRunTitle(ref(null)).fullTitle.value).toBeNull()
  })
})
