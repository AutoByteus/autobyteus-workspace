import { onBeforeUnmount, watch, type Ref } from 'vue'
import { getAgentPackageDefinitionChangeFeed } from '~/services/agentPackages/agentPackageDefinitionChangeFeed'

/** Keeps the node's `/ws/agent-package-definitions` feed open app-wide while `enabled` (the app is ready). */
export const useAgentPackageDefinitionChangeFeed = (enabled: Ref<boolean>): void => {
  let release: (() => void) | null = null
  watch(enabled, (value) => {
    if (value && !release) release = getAgentPackageDefinitionChangeFeed().retain()
    if (!value && release) { release(); release = null }
  }, { immediate: true })
  onBeforeUnmount(() => { release?.(); release = null })
}
