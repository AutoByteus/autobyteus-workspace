import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  createWorkspaceExecutionLinkSignature,
  openWorkspaceExecutionLink,
  parseWorkspaceExecutionLinkQuery,
  stripWorkspaceExecutionLinkQuery,
} from '~/services/workspace/workspaceNavigationService'

export const useWorkspaceRouteSelection = () => {
  const route = useRoute()
  const router = useRouter()
  const applyingSelection = ref(false)
  const lastHandledSignature = ref<string | null>(null)

  const applyRouteSelection = async (): Promise<void> => {
    const link = parseWorkspaceExecutionLinkQuery(route.query)
    if (!link) {
      lastHandledSignature.value = null
      return
    }

    const signature = createWorkspaceExecutionLinkSignature(link)
    if (applyingSelection.value || lastHandledSignature.value === signature) {
      return
    }

    applyingSelection.value = true
    lastHandledSignature.value = signature

    try {
      await openWorkspaceExecutionLink(link)
    } finally {
      applyingSelection.value = false
      await router.replace({
        path: route.path,
        query: stripWorkspaceExecutionLinkQuery(route.query),
      })
    }
  }

  watch(
    () => [
      route.query.workspaceExecutionKind,
      route.query.workspaceExecutionRunId,
      route.query.workspaceExecutionMemberRouteKey,
    ].map((value) => (Array.isArray(value) ? value.join('|') : value ?? '')).join('::'),
    () => {
      void applyRouteSelection()
    },
    { immediate: true },
  )

  return {
    applyingSelection,
  }
}
