<template>
  <!-- A remote node's "Update automatically" (autobyteus-356): the desktop keeps the node on this app's version. Shown
       when the node can update in place, or while the switch is on or an outcome is to be shown. -->
  <div v-if="shown" class="mt-2" :data-testid="`node-auto-update-${entryId}`">
    <div class="flex items-start gap-2">
      <button
        type="button"
        role="switch"
        class="relative mt-px inline-flex h-[18px] w-8 flex-shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
        :class="enabled ? 'bg-emerald-500' : 'bg-slate-300'"
        :aria-checked="enabled"
        :aria-labelledby="labelId"
        :aria-describedby="explainId"
        :disabled="saving"
        :data-testid="`node-auto-update-toggle-${entryId}`"
        @click="toggle"
      >
        <span aria-hidden="true" class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform" :class="enabled ? 'translate-x-[16px]' : 'translate-x-0.5'" />
      </button>
      <span class="min-w-0">
        <span :id="labelId" class="block font-medium text-slate-700">{{ t(k('update.auto.label')) }}</span>
        <span :id="explainId" class="block text-xs leading-4 text-slate-500">{{ t(k('update.auto.explain')) }}</span>
      </span>
    </div>
    <p v-if="outcome?.outcome === 'AUTO_UPDATED'" class="mt-1.5 flex items-center gap-1.5 text-emerald-700" :data-testid="`node-auto-update-updated-${entryId}`">
      <span v-if="isNew" class="h-1.5 w-1.5 rounded-full bg-sky-700" aria-hidden="true" :data-testid="`node-auto-update-new-${entryId}`" />
      <span v-if="isNew" class="sr-only">{{ t('settings.notifications.new') }}: </span>{{ t(k('update.auto.updated'), { version: outcome.version }) }}
    </p>
    <p v-else-if="outcome?.outcome === 'AUTO_FAILED'" class="mt-1.5 text-amber-800" role="alert" :data-testid="`node-auto-update-failed-${entryId}`">
      <span v-if="isNew" class="sr-only">{{ t('settings.notifications.new') }}: </span>{{ t(k('update.auto.failed')) }}
      <span v-if="outcome.reason" class="block whitespace-pre-line break-words text-amber-700">{{ outcome.reason }}</span>
    </p>
    <p v-if="failed" class="mt-1 text-xs text-red-700" role="alert" :data-testid="`node-auto-update-error-${entryId}`">{{ t(k('update.auto.saveFailed')) }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useId, watch } from 'vue'
import { useLocalization } from '~/composables/useLocalization'
import { useNodeAutoUpdateStore } from '~/stores/nodeAutoUpdateStore'
import { NODES_PAGE_KEY } from '~/utils/nodeConnectionErrorText'

const props = defineProps<{
  /** The desktop entry the desktop updates the node through. */
  entryId: string
  /** The node can update in place (C1 `inPlaceUpdate === 'available'`). */
  canUpdate: boolean
}>()
const { t } = useLocalization()
const k = (key: string): string => `${NODES_PAGE_KEY}${key}`
const autoUpdates = useNodeAutoUpdateStore()
const labelId = `node-auto-update-label-${useId()}`
const explainId = `node-auto-update-explain-${useId()}`
const saving = ref(false)
const failed = ref(false)

const enabled = computed(() => autoUpdates.isEnabled(props.entryId))
const outcome = computed(() => {
  const entry = autoUpdates.outcomeOf(props.entryId)
  return entry && entry.outcome !== 'PENDING' ? entry : null
})
const shown = computed(() => autoUpdates.supported() && (props.canUpdate || enabled.value || outcome.value !== null))

/** An outcome not seen before shows "New" while this row is on screen, and is marked seen at once. */
const isNew = ref(false)
watch(outcome, (current) => {
  if (!current || current.read) return
  isNew.value = true
  void autoUpdates.markRead(props.entryId).catch((cause) => console.warn('Failed to mark the node update seen:', cause))
}, { immediate: true })

const toggle = async (): Promise<void> => {
  if (saving.value) return
  saving.value = true
  failed.value = false
  try {
    await autoUpdates.setEnabled(props.entryId, !enabled.value)
  } catch {
    failed.value = true
  } finally {
    saving.value = false
  }
}
onMounted(() => { void autoUpdates.initialize() })
</script>
