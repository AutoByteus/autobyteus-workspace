<template>
  <!-- The node's update checks: the background-check switch with an honest list of what goes over the network, how often
       each kind is checked, and the automatic-update switches, the full home of the same settings the Notification Center
       offers at each category. The runtime parts show only in the own window of the desktop's embedded node. -->
  <section class="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm" data-testid="update-checks-card">
    <div class="mb-4 min-w-0">
      <h3 class="text-2xl font-semibold leading-tight text-gray-900">{{ $t('settings.notifications.setting.title') }}</h3>
      <p class="mt-1 text-sm text-gray-500">{{ $t(ownsRuntimes ? 'settings.notifications.setting.summaryOwn' : 'settings.notifications.setting.summary') }}</p>
    </div>

    <div class="rounded-2xl border border-slate-200 bg-slate-50/60 p-4" data-testid="update-checks-toggle-row">
      <div class="flex items-start justify-between gap-4">
        <span class="min-w-0">
          <span :id="labelId" class="block text-sm font-semibold text-gray-900">{{ $t('settings.notifications.setting.label') }}</span>
          <span :id="descriptionId" class="mt-0.5 block text-sm leading-6 text-gray-600" data-testid="update-checks-description">{{ $t('settings.notifications.setting.description') }}</span>
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

      <div class="mt-2.5 border-t border-slate-200 pt-2.5" data-testid="update-checks-network">
        <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">{{ $t('settings.notifications.setting.network.title') }}</p>
        <ul class="mt-1 space-y-0.5 text-[0.8125rem] leading-5 text-gray-600">
          <li class="flex gap-2"><span class="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-gray-400" aria-hidden="true" />{{ $t('settings.notifications.setting.network.packages') }}</li>
          <li v-if="ownsRuntimes" class="flex gap-2" data-testid="update-checks-network-runtimes"><span class="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-gray-400" aria-hidden="true" />{{ $t('settings.notifications.setting.network.runtimes') }}</li>
          <li class="flex gap-2"><span class="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-gray-400" aria-hidden="true" />{{ $t('settings.notifications.setting.network.updates') }}</li>
        </ul>
      </div>
    </div>

    <!-- GitHub refused: the node waits until it may ask again (a quiet status, not a notification). -->
    <p v-if="enabled && waitUntilLabel" class="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900" role="status" data-testid="update-checks-backoff">
      <Icon icon="heroicons:clock-20-solid" class="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" aria-hidden="true" />{{ $t('settings.notifications.setting.backoff', { time: waitUntilLabel }) }}
    </p>
    <p v-if="capability.status === 'resolved' && !enabled" class="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-900" role="status" data-testid="update-checks-off-note">
      <Icon icon="heroicons:pause-circle-20-solid" class="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" aria-hidden="true" />{{ $t('settings.notifications.setting.checksOff') }}
    </p>

    <div class="mt-5" data-testid="update-checks-intervals">
      <h4 class="text-base font-semibold text-gray-900">{{ $t('settings.notifications.setting.interval.title') }}</h4>
      <div class="mt-2 divide-y divide-slate-100 rounded-2xl border border-slate-200 px-4" :class="enabled ? '' : 'bg-slate-50/40'">
        <UpdateIntervalField class="py-3" test-key="packages" :minutes="automation.resolved?.intervals.agentPackages ?? null" :save="(minutes) => automation.setInterval('agent_package', minutes)" :label="$t('settings.notifications.interval.agent_package')" :muted="!enabled" />
        <UpdateIntervalField class="py-3" test-key="skills" :minutes="automation.resolved?.intervals.skillSources ?? null" :save="(minutes) => automation.setInterval('skill_source', minutes)" :label="$t('settings.notifications.interval.skill_source')" :muted="!enabled" />
        <UpdateIntervalField v-if="ownsRuntimes" class="py-3" test-key="runtimes" :minutes="automation.resolved?.intervals.agentRuntimes ?? null" :save="(minutes) => automation.setInterval('agent_runtime', minutes)" :label="$t('settings.notifications.interval.agent_runtime')" :muted="!enabled" />
      </div>
      <p class="mt-2 text-xs leading-5 text-gray-500" data-testid="update-checks-github-note">{{ $t('settings.notifications.interval.range') }} {{ $t('settings.notifications.setting.interval.githubNote') }}</p>
    </div>

    <div class="mt-5" data-testid="update-checks-automatic">
      <h4 class="text-base font-semibold text-gray-900">{{ $t('settings.notifications.setting.auto.title') }}</h4>
      <p class="mt-0.5 text-sm text-gray-500">{{ $t('settings.notifications.setting.auto.summary') }}</p>
      <div class="mt-2 divide-y divide-slate-100 rounded-2xl border border-slate-200" :class="enabled ? '' : 'bg-slate-50/40'">
        <AutoUpdateSwitch kind="agent_package" variant="card" />
        <AutoUpdateSwitch kind="skill_source" variant="card" />
        <AutoUpdateSwitch v-if="ownsRuntimes" kind="agent_runtime" variant="card" />
      </div>
    </div>

    <div class="mt-4 space-y-1">
      <p class="text-xs text-gray-500" data-testid="update-checks-scope">{{ $t('settings.notifications.setting.scope') }}</p>
      <p v-if="capability.error" class="text-sm text-red-600" data-testid="update-checks-error">{{ capability.error.message }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId } from 'vue'
import { Icon } from '@iconify/vue'
import AutoUpdateSwitch from '~/components/notifications/AutoUpdateSwitch.vue'
import UpdateIntervalField from '~/components/settings/UpdateIntervalField.vue'
import { useUpdateChecksCapabilityStore } from '~/stores/capabilities/updateChecksCapabilityStore'
import { useUpdateAutomationStore } from '~/stores/updateAutomationStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { showsAgentRuntimeUpdates } from '~/utils/ownNodeWindow'

const capability = useUpdateChecksCapabilityStore()
const automation = useUpdateAutomationStore()
const node = useWindowNodeContextStore()
const { resolvedLocale } = useLocalization()
const labelId = `update-checks-label-${useId()}`
const descriptionId = `update-checks-description-${useId()}`
const saving = ref(false)
const enabled = computed(() => capability.isEnabled)
/** Agent runtimes are checked and updated on the desktop's own node only (DEC-020, AR-005). */
const ownsRuntimes = computed(() => showsAgentRuntimeUpdates(node, automation.resolved))

/** Re-reads the time now and then, so the wait banner goes when the wait ends. */
const now = ref(Date.now())
let clock: ReturnType<typeof setInterval> | null = null

/** "14:35" in the user's locale, with the day when it is not today (GitHub's wait can outlive midnight or a restart). */
const waitUntilLabel = computed(() => {
  const until = automation.resolved?.githubWaitUntil
  if (!until) return null
  const at = new Date(until)
  if (Number.isNaN(at.getTime()) || at.getTime() <= now.value) return null
  const locale = String(resolvedLocale.value || 'en')
  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(at)
  return at.toDateString() === new Date().toDateString() ? time : `${new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(at)} ${time}`
})

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

onMounted(() => {
  void capability.ensureResolved().catch(() => undefined)
  void automation.ensureResolved()
  clock = setInterval(() => { now.value = Date.now() }, 30_000)
})
onBeforeUnmount(() => { if (clock) clearInterval(clock) })
</script>
