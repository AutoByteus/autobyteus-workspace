<template>
  <!-- The automatic-update switch of one kind, with what turning it on means, right where the user sees the update
       (the panel) and in the Update checks card (the full home). One setting: both places read and write the same store.
       `panel`: a quiet well under the section header; `card`: a row of the card's inner list; `settings`: a block of a
       settings section (the app's switch on the About page, autobyteus-356). -->
  <div
    :class="CONTAINER_CLASS[variant]"
    :data-testid="`auto-update-${kind}`"
    :data-variant="variant"
  >
    <div class="flex items-center justify-between gap-3">
      <span :id="labelId" class="min-w-0 font-medium text-gray-900" :class="LABEL_CLASS[variant]">{{ label }}</span>
      <button
        type="button"
        role="switch"
        class="relative inline-flex flex-shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
        :class="[variant === 'panel' ? 'h-5 w-9' : 'h-6 w-11', enabled ? 'bg-emerald-500' : 'bg-slate-300']"
        :aria-checked="enabled"
        :aria-labelledby="labelId"
        :aria-describedby="describedBy"
        :disabled="!ready || saving"
        :data-testid="`auto-update-${kind}-toggle`"
        @click="toggle"
      >
        <span
          aria-hidden="true"
          class="inline-block transform rounded-full bg-white shadow-sm transition-transform"
          :class="variant === 'panel' ? ['h-4 w-4', enabled ? 'translate-x-[18px]' : 'translate-x-0.5'] : ['h-5 w-5', enabled ? 'translate-x-5' : 'translate-x-0.5']"
        />
      </button>
    </div>
    <p :id="explainId" class="mt-0.5 text-xs leading-5" :class="variant === 'panel' ? 'text-gray-500' : 'text-gray-600 sm:text-[0.8125rem] sm:leading-5'" :data-testid="`auto-update-${kind}-explanation`">{{ $t(`settings.notifications.auto.${enabled ? 'explainOn' : 'explain'}.${kind}`) }}</p>
    <p v-if="enabled && checksOff" :id="noEffectId" class="mt-1.5 flex items-start gap-1.5 text-xs leading-5 text-amber-800" :data-testid="`auto-update-${kind}-no-effect`">
      <Icon icon="heroicons:pause-circle-20-solid" class="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" aria-hidden="true" />{{ $t(kind === 'app' ? 'settings.notifications.auto.noEffectApp' : 'settings.notifications.auto.noEffect') }}
    </p>
    <p v-else-if="enabled && applyingCount > 0" :id="noEffectId" class="mt-1.5 flex items-start gap-1.5 text-xs leading-5 text-sky-800" role="status" :data-testid="`auto-update-${kind}-applying`">
      <Icon icon="heroicons:clock-20-solid" class="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-600" aria-hidden="true" />{{ $t(`settings.notifications.auto.applying.${applyingCount === 1 ? 'one' : 'other'}`, { count: applyingCount }) }}
    </p>
    <!-- Turning on replaces local changes without asking again, so the user confirms once, here (SR-003, REQ-007). -->
    <ConfirmationModal
      v-if="needsConfirmation"
      :show="confirming"
      :title="$t(`settings.notifications.auto.confirm.title.${kind}`)"
      :confirm-button-text="$t('settings.notifications.auto.confirm.action')"
      variant="danger"
      layer-class="z-[100]"
      @confirm="confirmTurnOn"
      @cancel="cancelTurnOn"
    >
      <ul class="space-y-2 text-sm leading-6 text-slate-600" :data-testid="`auto-update-${kind}-confirm`">
        <li>{{ $t(`settings.notifications.auto.confirm.download.${kind}`) }}</li>
        <li>{{ $t('settings.notifications.auto.confirm.change') }}</li>
        <li class="font-medium text-slate-900">{{ $t(`settings.notifications.auto.confirm.replace.${kind}`) }}</li>
        <li>{{ $t('settings.notifications.auto.confirm.off') }}</li>
      </ul>
    </ConfirmationModal>
    <p v-if="failed" class="mt-1.5 text-xs leading-5 text-red-700" role="alert" :data-testid="`auto-update-${kind}-error`">{{ $t('settings.notifications.auto.saveFailed') }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { Icon } from '@iconify/vue'
import ConfirmationModal from '~/components/common/ConfirmationModal.vue'
import { useNotificationCenterStore } from '~/stores/notificationCenterStore'
import { useAppUpdateStore } from '~/stores/appUpdateStore'
import { useUpdateAutomationStore } from '~/stores/updateAutomationStore'
import { useUpdateChecksCapabilityStore } from '~/stores/capabilities/updateChecksCapabilityStore'
import { SETTINGS_FIELD_OF } from '~/types/updateNotifications'

const props = defineProps<{
  /** `app`: the desktop app itself (autobyteus-356), kept by the desktop shell, not by a node. */
  kind: 'app' | 'agent_package' | 'skill_source' | 'agent_runtime'
  variant: 'panel' | 'card' | 'settings'
  /** Panel: waiting rows this switch will apply within about a minute once it is on. */
  applyingCount?: number
}>()
const { t } = useLocalization()
const settings = useUpdateAutomationStore()
const updateChecks = useUpdateChecksCapabilityStore()
const appUpdate = useAppUpdateStore()
const CONTAINER_CLASS = { panel: 'mt-1 border-b border-gray-100 pb-2.5', card: 'px-4 py-3.5', settings: 'mt-4 border-t border-gray-100 pt-4' } as const
const LABEL_CLASS = { panel: 'text-xs leading-5', card: 'text-sm font-semibold', settings: 'text-sm' } as const
const saving = ref(false)
const failed = ref(false)
const labelId = `auto-update-label-${useId()}`
const explainId = `auto-update-explain-${useId()}`
const noEffectId = `auto-update-note-${useId()}`

const isApp = computed(() => props.kind === 'app')
const enabled = computed(() => props.kind === 'app'
  ? appUpdate.automaticUpdate
  : settings.resolved?.automaticUpdates[SETTINGS_FIELD_OF[props.kind]] === true)
/** The app's switch acts on what the app's own checks find; a node's switch on what the node's Update checks find. */
const checksOff = computed(() => isApp.value
  ? appUpdate.autoCheck?.enabled === false
  : updateChecks.status === 'resolved' && !updateChecks.isEnabled)
const ready = computed(() => isApp.value ? appUpdate.isElectron && appUpdate.status !== 'disabled' : settings.status === 'resolved')
const applyingCount = computed(() => props.applyingCount ?? 0)
const label = computed(() => props.variant === 'panel' ? t('settings.notifications.auto.label') : t(`settings.notifications.auto.kind.${props.kind}`))
const describedBy = computed(() => [explainId, (enabled.value && (checksOff.value || applyingCount.value > 0)) ? noEffectId : ''].filter(Boolean).join(' '))

const center = useNotificationCenterStore()
const confirming = ref(false)
/**
 * Turning on packages or skill sources replaces local changes later without asking, so it is confirmed first; runtimes
 * and the app have none (the app's switch is a normal setting, REQ-001).
 */
const needsConfirmation = computed(() => props.kind === 'agent_package' || props.kind === 'skill_source')
const save = async (value: boolean) => {
  saving.value = true
  failed.value = false
  try {
    if (props.kind === 'app') {
      if (!await appUpdate.setAutomaticUpdate(value)) failed.value = true
    } else {
      await settings.setAutomatic(props.kind, value)
    }
  } catch {
    failed.value = true
  } finally {
    saving.value = false
  }
}
const toggle = async () => {
  if (saving.value || !ready.value) return
  if (!enabled.value && needsConfirmation.value) { confirming.value = true; return }
  await save(!enabled.value)
}
const confirmTurnOn = async () => {
  confirming.value = false
  await save(true)
}
const cancelTurnOn = () => { confirming.value = false }
/** While the confirmation shows, the Notification Center leaves outside clicks and Esc to it; Esc cancels. */
const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && confirming.value) { event.preventDefault(); cancelTurnOn() } }
watch(confirming, (open) => {
  center.modalOpen = open
  if (open) document.addEventListener('keydown', onKeyDown)
  else document.removeEventListener('keydown', onKeyDown)
})
onBeforeUnmount(() => { document.removeEventListener('keydown', onKeyDown); if (confirming.value) center.modalOpen = false })
onMounted(() => {
  if (isApp.value) return
  void settings.ensureResolved()
  void updateChecks.ensureResolved().catch(() => undefined)
})
</script>
