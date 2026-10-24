<template>
  <!-- One update as a row: the name (with the "New" dot in a fixed gutter), below it the change and when it was
       found, and its one action on the right. The name or the change toggles the details; progress and errors
       show under the row, full width. -->
  <li class="relative py-2.5" :data-testid="`notification-row-${row.id}`" :data-state="row.state">
    <span v-if="showNewDot" class="absolute -left-[11px] top-[15px] h-1.5 w-1.5 rounded-full bg-sky-700" aria-hidden="true" data-testid="notification-row-new" />
    <div class="flex items-center gap-3">
      <button
        type="button"
        class="block min-w-0 flex-1 rounded-md text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
        :aria-expanded="expanded"
        :aria-controls="detailsId"
        data-testid="notification-row-summary"
        @click="expanded = !expanded"
      >
        <span class="block truncate text-[13px] font-medium leading-5" :class="row.state === 'handled' && !showNewDot ? 'text-gray-500' : 'text-gray-900'" :title="name" data-testid="notification-row-name">
          <span v-if="showNewDot" class="sr-only">{{ $t('settings.notifications.new') }}: </span>{{ name }}
        </span>
        <span class="flex flex-wrap items-center gap-x-1.5 text-xs leading-5 text-gray-500" data-testid="notification-row-change">
          <template v-if="row.state === 'handled'">
            <Icon icon="heroicons:check-circle-20-solid" class="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
            <span class="text-emerald-700">{{ $t(autoUpdated ? 'settings.notifications.outcome.updated' : 'settings.notifications.handled', { revision: handledTo }) }}</span>
          </template>
          <template v-else>
            <span :class="revisionClass">{{ from }}</span>
            <Icon icon="heroicons:arrow-right-20-solid" class="h-3 w-3 text-gray-400" aria-hidden="true" />
            <span class="font-medium text-gray-700" :class="revisionClass">{{ to }}</span>
            <template v-if="row.foundAt">
              <span aria-hidden="true">·</span>
              <span :title="fullLocalTime(row.foundAt, locale)" data-testid="notification-row-time">{{ shortRelativeTime(row.foundAt, locale) }}</span>
            </template>
          </template>
        </span>
      </button>

      <div v-if="action" class="flex-shrink-0">
        <span v-if="action === 'updating'" class="inline-flex items-center gap-1.5 text-xs font-medium text-sky-800" role="status" data-testid="notification-row-updating">
          <Icon icon="heroicons:arrow-path-20-solid" class="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />{{ $t('settings.notifications.updating') }}
        </span>
        <button v-else-if="action === 'install'" type="button" class="rounded-full bg-emerald-700 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          :aria-label="`${$t('settings.notifications.app.install')}: ${name}`" data-testid="notification-row-install" @click="notifications.installApp()">{{ $t('settings.notifications.app.install') }}</button>
        <button v-else-if="action === 'clear'" type="button" class="rounded-full px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          :aria-label="`${$t('settings.notifications.clear')}: ${name}`" data-testid="notification-row-clear" @click="notifications.clear(row)">{{ $t('settings.notifications.clear') }}</button>
        <button v-else type="button" class="rounded-full bg-sky-700 px-3 py-1 text-xs font-semibold text-white hover:bg-sky-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
          :class="blockedByAgents ? 'cursor-not-allowed opacity-50 hover:bg-sky-700' : ''"
          :disabled="row.kind === 'app' && appUpdate.status === 'checking'" :aria-disabled="blockedByAgents ? 'true' : undefined" :aria-describedby="blockedByAgents ? blockedId : undefined"
          :aria-label="`${actionLabel}: ${name}`" data-testid="notification-row-update" @click="runUpdate">{{ actionLabel }}</button>
      </div>
    </div>

    <!-- An automatic update's result: what changed, without a click (REQ-008). -->
    <p v-if="autoUpdated" class="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs leading-5 text-gray-500" data-testid="notification-row-auto-changed">
      <template v-if="row.handledAt"><span :title="fullLocalTime(row.handledAt, locale)" data-testid="notification-row-time">{{ shortRelativeTime(row.handledAt, locale) }}</span><span aria-hidden="true">·</span></template>
      <a v-if="row.kind !== 'app' && row.kind !== 'agent_runtime'" :href="compareUrlOf(row)" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 rounded font-medium text-sky-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500" data-testid="notification-row-compare">
        {{ $t('settings.notifications.compare') }}<Icon icon="heroicons:arrow-top-right-on-square-20-solid" class="h-3.5 w-3.5" aria-hidden="true" />
      </a>
      <span v-else-if="row.kind === 'agent_runtime'">{{ $t('settings.notifications.outcome.from', { version: row.installedRevision }) }}</span>
    </p>
    <p v-if="row.kind === 'agent_runtime' && row.state !== 'handled' && row.runningAgentCount > 0 && row.state !== 'updating'" :id="blockedId" class="mt-1 text-xs leading-5 text-gray-600" data-testid="notification-row-blocked">
      {{ $t(`settings.notifications.runtime.blocked.${row.runningAgentCount === 1 ? 'one' : 'other'}`, { count: row.runningAgentCount }) }}
      <template v-if="row.outcome === 'AUTO_WAITING' && runtimeAutomatic"> {{ $t('settings.notifications.runtime.blockedAuto') }}</template>
    </p>
    <p v-if="row.state === 'waiting' && row.outcome === 'AUTO_FAILED'" class="mt-1.5 rounded-md bg-red-50 px-2.5 py-1.5 text-xs leading-5 text-red-800" role="alert" data-testid="notification-row-auto-failed">
      {{ $t('settings.notifications.outcome.failed') }}
      <span v-if="row.outcomeReason" class="block whitespace-pre-line break-words text-red-700">{{ row.outcomeReason }}</span>
    </p>

    <div v-if="expanded" :id="detailsId" class="mt-1.5 space-y-1 text-xs leading-5 text-gray-600" data-testid="notification-row-details">
      <template v-if="row.kind === 'agent_runtime'">
        <p>{{ $t('settings.notifications.runtime.details', { name: row.name }) }}</p>
      </template>
      <template v-else-if="row.kind !== 'app'">
        <p class="truncate" :title="repositoryLine">{{ repositoryLine }}</p>
        <a v-if="!autoUpdated" :href="compareUrlOf(row)" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 rounded font-medium text-sky-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500" data-testid="notification-row-compare">
          {{ $t('settings.notifications.compare') }}<Icon icon="heroicons:arrow-top-right-on-square-20-solid" class="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </template>
      <template v-else>
        <p v-if="appUpdate.releaseNotes" class="whitespace-pre-line rounded-md bg-gray-50 px-2.5 py-1.5 text-gray-700" data-testid="notification-row-release-notes">{{ appUpdate.releaseNotes }}</p>
        <a v-if="row.releasePageUrl" :href="row.releasePageUrl" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 rounded font-medium text-sky-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500" data-testid="notification-row-release-page">
          {{ $t('settings.notifications.releasePage') }}<Icon icon="heroicons:arrow-top-right-on-square-20-solid" class="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </template>
    </div>

    <div v-if="row.state === 'downloading'" class="mt-2" role="status" data-testid="notification-row-progress">
      <p class="text-xs leading-5 text-gray-600">{{ $t('settings.notifications.app.downloading', { percent: downloadPercent }) }}</p>
      <div class="mt-1 h-1.5 w-full rounded-full bg-gray-200" aria-hidden="true">
        <div class="h-1.5 rounded-full bg-sky-700 transition-all" :style="{ width: `${downloadPercent}%` }" />
      </div>
    </div>
    <p v-if="row.state === 'downloaded'" class="mt-1 text-xs leading-5 text-emerald-700" data-testid="notification-row-downloaded">{{ $t('settings.notifications.app.downloaded') }}</p>
    <p v-if="row.state === 'installing'" class="mt-1 inline-flex items-center gap-1.5 text-xs leading-5 text-emerald-700" role="status" data-testid="notification-row-installing">
      <Icon icon="heroicons:arrow-path-20-solid" class="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />{{ $t('settings.notifications.app.installing') }}
    </p>
    <p v-if="row.state === 'failed'" class="mt-1.5 rounded-md bg-red-50 px-2.5 py-1.5 text-xs leading-5 text-red-800" role="alert" data-testid="notification-row-error">
      {{ row.kind === 'app' ? $t('settings.notifications.app.failed') : $t('settings.notifications.failed') }}
      <span v-if="row.error" class="block whitespace-pre-line break-words text-red-700">{{ row.error }}</span>
    </p>
  </li>
