<template>
  <!-- The entry to the Notification Center while updates wait. `inline`: the word pill ("3 updates") on the right of
       the Settings row (solid while any is unread, soft once all are read). `strip`: the icon with a count badge
       above the cog in the collapsed strip. A click toggles the panel next to the entry. -->
  <template v-if="notifications.waitingCount > 0">
    <button
      v-if="variant === 'inline'"
      type="button"
      class="group relative inline-flex h-7 flex-shrink-0 items-center rounded-full px-3 text-xs font-semibold ring-1 ring-inset transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
      :class="notifications.hasUnread ? 'bg-sky-700 text-white ring-sky-700 hover:bg-sky-800' : 'bg-sky-100 text-sky-800 ring-sky-300 hover:bg-sky-200'"
      :aria-label="description"
      :aria-expanded="center.isOpen"
      aria-haspopup="dialog"
      data-test="sidebar-notifications-updates"
      :data-unread="notifications.hasUnread || undefined"
      @click="toggle($event, 'above')"
    >
      <span aria-hidden="true">{{ plural('settings.notifications.sidebar.updates.short', notifications.waitingCount) }}</span>
      <span v-if="!center.isOpen" class="invisible absolute bottom-full right-0 z-50 mb-2 whitespace-nowrap rounded bg-gray-900 px-2.5 py-1.5 text-left text-xs font-normal leading-5 text-white opacity-0 transition-all group-hover:visible group-hover:opacity-100 group-focus-visible:visible group-focus-visible:opacity-100" aria-hidden="true" data-test="sidebar-notifications-tooltip">
        <span v-for="line in kindLines" :key="line" class="block">{{ line }}</span>
      </span>
    </button>
    <button
      v-else
      type="button"
      class="group relative mb-1 rounded-md p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
      :aria-label="description"
      :aria-expanded="center.isOpen"
      aria-haspopup="dialog"
      data-test="sidebar-notifications-updates"
      :data-unread="notifications.hasUnread || undefined"
      @click="toggle($event, 'right')"
    >
      <Icon icon="heroicons:arrow-down-circle" class="h-5 w-5" aria-hidden="true" />
      <span class="absolute right-0 top-0 min-w-[16px] rounded-full bg-sky-700 px-1 text-center text-[10px] font-semibold leading-4 text-white ring-2 ring-white" aria-hidden="true">{{ notifications.waitingCount }}</span>
      <span v-if="!center.isOpen" class="invisible absolute left-full z-50 ml-2 whitespace-nowrap rounded bg-gray-900 px-2.5 py-1.5 text-left text-xs leading-5 text-white opacity-0 transition-all group-hover:visible group-hover:opacity-100 group-focus-visible:visible group-focus-visible:opacity-100" aria-hidden="true">
        <span class="block font-medium">{{ summary }}</span>
        <span v-for="line in kindLines" :key="line" class="block text-gray-300">{{ line }}</span>
      </span>
    </button>
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useNotificationCenterStore } from '~/stores/notificationCenterStore'
import { useUpdateNotificationsStore } from '~/stores/updateNotificationsStore'

defineProps<{ variant: 'inline' | 'strip' }>()
const { t } = useLocalization()
const notifications = useUpdateNotificationsStore()
const center = useNotificationCenterStore()

const PANEL_WIDTH = 360
const EDGE = 8
const plural = (key: string, count: number) => t(`${key}.${count === 1 ? 'one' : 'other'}`, { count })
/** "3 updates available". */
const summary = computed(() => plural('settings.notifications.sidebar.updates', notifications.waitingCount))
/** One line per kind: "1 software update", "2 agent package updates", "1 skill update". */
const kindLines = computed(() => notifications.waitingByKind.map(([kind, count]) => plural(`settings.notifications.sidebar.kind.${kind}`, count)))
/** The entry's accessible name: "3 updates available: 1 software update, …". */
const description = computed(() => t('settings.notifications.sidebar.description', {
  summary: summary.value, details: kindLines.value.join(t('settings.notifications.sidebar.listSeparator')),
}))

/** Opens (or closes) the panel: above the Settings row, or right of the strip icon, kept inside the window. */
const toggle = (event: MouseEvent, side: 'above' | 'right') => {
  if (center.isOpen) { center.close(); return }
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const panelWidth = Math.min(PANEL_WIDTH, window.innerWidth - 2 * EDGE)
  center.open(side === 'above'
    ? { left: EDGE, bottom: window.innerHeight - rect.top + EDGE }
    : { left: Math.max(EDGE, Math.min(rect.right + EDGE, window.innerWidth - panelWidth - EDGE)), bottom: Math.max(EDGE, window.innerHeight - rect.bottom) })
}
</script>
