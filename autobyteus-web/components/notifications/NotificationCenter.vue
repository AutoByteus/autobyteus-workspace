<template>
  <!-- The Notification Center: opened only from the sidebar entry, it floats next to that entry over the current
       page. One white panel, a section per kind, one row per update with its action in place. ✕, Esc, a click
       outside or the entry again closes it. -->
  <Teleport to="body">
    <transition name="notification-center">
      <section
        v-if="center.isOpen && center.anchor"
        ref="panel"
        class="fixed z-[90] flex w-[360px] max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-2xl border border-sky-200 bg-white shadow-xl outline-none"
        :style="position"
        role="dialog"
        tabindex="-1"
        :aria-labelledby="headingId"
        data-testid="notification-center"
      >
        <h2 :id="headingId" class="sr-only">{{ $t('settings.notifications.title') }}</h2>
        <button
          type="button"
          class="absolute right-2 top-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          :aria-label="$t('settings.notifications.center.close')"
          :title="$t('settings.notifications.center.close')"
          data-testid="notification-center-close"
          @click="close(true)"
        ><Icon icon="heroicons:x-mark-20-solid" class="h-4 w-4" aria-hidden="true" /></button>

        <div class="min-h-0 flex-1 overflow-y-auto">
          <ul v-if="!notifications.isEmpty" class="divide-y divide-gray-100" :aria-label="$t('settings.notifications.listLabel')">
            <NotificationSection v-for="section in notifications.sections" :key="section.kind" :section="section" @update="update" />
          </ul>
          <div v-else class="px-4 py-6 text-center" role="status" data-testid="notification-center-empty">
            <p class="text-sm font-medium text-gray-700">{{ $t('settings.notifications.empty.title') }}</p>
            <p class="mt-1 text-xs leading-5 text-gray-500">{{ $t(checksOff ? 'settings.notifications.empty.off' : 'settings.notifications.empty.on') }}</p>
          </div>
        </div>
      </section>
    </transition>

    <!-- A skill source's Update keeps its existing confirmation (local edits are replaced). -->
    <SkillSourceUpdateConfirmation :show="!!confirming" :source="confirmingTarget" @confirm="confirmSkillUpdate" @cancel="confirming = null" />
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
  name: confirming.value.name, repositoryUrl: confirming.value.repositoryUrl, branch: confirming.value.branch,
  installedRevision: confirming.value.installedRevision, latestRevision: confirming.value.latestRevision,
})
/** Above the Settings row (docked panel) or right of the strip icon; the body scrolls in short windows. */
const position = computed(() => {
  const anchor = center.anchor
  if (!anchor) return {}
  return { left: `${anchor.left}px`, bottom: `${anchor.bottom}px`, maxHeight: `min(72vh, calc(100vh - ${anchor.bottom + 16}px))` }
})

const update = (row: NotificationRow) => {
  if (row.kind === 'skill_source') confirming.value = row
  else if (row.kind === 'agent_package') void notifications.updateSource(row)
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
  if (!center.isOpen || !target || confirming.value) return
  if (panel.value?.contains(target) || target.closest(ENTRY_SELECTOR)) return
  close(false)
}
/** Esc closes it wherever focus is; with the skill confirmation open, Esc closes that first. */
const onKeyDown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || !center.isOpen) return
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
.notification-center-enter-from, .notification-center-leave-to { opacity: 0; transform: translateY(6px); }
@media (prefers-reduced-motion: reduce) {
  .notification-center-enter-active, .notification-center-leave-active { transition: none; }
}
</style>