</template>

<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { Icon } from '@iconify/vue'
import { useAppUpdateStore } from '~/stores/appUpdateStore'
import { useNotificationCenterStore } from '~/stores/notificationCenterStore'
import { useUpdateAutomationStore } from '~/stores/updateAutomationStore'
import { compareUrlOf, shortRevision, useUpdateNotificationsStore, type NotificationRow } from '~/stores/updateNotificationsStore'
import { fullLocalTime, shortRelativeTime } from '~/utils/notificationTime'

const props = defineProps<{ row: NotificationRow }>()
const emit = defineEmits<{ (event: 'update', row: NotificationRow): void }>()
const { t, resolvedLocale } = useLocalization()
const notifications = useUpdateNotificationsStore()
const center = useNotificationCenterStore()
const automation = useUpdateAutomationStore()
/** The automatic retry is promised only while the agent-runtime switch is on: the pass stops acting once it is off. */
const runtimeAutomatic = computed(() => automation.resolved?.automaticUpdates.agentRuntimes === true)
const appUpdate = useAppUpdateStore()
const expanded = ref(false)
const detailsId = `notification-row-details-${useId()}`
const locale = computed(() => String(resolvedLocale.value || 'en'))

const name = computed(() => props.row.kind === 'app' ? t('settings.notifications.app.name') : props.row.name)
/** Versions (the app, a runtime) are shown whole; source revisions by their first 7 characters. */
const shown = (row: NotificationRow, revision: string) => row.kind === 'app' || row.kind === 'agent_runtime' ? revision : shortRevision(revision)
const from = computed(() => props.row.kind === 'app' ? props.row.fromVersion : shown(props.row, props.row.installedRevision))
const to = computed(() => props.row.kind === 'app' ? props.row.version : shown(props.row, props.row.latestRevision))
const handledTo = computed(() => props.row.kind === 'app'
  ? props.row.handledVersion ?? props.row.version
  : shown(props.row, props.row.handledRevision ?? props.row.latestRevision))
