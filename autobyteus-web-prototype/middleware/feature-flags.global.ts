import { useApplicationsCapabilityStore } from '~/stores/applicationsCapabilityStore'

export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/applications') || import.meta.server) {
    return
  }

  const applicationsCapabilityStore = useApplicationsCapabilityStore()

  try {
    await applicationsCapabilityStore.ensureResolved()
  } catch {
    return navigateTo('/')
  }

  if (!applicationsCapabilityStore.isEnabled) {
    return navigateTo('/')
  }
})
