import { watch } from 'vue'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { useUpdateNotificationsStore } from '~/stores/updateNotificationsStore'
import { buildAuthenticatedWebSocketUrl } from '~/utils/remoteAccess/websocketAuth'
import { getActiveRemoteAccessCredential } from '~/utils/remoteAccess/authorizedTransport'
import { NodeChangeFeed, type NodeChangeSocket } from '~/services/nodeChangeFeed/nodeChangeFeed'
import type { UpdateNotificationChangeMessage } from '~/types/updateNotifications'

export const parseUpdateNotificationChangeMessage = (raw: string): UpdateNotificationChangeMessage | null => {
  try {
    const value = JSON.parse(raw) as { type?: unknown }
    if (!value || typeof value !== 'object' || Object.keys(value).length !== 1) return null
    if (value.type === 'connected' || value.type === 'update_notifications_changed') return { type: value.type }
    return null
  } catch { return null }
}

/**
 * The window node's `/ws/update-notifications` feed: every frame (the `connected` greeting on
 * each connection and each change) re-reads the node's update notifications, so a background
 * check's finding appears without a reload.
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
    deliver: () => { void useUpdateNotificationsStore().reload() },
  })
  watch(() => node.bindingRevision, () => created.rebind())
  feed = created
  return created
}
export const resetUpdateNotificationChangeFeedForTests = (): void => { feed = null }
