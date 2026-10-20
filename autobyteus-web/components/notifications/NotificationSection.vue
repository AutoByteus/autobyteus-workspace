<template>
  <!-- One section per kind of update: a small grey header (the kind's icon and name) and its rows. Long lists show
       the first three and "Show N more". -->
  <li class="px-4 pb-1.5 pt-3" :data-testid="`notification-section-${section.kind}`">
    <h3 :id="headingId" class="flex items-center gap-1.5 text-xs font-medium leading-5 text-gray-500" data-testid="notification-section-title">
      <Icon :icon="KIND_ICONS[section.kind]" class="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span class="truncate">{{ title }}</span>
    </h3>
    <ul :aria-labelledby="headingId">
      <NotificationRow v-for="row in shownRows" :key="row.id" :row="row" @update="emit('update', $event)" />
    </ul>
    <button
      v-if="hiddenCount > 0"
      type="button"
      class="mb-2 rounded-md text-xs font-medium text-sky-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
      :aria-expanded="showAll"
      data-testid="notification-section-more"
      @click="showAll = !showAll"
    >{{ showAll ? $t('settings.notifications.showLess') : $t('settings.notifications.showMore', { count: hiddenCount }) }}</button>
  </li>
</template>

<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { Icon } from '@iconify/vue'
import type { NotificationRow as Row, NotificationSection } from '~/stores/updateNotificationsStore'
import type { UpdateNotificationKind } from '~/types/updateNotifications'
import NotificationRow from './NotificationRow.vue'

const props = defineProps<{ section: NotificationSection }>()
const emit = defineEmits<{ (event: 'update', row: Row): void }>()
const { t } = useLocalization()
const headingId = `notification-section-heading-${useId()}`
const LIMIT = 3
const showAll = ref(false)

/** Each kind's outline icon, from the sidebar's set. A new kind adds one, with its strings. */
const KIND_ICONS: Record<UpdateNotificationKind, string> = {
  app: 'heroicons:computer-desktop', agent_package: 'heroicons:cube', skill_source: 'heroicons:sparkles',
}
/** Singular with one row, plural with more; the app is always singular. */
const title = computed(() => t(props.section.rows.length > 1
  ? `settings.notifications.kindGroup.${props.section.kind}`
  : `settings.notifications.kind.${props.section.kind}`))
const shownRows = computed(() => showAll.value ? props.section.rows : props.section.rows.slice(0, LIMIT))
/** How many are behind "Show N more" (kept while expanded, so the button can read "Show less"). */
const hiddenCount = computed(() => Math.max(0, props.section.rows.length - LIMIT))
</script>
