<template>
  <div class="flex w-full flex-col gap-5" data-testid="settings-agent-runtimes-panel">
    <section
      class="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm"
      data-testid="agent-runtimes-card"
      aria-labelledby="agent-runtimes-heading"
    >
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div class="min-w-0 max-w-3xl">
          <h3 id="agent-runtimes-heading" class="text-2xl font-semibold leading-tight text-gray-900">{{ t('settings.agentRuntimes.title') }}</h3>
          <p class="mt-1 text-sm text-gray-500" data-testid="agent-runtimes-description">{{ t('settings.agentRuntimes.description') }}</p>
          <p v-if="loadStatus !== 'error'" class="mt-3 text-sm text-gray-500" data-testid="agent-runtimes-node">
            <span class="font-medium text-gray-700">{{ nodeName }}</span>
            <span class="mx-1.5 text-gray-300" aria-hidden="true">·</span>{{ nodeAccess === 'own' ? t('settings.agentRuntimes.node.own') : t('settings.agentRuntimes.node.remote') }}
          </p>
        </div>
        <div v-if="loadStatus === 'ready'" class="flex flex-shrink-0 items-center gap-3 sm:pt-1">
          <p v-if="!isChecking && minutesSinceCheck !== null" class="text-sm text-gray-500" data-testid="agent-runtimes-checked">
            {{ minutesSinceCheck < 1 ? t('settings.agentRuntimes.checked.justNow') : t('settings.agentRuntimes.checked.minutes', { minutes: minutesSinceCheck }) }}
          </p>
          <button
            type="button"
            :class="secondaryButton"
            :disabled="isChecking"
            data-testid="agent-runtimes-check-again"
            @click="state.check()"
          >
            <span v-if="isChecking" class="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" aria-hidden="true"></span>
            {{ isChecking ? t('settings.agentRuntimes.checking') : t('settings.agentRuntimes.checkAgain') }}
          </button>
        </div>
      </div>

      <p
        v-if="loadStatus === 'ready' && nodeAccess !== 'own'"
        class="mt-4 rounded-lg bg-gray-50 px-3 py-2.5 text-sm text-gray-700"
        data-testid="agent-runtimes-remote-note"
      >{{ nodeAccess === 'remoteDesktop' ? t('settings.agentRuntimes.node.remoteDesktopNote') : t('settings.agentRuntimes.node.remoteNote') }}</p>

      <div v-if="loadStatus === 'loading'" class="mt-5 space-y-3" data-testid="agent-runtimes-loading" aria-busy="true">
        <div v-for="n in 4" :key="n" class="h-[68px] animate-pulse rounded-lg border border-gray-100 bg-gray-50"></div>
      </div>

      <div
        v-else-if="loadStatus === 'error'"
        class="mt-5 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        role="alert"
        data-testid="agent-runtimes-load-error"
      >
        <span>{{ t('settings.agentRuntimes.loadError') }}</span>
        <button type="button" class="rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500" data-testid="agent-runtimes-load-retry" @click="state.check()">{{ t('settings.agentRuntimes.retry') }}</button>
      </div>

      <div v-else class="agent-runtimes-list mt-5 overflow-hidden rounded-xl border border-slate-200" data-testid="agent-runtimes-list">
        <div class="agent-runtimes-columns border-b border-slate-200 bg-gray-50 px-4 py-2 text-xs font-medium text-gray-500" aria-hidden="true" data-testid="agent-runtimes-columns">
          <span>{{ t('settings.agentRuntimes.columns.runtime') }}</span>
          <span>{{ t('settings.agentRuntimes.columns.installed') }}</span>
          <span>{{ t('settings.agentRuntimes.columns.updates') }}</span>
          <span>{{ t('settings.agentRuntimes.columns.account') }}</span>
          <span></span>
        </div>
        <ul class="divide-y divide-slate-100" :aria-label="t('settings.agentRuntimes.listLabel')">
          <AgentRuntimeRow
            v-for="runtime in runtimes ?? []"
            :key="runtime.runtimeKind"
            :runtime="runtime"
            :node-access="nodeAccess"
            @update="state.update(runtime.runtimeKind)"
            @sign-in="state.signIn(runtime.runtimeKind)"
            @cancel-sign-in="state.cancelSignIn(runtime.runtimeKind)"
          />
        </ul>
      </div>
    </section>

    <p class="sr-only" role="status" aria-live="polite" data-testid="agent-runtimes-announce">{{ announcement }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useNodeStore } from '~/stores/nodeStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { isRowChecking, useAgentRuntimes, type AgentRuntimeAnnouncement } from '~/composables/settings/useAgentRuntimes'
