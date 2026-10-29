<template>
  <div class="flex w-full max-w-5xl flex-col gap-6 px-5 py-6 sm:px-8" data-testid="settings-model-routing-panel">
    <header>
      <div class="flex items-start justify-between gap-4">
        <h2 class="text-2xl font-semibold leading-tight text-gray-900">{{ t('settings.modelRouting.title') }}</h2>
        <button
          type="button"
          role="switch"
          class="relative mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
          :class="enabled ? 'bg-blue-600' : 'bg-slate-300'"
          :aria-checked="enabled"
          :aria-label="t('settings.modelRouting.switchLabel')"
          :disabled="!status || saving"
          data-testid="model-routing-switch"
          @click="setEnabled(!enabled)"
        >
          <span aria-hidden="true" class="inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform" :class="enabled ? 'translate-x-5' : 'translate-x-0.5'" />
        </button>
      </div>
      <p class="mt-1 max-w-2xl text-sm text-gray-500">{{ t('settings.modelRouting.description') }}</p>
      <ModelRoutingStatusStrip :status="status" :node-name="nodeName" :own-node="ownNode" :setup-link="activeTab !== 'setup'" @show-setup="select('setup')" />
      <p v-if="error" class="mt-2 text-sm text-red-600" role="alert" data-testid="model-routing-error">{{ error }}</p>
    </header>

    <div class="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-slate-100">
      <div class="flex gap-7 overflow-x-auto" role="tablist" :aria-label="t('settings.modelRouting.tabs.label')">
        <button
          v-for="tab in TABS"
          :id="`model-routing-tab-${tab}`"
          :key="tab"
          type="button"
          role="tab"
          :aria-selected="activeTab === tab"
          :aria-controls="`model-routing-panel-${tab}`"
          :tabindex="activeTab === tab ? 0 : -1"
          class="whitespace-nowrap border-b-2 bg-transparent px-0 pb-[11px] pt-[3px] text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          :class="activeTab === tab ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-600 hover:text-slate-900'"
          :data-testid="`model-routing-tab-${tab}`"
          @click="select(tab)"
          @keydown.right.prevent="move(1)"
          @keydown.left.prevent="move(-1)"
        >
          {{ t(`settings.modelRouting.tabs.${tab}`) }}
        </button>
      </div>
      <!-- The one control of a tab sits in the tab row, at the right. -->
      <div class="ml-auto pb-1.5" data-testid="model-routing-tab-control">
        <ModelRoutingSegmented v-if="activeTab === 'decisions' && hasDecisions" v-model="sourceFilter" :options="sourceOptions" :label="t('settings.modelRouting.decisions.filterSource')" testid="model-routing-filter" />
        <ModelRoutingSegmented v-else-if="activeTab === 'overview'" v-model="period" :options="periodOptions" :label="t('settings.modelRouting.overview.period')" testid="model-routing-period" />
      </div>
    </div>

    <div :id="`model-routing-panel-${activeTab}`" role="tabpanel" :aria-labelledby="`model-routing-tab-${activeTab}`" class="flex flex-col gap-5">
      <ModelRoutingSetup v-if="activeTab === 'setup'" :status="status" :saving="saving" @choose-launch="setLaunch" @open-agent="openAgent" />
      <ModelRoutingDecisions v-else-if="activeTab === 'decisions'" v-model:source="sourceFilter" :status="status" :focus="focus" @show-setup="select('setup')" @loaded="hasDecisions = $event" />
      <ModelRoutingOverview v-else-if="activeTab === 'overview'" :period="period" :status="status" @show-setup="select('setup')" />
      <AgentRuntimesNowSection v-else />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApolloClient } from '~/utils/apolloClient'
import { isOwnNodeWindow } from '~/utils/ownNodeWindow'
import { useNodeStore } from '~/stores/nodeStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { ModelRoutingStatusQuery } from '~/graphql/queries/modelRoutingQueries'
import { OpenModelRouterAgent, SetModelRouterLaunch, SetModelRoutingEnabled } from '~/graphql/mutations/modelRoutingMutations'
import type { DecisionLocator, ModelRouterLaunch, ModelRoutingStatus } from '~/types/modelRouting'
import { buildAgentRunChatRoute } from '~/services/workspace/workspaceNavigationService'
import AgentRuntimesNowSection from './AgentRuntimesNowSection.vue'
import ModelRoutingStatusStrip from './ModelRoutingStatusStrip.vue'
import ModelRoutingSegmented from './ModelRoutingSegmented.vue'
import ModelRoutingSetup from './ModelRoutingSetup.vue'
import ModelRoutingDecisions from './ModelRoutingDecisions.vue'
import ModelRoutingOverview from './ModelRoutingOverview.vue'

