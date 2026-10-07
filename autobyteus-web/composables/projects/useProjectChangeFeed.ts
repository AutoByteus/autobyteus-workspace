import { onBeforeUnmount, onMounted } from 'vue'
import { getProjectChangeFeed } from '~/services/projects/projectChangeFeed'

/** Keeps the node's `/ws/projects` feed open while the calling Projects page is mounted. */
export const useProjectChangeFeed = (): void => {
  let release: (() => void) | null = null
  onMounted(() => { release = getProjectChangeFeed().retain() })
  onBeforeUnmount(() => { release?.(); release = null })
}