import AgentRuntimeRow from './AgentRuntimeRow.vue'
import { runtimeName, type AgentRuntimeNodeAccess } from './agentRuntimesPresentation'
import { isOwnNodeWindow } from '~/utils/ownNodeWindow'

const { t } = useLocalization()
const nodeStore = useNodeStore()
const windowNodeContextStore = useWindowNodeContextStore()
const state = useAgentRuntimes()
const { runtimes, loadStatus, signInBrowserAvailable } = state

const secondaryButton = 'inline-flex min-h-9 items-center whitespace-nowrap rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1'

// The own node does everything. A remote node signs in when its server can open a browser on its own desktop (the user
// finishes there, in the VNC Viewer); otherwise it is status only.
const nodeAccess = computed<AgentRuntimeNodeAccess>(() => {
  if (isOwnNodeWindow(windowNodeContextStore)) return 'own'
  return signInBrowserAvailable.value ? 'remoteDesktop' : 'remoteStatusOnly'
})
const nodeName = computed(() => nodeStore.getEntryById(windowNodeContextStore.entryId)?.name
  || t('settings.components.settings.NodeManager.currentNodeUnknown'))
const isChecking = computed(() => state.requestingCheck.value || (runtimes.value ?? []).some(isRowChecking))

const now = ref(Date.now())
let clock: ReturnType<typeof setInterval> | null = null
const minutesSinceCheck = computed(() => {
  const times = (runtimes.value ?? []).map((runtime) => runtime.checkedAt).filter((time): time is string => !!time)
  if (!times.length) return null
  const latest = Math.max(...times.map((time) => Date.parse(time)))
  return Math.max(0, Math.floor((now.value - latest) / 60_000))
})

const announcementText = (item: AgentRuntimeAnnouncement): string => {
  switch (item.kind) {
    case 'checked': return t('settings.agentRuntimes.announce.checked')
    case 'updated': return t('settings.agentRuntimes.announce.updated', { name: runtimeName(item.runtimeKind), version: item.version })
    case 'updateFailed': return t('settings.agentRuntimes.announce.updateFailed', { name: runtimeName(item.runtimeKind) })
    case 'signedIn': return t('settings.agentRuntimes.announce.signedIn', { name: runtimeName(item.runtimeKind) })
  }
}
const announcement = computed(() => state.announcements.value.map(announcementText).join(' '))

// Opening the page checks every runtime on the node, each on its own.
onMounted(() => {
  clock = setInterval(() => { now.value = Date.now() }, 30_000)
  void state.check()
})
onUnmounted(() => { if (clock) clearInterval(clock) })
</script>

<style scoped>
/* The list's width (not the viewport's) decides between the table and stacked rows; see AgentRuntimeRow.vue. */
.agent-runtimes-list { container: agent-runtimes / inline-size; }
.agent-runtimes-columns { display: none; }

@container agent-runtimes (min-width: 58rem) {
  .agent-runtimes-columns {
    display: grid;
    grid-template-columns: 8rem 9rem minmax(0, 1fr) 15rem 8rem;
    column-gap: 1.5rem;
  }
}
</style>