const TABS = ['setup', 'decisions', 'overview', 'runtimes'] as const
type Tab = typeof TABS[number]

const { t } = useLocalization()
const route = useRoute()
const router = useRouter()
const node = useWindowNodeContextStore()
const nodeStore = useNodeStore()

const ownNode = computed(() => isOwnNodeWindow(node))
const nodeName = computed(() => nodeStore.getEntryById(node.entryId)?.name || t('settings.components.settings.NodeManager.currentNodeUnknown'))

/** The node's Model Routing status (the switch, the router's launch, and why it is not active). */
const status = shallowRef<ModelRoutingStatus | null>(null)
const enabled = computed(() => status.value?.enabled ?? false)
const saving = ref(false)
const error = ref('')
const messageOf = (cause: unknown): string => (cause instanceof Error ? cause.message : String(cause))

const readStatus = async (): Promise<void> => {
  try {
    if (!await node.waitForBoundBackendReady()) return
    const { data } = await getApolloClient().query({ query: ModelRoutingStatusQuery, fetchPolicy: 'network-only', context: { queryDeduplication: false } })
    status.value = data.modelRoutingStatus as ModelRoutingStatus
  } catch (cause) {
    error.value = messageOf(cause)
  }
}

const mutate = async (run: () => Promise<ModelRoutingStatus>): Promise<void> => {
  saving.value = true
  error.value = ''
  try { status.value = await run() } catch (cause) { error.value = messageOf(cause) } finally { saving.value = false }
}
const setEnabled = (next: boolean): Promise<void> => mutate(async () =>
  (await getApolloClient().mutate({ mutation: SetModelRoutingEnabled, variables: { enabled: next } })).data.setModelRoutingEnabled)
const setLaunch = (launch: ModelRouterLaunch): Promise<void> => mutate(async () =>
  (await getApolloClient().mutate({ mutation: SetModelRouterLaunch, variables: { ...launch } })).data.setModelRouterLaunch)

/** "Talk to the router" opens the router's run by its ID, whether internal agents are shown or not. */
const openAgent = async (): Promise<void> => {
  saving.value = true
  error.value = ''
  try {
    const runId = (await getApolloClient().mutate({ mutation: OpenModelRouterAgent })).data.openModelRouterAgent as string
    await router.push(buildAgentRunChatRoute(runId))
  } catch (cause) {
    error.value = messageOf(cause)
  } finally {
    saving.value = false
  }
}

const load = (): void => { status.value = null; void readStatus() }
onMounted(load)
watch(() => node.bindingRevision, load)

// The controls of Decisions and Overview live in the tab row.
const hasDecisions = ref(false)
const sourceFilter = ref('')
const period = ref('30d')
const sourceOptions = computed(() => [
  { value: '', label: t('settings.modelRouting.decisions.allSources') },
  { value: 'router', label: t('settings.modelRouting.source.router') },
  { value: 'not_router', label: t('settings.modelRouting.decisions.filterNotRouted') },
])
const periodOptions = computed(() => (['7d', '30d', 'all'] as const).map((value) => ({ value, label: t(`settings.modelRouting.overview.period.${value}`) })))

const queryTab = (): Tab | null => {
  const value = String(route.query.tab ?? '')
  return (TABS as readonly string[]).includes(value) ? value as Tab : null
}
/** "View decision" from a run's Settings: the delegating run, the copy and the agent. */
const focus = computed<DecisionLocator | null>(() => {
  const { decisionRun, decisionCopy, decisionAgent } = route.query
  return typeof decisionRun === 'string' && typeof decisionCopy === 'string' && typeof decisionAgent === 'string'
    ? { runId: decisionRun, copy: decisionCopy, agent: decisionAgent } : null
})
const activeTab = ref<Tab>(queryTab() ?? 'setup')
// Once the status is known: Decisions while Model Routing is on and set, else Configuration (unless the URL names a tab).
watch(status, (value, previous) => {
  if (!previous && value && !queryTab()) activeTab.value = value.enabled && value.routerLaunch ? 'decisions' : 'setup'
})
watch(() => route.query.tab, () => { const next = queryTab(); if (next) activeTab.value = next })

const select = (tab: Tab): void => {
  activeTab.value = tab
  void router.replace({ query: { ...route.query, section: 'model-routing', tab, decisionRun: undefined, decisionCopy: undefined, decisionAgent: undefined } })
}
const move = (delta: number): void => {
  const next = TABS[(TABS.indexOf(activeTab.value) + delta + TABS.length) % TABS.length]
  select(next)
  void Promise.resolve().then(() => document.getElementById(`model-routing-tab-${next}`)?.focus())
}
</script>
