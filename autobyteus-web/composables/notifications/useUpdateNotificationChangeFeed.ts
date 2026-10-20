import { onBeforeUnmount, watch, type Ref } from 'vue'
import { getUpdateNotificationChangeFeed } from '~/services/updateNotifications/updateNotificationChangeFeed'

/** Keeps the node's `/ws/update-notifications` feed open app-wide while `enabled` (the app is ready, Settings exists). */
export const useUpdateNotificationChangeFeed = (enabled: Ref<boolean>): void => {
  let release: (() => void) | null = null
  watch(enabled, (value) => {
    if (value && !release) release = getUpdateNotificationChangeFeed().retain()
    if (!value && release) { release(); release = null }
  }, { immediate: true })
  onBeforeUnmount(() => { release?.(); release = null })
}
