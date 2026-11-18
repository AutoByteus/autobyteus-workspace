<template>
  <!-- The Notification Center: opened from the sidebar entry (pill or strip icon), it floats on the right side of the
       whole window, from the top, over the current page. A grey surface with a fixed title row and one white card per
       kind, one row per update with its action in place. ✕, Esc, a click outside or the entry again closes it. -->
  <Teleport to="body">
    <transition name="notification-center">
      <section
        v-if="center.isOpen"
        ref="panel"
        class="fixed right-2 top-2 z-[90] flex max-h-[calc(100vh-16px)] w-[368px] max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-2xl border border-slate-300 bg-slate-200 shadow-2xl ring-1 ring-black/5 outline-none"
        role="dialog"
        tabindex="-1"
        :aria-labelledby="headingId"
        data-testid="notification-center"
      >
        <!-- A fixed title row: the rows scroll under it, never under the close button. -->
        <div class="flex h-11 flex-shrink-0 items-center justify-between border-b border-slate-300/60 pl-4 pr-2.5">
          <h2 :id="headingId" class="text-sm font-semibold text-gray-900">{{ $t('settings.notifications.title') }}</h2>
          <button
            type="button"
            class="inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            :aria-label="$t('settings.notifications.center.close')"
            :title="$t('settings.notifications.center.close')"
            data-testid="notification-center-close"
            @click="close(true)"
          ><Icon icon="heroicons:x-mark-20-solid" class="h-4 w-4" aria-hidden="true" /></button>
        </div>

        <NotificationRuntimeReader v-if="showsRuntimeRows" />
        <div class="min-h-0 flex-1 overflow-y-auto">
          <ul v-if="!notifications.isEmpty" class="space-y-3 p-3" :aria-label="$t('settings.notifications.listLabel')">
            <NotificationSection v-for="section in notifications.sections" :key="section.kind" :section="section" @update="update" />
          </ul>
          <div v-else class="m-3 rounded-xl border border-slate-200 bg-white px-4 py-6 text-center shadow-sm" role="status" data-testid="notification-center-empty">
            <p class="text-sm font-medium text-gray-700">{{ $t('settings.notifications.empty.title') }}</p>
            <p class="mt-1 text-xs leading-5 text-gray-500">{{ $t(checksOff ? 'settings.notifications.empty.off' : 'settings.notifications.empty.on') }}</p>
          </div>
        </div>
      </section>
    </transition>

    <!-- A skill source's Update keeps its existing confirmation (local edits are replaced). -->
    <SkillSourceUpdateConfirmation layer-class="z-[100]" :show="!!confirming" :source="confirmingTarget" @confirm="confirmSkillUpdate" @cancel="confirming = null" />
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import { Icon } from '@iconify/vue'
import SkillSourceUpdateConfirmation, { type SkillSourceUpdateTarget } from '~/components/skills/SkillSourceUpdateConfirmation.vue'
import { useNotificationCenterStore } from '~/stores/notificationCenterStore'
import { useUpdateNotificationsStore, type NotificationRow, type SourceNotificationRow } from '~/stores/updateNotificationsStore'
import { useUpdateChecksCapabilityStore } from '~/stores/capabilities/updateChecksCapabilityStore'
import NotificationSection from './NotificationSection.vue'
import NotificationRuntimeReader from './NotificationRuntimeReader.vue'

/** The entries that toggle the panel; focus returns to the visible one. */
const ENTRY_SELECTOR = '[data-test="sidebar-notifications-updates"]'

const center = useNotificationCenterStore()
const notifications = useUpdateNotificationsStore()
const updateChecks = useUpdateChecksCapabilityStore()
const panel = ref<HTMLElement | null>(null)
const headingId = `notification-center-heading-${useId()}`
const confirming = ref<SourceNotificationRow | null>(null)

const checksOff = computed(() => updateChecks.status === 'resolved' && !updateChecks.isEnabled)
const confirmingTarget = computed<SkillSourceUpdateTarget | null>(() => confirming.value && {
  // A skill source row always carries its repository (only runtime rows have none); `?? ''` renders the same as null.
  name: confirming.value.name, repositoryUrl: confirming.value.repositoryUrl ?? '', branch: confirming.value.branch,
  installedRevision: confirming.value.installedRevision, latestRevision: confirming.value.latestRevision,
})
/** Runtime rows read their runtimes' state (running agents, a running update) only while the panel shows them. */
const showsRuntimeRows = computed(() => notifications.sections.some((section) => section.kind === 'agent_runtime'))

const update = (row: NotificationRow) => {
  if (row.kind === 'skill_source') confirming.value = row
  else if (row.kind === 'agent_package') void notifications.updateSource(row)
  else if (row.kind === 'agent_runtime') void notifications.updateRuntime(row)
}
const confirmSkillUpdate = () => {
  const row = confirming.value
  confirming.value = null
  if (row) void notifications.updateSource(row)
}

const returnFocus = () => {
  const entries = Array.from(document.querySelectorAll<HTMLElement>(ENTRY_SELECTOR))
  entries.find((entry) => entry.offsetParent !== null)?.focus()
}
const close = (focusEntry: boolean) => {
  center.close()
  if (focusEntry) void nextTick(returnFocus)
}
/** A click outside the panel and the entry closes it (not while the skill confirmation is open). */
const onPointerDown = (event: PointerEvent) => {
  const target = event.target as HTMLElement | null
  if (!center.isOpen || !target || confirming.value || center.modalOpen) return
  if (panel.value?.contains(target) || target.closest(ENTRY_SELECTOR)) return
  close(false)
}
/** Esc closes it wherever focus is; with the skill confirmation open, Esc closes that first. */
const onKeyDown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || !center.isOpen || center.modalOpen) return
  event.preventDefault()
  if (confirming.value) { confirming.value = null; return }
  close(true)
}
const stopListening = () => {
  document.removeEventListener('pointerdown', onPointerDown, true)
  document.removeEventListener('keydown', onKeyDown)
}
watch(() => center.isOpen, async (open) => {
  if (!open) { stopListening(); return }
  document.addEventListener('pointerdown', onPointerDown, true)
  document.addEventListener('keydown', onKeyDown)
  void updateChecks.ensureResolved().catch(() => undefined)
  await nextTick()
  panel.value?.focus()
})
onBeforeUnmount(stopListening)
</script>

<style scoped>
.notification-center-enter-active, .notification-center-leave-active { transition: opacity 150ms ease, transform 150ms ease; }
.notification-center-enter-from, .notification-center-leave-to { opacity: 0; transform: translateX(8px); }
@media (prefers-reduced-motion: reduce) {
  .notification-center-enter-active, .notification-center-leave-active { transition: none; }
}
</style>
