<template>
  <section
    class="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm"
    data-testid="agent-runtimes-now"
    aria-labelledby="agent-runtimes-now-heading"
  >
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div class="min-w-0 max-w-3xl">
        <h3 id="agent-runtimes-now-heading" class="text-xl font-semibold leading-tight text-gray-900">{{ t('settings.modelRouting.runtimesNow.title') }}</h3>
        <p class="mt-1 text-sm text-gray-500">{{ t('settings.modelRouting.runtimesNow.description') }}</p>
        <p class="mt-3 text-sm text-gray-500" data-testid="agent-runtimes-now-node">
          <span class="font-medium text-gray-700">{{ nodeName }}</span>
          <span class="mx-1.5 text-gray-300" aria-hidden="true">·</span>{{ ownNode ? t('settings.modelRouting.runtimesNow.node.own') : t('settings.modelRouting.runtimesNow.node.remote') }}
        </p>
      </div>
      <div v-if="status !== 'loading'" class="flex flex-shrink-0 items-center gap-3 sm:pt-1">
        <p v-if="report && !reading" class="text-sm text-gray-500" data-testid="agent-runtimes-now-checked">{{ t('settings.modelRouting.runtimesNow.checkedAt', { time: localTime(report.checkedAt, locale) }) }}</p>
        <button
          type="button"
          class="inline-flex min-h-9 items-center whitespace-nowrap rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
          :disabled="reading"
          data-testid="agent-runtimes-now-check-again"
          @click="read()"
        >
          <span v-if="reading" class="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" aria-hidden="true"></span>
          {{ reading ? t('settings.modelRouting.runtimesNow.checking') : t('settings.modelRouting.runtimesNow.checkAgain') }}
        </button>
      </div>
    </div>

    <div v-if="status === 'loading'" class="mt-5 space-y-3" data-testid="agent-runtimes-now-loading" aria-busy="true">
      <p class="text-sm text-gray-500">{{ t('settings.modelRouting.runtimesNow.loading') }}</p>
      <div v-for="n in 3" :key="n" class="h-[76px] animate-pulse rounded-lg border border-gray-100 bg-gray-50"></div>
    </div>

    <div
      v-else-if="status === 'error'"
      class="mt-5 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      role="alert"
      data-testid="agent-runtimes-now-error"
    >
      <span>{{ t('settings.modelRouting.runtimesNow.loadError') }}</span>
    </div>

    <template v-else-if="report">
      <p v-if="checkFailed" class="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800" role="alert" data-testid="agent-runtimes-now-check-failed">{{ t('settings.modelRouting.runtimesNow.checkFailed') }}</p>
      <p v-if="!report.agentRuntimes.length" class="mt-5 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-gray-500" data-testid="agent-runtimes-now-empty">{{ t('settings.modelRouting.runtimesNow.empty') }}</p>
      <div v-else class="available-runtimes-list mt-5 overflow-hidden rounded-xl border border-slate-200">
        <ul class="divide-y divide-slate-100" :aria-label="t('settings.modelRouting.runtimesNow.listLabel')" data-testid="agent-runtimes-now-list">
          <AvailableAgentRuntimeRow v-for="entry in report.agentRuntimes" :key="entry.runtime" :entry="entry" />
        </ul>
      </div>
    </template>

    <p class="sr-only" role="status" aria-live="polite" data-testid="agent-runtimes-now-announce">{{ announcement }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { getApolloClient } from '~/utils/apolloClient'
import { isOwnNodeWindow } from '~/utils/ownNodeWindow'
import { useNodeStore } from '~/stores/nodeStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { AvailableAgentRuntimes } from '~/graphql/queries/availableAgentRuntimesQueries'
import type { AvailableAgentRuntimesReport } from '~/types/availableAgentRuntimes'
import AvailableAgentRuntimeRow from './AvailableAgentRuntimeRow.vue'
import { localTime } from './availableAgentRuntimesPresentation'

const { t, resolvedLocale } = useLocalization()
const locale = computed(() => String(resolvedLocale.value || 'en'))
const node = useWindowNodeContextStore()
const nodeStore = useNodeStore()

const report = shallowRef<AvailableAgentRuntimesReport | null>(null)
/** `loading`: the first read for this node; `error`: it failed; `ready`: rows shown (a later failed read keeps them). */
const status = ref<'loading' | 'error' | 'ready'>('loading')
const reading = ref(false)
const checkFailed = ref(false)
const announcement = ref('')
let latest = 0
let disposed = false

const ownNode = computed(() => isOwnNodeWindow(node))
const nodeName = computed(() => nodeStore.getEntryById(node.entryId)?.name
  || t('settings.components.settings.NodeManager.currentNodeUnknown'))

/** Reads the node's runtimes live: on open, on "Check again", and when another node is bound to this window. */
const read = async (): Promise<void> => {
  const seq = ++latest
  const revision = node.bindingRevision
  const current = () => !disposed && seq === latest && node.bindingRevision === revision
  reading.value = true
  if (!report.value) status.value = 'loading'
  try {
    if (!await node.waitForBoundBackendReady()) throw new Error(node.lastReadyError || 'Bound backend is not ready')
    const { data, errors } = await getApolloClient().query({
      query: AvailableAgentRuntimes, fetchPolicy: 'network-only', context: { queryDeduplication: false },
    })
    if (errors?.length) throw new Error('availableAgentRuntimes failed')
    if (!current()) return
    report.value = data.availableAgentRuntimes as AvailableAgentRuntimesReport
    status.value = 'ready'
    checkFailed.value = false
    announcement.value = t('settings.modelRouting.runtimesNow.announce.checked')
  } catch {
    if (!current()) return
    if (report.value) checkFailed.value = true
    else status.value = 'error'
  } finally {
    if (seq === latest) reading.value = false
  }
}

watch(() => node.bindingRevision, () => {
  report.value = null
  checkFailed.value = false
  void read()
})
onMounted(() => { void read() })
onUnmounted(() => { disposed = true; latest += 1 })
</script>

<style scoped>
.available-runtimes-list { container: available-runtimes / inline-size; }
</style>
