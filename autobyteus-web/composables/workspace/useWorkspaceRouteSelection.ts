import { ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter, type RouteLocationNormalizedLoaded } from 'vue-router'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import {
  createWorkspaceExecutionLinkSignature,
  openWorkspaceExecutionLink,
  parseWorkspaceExecutionLinkQuery,
  stripWorkspaceExecutionLinkQuery,
} from '~/services/workspace/workspaceNavigationService'

// Only navigation identity, never incidental active/history mode or context publication.
const selectionRouteKey = (route: Pick<RouteLocationNormalizedLoaded, 'path' | 'query'>): string => {
  const q = route.query
  return JSON.stringify([route.path, q.rootSubjectKind, q.definitionId, q.orgRunId,
    q.memberAddress, q.agentRunId, q.mode === 'configuration',
    q.workspaceExecutionKind, q.workspaceExecutionRunId, q.workspaceExecutionAgentRunId])
}

export const useWorkspaceRouteSelection = () => {
  const route = useRoute()
  const router = useRouter()
  const selection = useAgentSelectionStore()
  const applyingSelection = ref(false)
  const lastHandledSignature = ref<string | null>(null)

  onBeforeRouteLeave(() => { selection.invalidateSelectionIntent() })
  onBeforeRouteUpdate((to, from) => {
    if (selectionRouteKey(to) !== selectionRouteKey(from)) selection.invalidateSelectionIntent()
  })

  const applyRouteSelection = async (): Promise<void> => {
    const link = parseWorkspaceExecutionLinkQuery(route.query)
    if (!link) { lastHandledSignature.value = null; return }
    const signature = createWorkspaceExecutionLinkSignature(link)
    if (lastHandledSignature.value === signature) return

    const intent = selection.beginSelectionIntent()
    const path = route.path
    applyingSelection.value = true
    lastHandledSignature.value = signature
    const stopWatching = watch(intent.isCurrent, (current) => {
      if (!current) applyingSelection.value = false
    }, { flush: 'sync' })
    try {
      const result = await openWorkspaceExecutionLink(link, intent)
      if (result.disposition === 'superseded' || !intent.isCurrent()) return
    } catch (error) {
      if (!intent.isCurrent()) return
      console.error('Failed to open workspace execution link:', error)
    } finally {
      stopWatching()
      if (intent.isCurrent()) {
        applyingSelection.value = false
        const current = parseWorkspaceExecutionLinkQuery(route.query)
        if (route.path === path && current && createWorkspaceExecutionLinkSignature(current) === signature) {
          await router.replace({ path, query: stripWorkspaceExecutionLinkQuery(route.query) })
        }
      }
    }
  }

  watch(() => selectionRouteKey(route), () => { void applyRouteSelection() }, { immediate: true })
  return { applyingSelection }
}
