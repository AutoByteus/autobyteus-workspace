import { watch } from 'vue'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { useUpdateNotificationsStore } from '~/stores/updateNotificationsStore'
import { useUpdateAutomationStore } from '~/stores/updateAutomationStore'
import { buildAuthenticatedWebSocketUrl } from '~/utils/remoteAccess/websocketAuth'
import { getActiveRemoteAccessCredential } from '~/utils/remoteAccess/authorizedTransport'
import { NodeChangeFeed, type NodeChangeSocket } from '~/services/nodeChangeFeed/nodeChangeFeed'
import type { UpdateNotificationChangeMessage } from '~/types/updateNotifications'

export const parseUpdateNotificationChangeMessage = (raw: string): UpdateNotificationChangeMessage | null => {
  try {
    const value = JSON.parse(raw) as { type?: unknown }
    if (!value || typeof value !== 'object' || Object.keys(value).length !== 1) return null
    if (value.type === 'connected' || value.type === 'update_notifications_changed' || value.type === 'update_settings_changed') {
      return { type: value.type }
    }
    return null
  } catch { return null }
}

/**
 * The window node's `/ws/update-notifications` feed. `update_notifications_changed` re-reads the
 * node's update notifications, so a background check's finding appears without a reload;
 * `update_settings_changed` re-reads its check intervals and automatic-update switches (changed
 * in another window). The `connected` greeting on each connection re-reads both.
 */
export class UpdateNotificationChangeFeed extends NodeChangeFeed<UpdateNotificationChangeMessage> {
  constructor(options: Readonly<{
    endpoint(): string | null
    deliver(message: UpdateNotificationChangeMessage): void
    createSocket?(url: string): NodeChangeSocket
    retryDelayMs?(attempt: number): number
  }>) {
    super({ ...options, label: 'update notifications', parse: parseUpdateNotificationChangeMessage })
  }
}

/** Each frame re-reads its subject; the `connected` greeting re-reads both. */
export const deliverUpdateNotificationChange = (message: UpdateNotificationChangeMessage): void => {
  if (message.type !== 'update_settings_changed') void useUpdateNotificationsStore().reload()
  if (message.type !== 'update_notifications_changed') void useUpdateAutomationStore().refresh()
}

let feed: UpdateNotificationChangeFeed | null = null
/** The process feed of the bound node, reopened when the window is bound to another node. */
export const getUpdateNotificationChangeFeed = (): UpdateNotificationChangeFeed => {
  if (feed) return feed
  const node = useWindowNodeContextStore()
  const created = new UpdateNotificationChangeFeed({
    endpoint: () => {
      try { return buildAuthenticatedWebSocketUrl(node.getBoundEndpoints().updateNotificationsWs, getActiveRemoteAccessCredential() ?? '') }
      catch { return null }
    },
    deliver: deliverUpdateNotificationChange,
  })
  watch(() => node.bindingRevision, () => created.rebind())
  feed = created
  return created
}
export const resetUpdateNotificationChangeFeedForTests = (): void => { feed = null }
