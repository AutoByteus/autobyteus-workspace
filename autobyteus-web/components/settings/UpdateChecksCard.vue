<template>
  <!-- The node's background-check setting for update notifications (REQ-013/014), a Basics card that says exactly
       what goes over the network. -->
  <section class="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm" data-testid="update-checks-card">
    <div class="mb-4 min-w-0">
      <h3 class="text-2xl font-semibold leading-tight text-gray-900">{{ $t('settings.notifications.setting.title') }}</h3>
      <p class="mt-1 text-sm text-gray-500">{{ $t('settings.notifications.setting.summary') }}</p>
    </div>

    <div class="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4" data-testid="update-checks-toggle-row">
      <span class="min-w-0">
        <span :id="labelId" class="block text-sm font-semibold text-gray-900">{{ $t('settings.notifications.setting.label') }}</span>
        <span :id="descriptionId" class="mt-1 block text-sm leading-6 text-gray-600" data-testid="update-checks-description">{{ $t('settings.notifications.setting.description') }}</span>
      </span>
      <button
        type="button"
        role="switch"
        class="relative mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
        :class="enabled ? 'bg-emerald-500' : 'bg-slate-300'"
        :aria-checked="enabled"
        :aria-labelledby="labelId"
        :aria-describedby="descriptionId"
        :disabled="capability.status !== 'resolved' || saving"
        data-testid="update-checks-toggle"
        @click="toggle"
      >
        <span aria-hidden="true" class="inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform" :class="enabled ? 'translate-x-5' : 'translate-x-0.5'" />
      </button>
    </div>

    <div class="mt-4 space-y-1">
      <p class="text-xs text-gray-500" data-testid="update-checks-scope">{{ $t('settings.notifications.setting.scope') }}</p>
      <p v-if="capability.error" class="text-sm text-red-600" data-testid="update-checks-error">{{ capability.error.message }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useId } from 'vue'
import { useUpdateChecksCapabilityStore } from '~/stores/capabilities/updateChecksCapabilityStore'

const capability = useUpdateChecksCapabilityStore()
const labelId = `update-checks-label-${useId()}`
const descriptionId = `update-checks-description-${useId()}`
const saving = ref(false)
const enabled = computed(() => capability.isEnabled)

const toggle = async () => {
  if (saving.value || capability.status !== 'resolved') return
  saving.value = true
  try {
    await capability.setEnabled(!capability.isEnabled)
  } catch {
    // The store keeps the previous value and shows its error.
  } finally {
    saving.value = false
  }
}

onMounted(() => { void capability.ensureResolved().catch(() => undefined) })
</script>
