import { useApplicationsCapabilityStore } from '~/stores/applicationsCapabilityStore'
import { useProjectsCapabilityStore } from '~/stores/projectsCapabilityStore'

interface GatedCapabilityStore {
  readonly isEnabled: boolean
  ensureResolved(): Promise<unknown>
}

/**
 * Routes that are only reachable while their bound-node capability is enabled.
 * Stores are obtained inside the middleware, never at module scope.
 */
const CAPABILITY_GATED_ROUTES: ReadonlyArray<{ prefix: string; useStore: () => GatedCapabilityStore }> = [
  { prefix: '/applications', useStore: useApplicationsCapabilityStore },
  { prefix: '/projects', useStore: useProjectsCapabilityStore },
]

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) {
    return
  }

  const gatedRoute = CAPABILITY_GATED_ROUTES.find((entry) => to.path.startsWith(entry.prefix))
  if (!gatedRoute) {
    return
  }

  const capabilityStore = gatedRoute.useStore()

  try {
    await capabilityStore.ensureResolved()
  } catch {
    return navigateTo('/')
  }

  if (!capabilityStore.isEnabled) {
    return navigateTo('/')
  }
})
