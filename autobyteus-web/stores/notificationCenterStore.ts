import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useUpdateNotificationsStore } from '~/stores/updateNotificationsStore'

/**
 * The Notification Center panel: open or closed, and which rows were unread when it opened (they
 * keep their "New" dot until it closes, although opening marks them read). It always opens on the
 * right side of the whole window, from either entry.
 */
export const useNotificationCenterStore = defineStore('notificationCenter', () => {
  const isOpen = ref(false)
  const newRowIds = ref<string[]>([])
  /** A confirmation opened from the panel (turning on an automatic update) is showing: outside clicks and Esc belong to it. */
  const modalOpen = ref(false)

  function open(): void {
    const notifications = useUpdateNotificationsStore()
    newRowIds.value = notifications.rows.filter((row) => row.unread).map((row) => row.id)
    isOpen.value = true
    void notifications.markAllRead()
  }

  function close(): void {
    isOpen.value = false
    newRowIds.value = []
  }

  const isNew = (rowId: string): boolean => newRowIds.value.includes(rowId)

  return { isOpen, modalOpen, open, close, isNew }
})
