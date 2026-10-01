import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, nextTick, ref, type Ref } from 'vue'
import { mount } from '@vue/test-utils'
import { useChatRouteRunSync } from '../useChatRouteRunSync'
import { useAgentContextsStore } from '~/stores/agentContextsStore'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import { AgentContext } from '~/types/agent/AgentContext'
import { AgentRunState } from '~/types/agent/AgentRunState'

const buildContext = (runId: string) => new AgentContext({
  agentDefinitionId: 'a', agentDefinitionName: 'A', llmModelIdentifier: 'm', runtimeKind: 'autobyteus',
  workspaceId: null, workspaceMetadata: null, autoExecuteTools: true, isLocked: false,
}, new AgentRunState(runId, { id: runId, messages: [], createdAt: '', updatedAt: '', agentDefinitionId: 'a' }))

describe('useChatRouteRunSync', () => {
  beforeEach(() => setActivePinia(createPinia()))

  const mountSync = (routeRunId: Ref<string | null>) => {
    const replace = vi.fn((runId: string) => { routeRunId.value = runId })
    mount(defineComponent({ setup() { useChatRouteRunSync({ routeRunId, replaceRouteRunId: replace }); return () => h('div') } }))
    return replace
  }

  it('replaces the route when the displayed temp context is promoted', async () => {
    const contexts = useAgentContextsStore()
    contexts.registerDraftRun(buildContext('temp-1'))
    const routeRunId = ref<string | null>('temp-1')
    const replace = mountSync(routeRunId)
    await nextTick()

    contexts.promoteTemporaryId('temp-1', 'run-9')
    await nextTick()

    expect(replace).toHaveBeenCalledWith('run-9')
  })

  it('ignores selection changes that are not a promotion of the displayed context', async () => {
    const contexts = useAgentContextsStore()
    contexts.registerDraftRun(buildContext('temp-1'))
    contexts.runs.set('run-2', buildContext('run-2'))
    const routeRunId = ref<string | null>('temp-1')
    const replace = mountSync(routeRunId)
    await nextTick()

    useAgentSelectionStore().selectRunWithoutShellNavigation('run-2', 'agent')
    await nextTick()

    expect(replace).not.toHaveBeenCalled()
  })
})