/** Revisions are mono; versions (the app, a runtime) are plain. */
const revisionClass = computed(() => props.row.kind === 'app' || props.row.kind === 'agent_runtime' ? '' : 'font-mono text-[11px]')
/** An automatic update has applied this source or runtime (REQ-008). */
const autoUpdated = computed(() => props.row.kind !== 'app' && props.row.state === 'handled' && props.row.outcome === 'AUTO_UPDATED')
const showNewDot = computed(() => (props.row.state !== 'handled' || autoUpdated.value) && (props.row.unread || center.isNew(props.row.id)))
/** A runtime's Update stays visible but does nothing while its agents run; the row says why (REQ-021). */
const blockedByAgents = computed(() => props.row.kind === 'agent_runtime' && props.row.state !== 'handled' && props.row.runningAgentCount > 0)
const blockedId = `notification-row-blocked-${useId()}`
const repositoryLine = computed(() => {
  if (props.row.kind === 'app') return ''
  const repository = (props.row.repositoryUrl ?? '').replace(/^https:\/\/github\.com\//i, '')
  return props.row.branch ? `${repository} · ${props.row.branch}` : repository
})
const downloadPercent = computed(() => Math.max(0, Math.min(100, Math.round(appUpdate.downloadPercent ?? 0))))

/** The row's one action; none while the app downloads (the progress shows instead). */
const action = computed<'update' | 'retry' | 'install' | 'updating' | 'clear' | null>(() => {
  switch (props.row.state) {
    case 'waiting': return 'update'
    case 'failed': return 'retry'
    case 'updating': return 'updating'
    case 'downloaded': return 'install'
    case 'handled': return 'clear'
    default: return null
  }
})
const actionLabel = computed(() => {
  if (action.value === 'retry') return t('settings.notifications.tryAgain')
  return t(props.row.kind === 'app' ? 'settings.notifications.app.download' : 'settings.notifications.update')
})
const runUpdate = () => {
  if (blockedByAgents.value) return
  if (props.row.kind === 'app') void notifications.downloadApp()
  else emit('update', props.row)
}
</script>
