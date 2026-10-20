import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useUpdateNotificationsStore } from '~/stores/updateNotificationsStore'

/** Where the panel floats: its left edge and its distance from the window's bottom. */
export type NotificationCenterAnchor = { left: number; bottom: number }

/**
 * The Notification Center panel: open or closed, where it floats, and which rows were unread when
 * it opened (they keep their "New" dot until it closes, although opening marks them read).
 */
export const useNotificationCenterStore = defineStore('notificationCenter', () => {
  const isOpen = ref(false)
  const anchor = ref<NotificationCenterAnchor | null>(null)
  const newRowIds = ref<string[]>([])

  function open(at: NotificationCenterAnchor): void {
    const notifications = useUpdateNotificationsStore()
    anchor.value = at
    newRowIds.value = notifications.rows.filter((row) => row.unread).map((row) => row.id)
    isOpen.value = true
    void notifications.markAllRead()
  }

  function close(): void {
    isOpen.value = false
    newRowIds.value = []
  }

  const isNew = (rowId: string): boolean => newRowIds.value.includes(rowId)

  return { isOpen, anchor, open, close, isNew }
})
