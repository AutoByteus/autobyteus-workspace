<template>
  <section class="" data-testid="model-routing-decisions" :aria-label="t('settings.modelRouting.decisions.title')">
    <p v-if="loaded && status && !status.enabled && totalAll" class="mt-4 text-sm text-gray-500" data-testid="model-routing-decisions-off-note">{{ t('settings.modelRouting.decisions.offNote') }}</p>
    <p v-else-if="status?.enabled && !status.active" class="mt-4 text-sm text-amber-800" data-testid="model-routing-decisions-inactive-note">{{ t('settings.modelRouting.decisions.inactiveNote') }}</p>

    <p v-if="loadError" class="mt-4 text-sm text-red-600" role="alert" data-testid="model-routing-decisions-error">{{ loadError }}</p>

    <!-- Empty -->
    <div v-if="loaded && !totalAll" class="mt-5 rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center" data-testid="model-routing-decisions-empty">
      <p class="text-sm font-medium text-gray-700">{{ status?.enabled ? t('settings.modelRouting.decisions.emptyOn') : t('settings.modelRouting.decisions.emptyOff') }}</p>
      <p class="mx-auto mt-1 max-w-xl text-sm text-gray-500">{{ status?.enabled ? t('settings.modelRouting.decisions.emptyOnHint') : t('settings.modelRouting.decisions.emptyOffHint') }}</p>
      <button v-if="!status?.enabled" type="button" class="mt-3 text-sm font-medium text-blue-700 hover:text-blue-800" @click="emit('show-setup')">{{ t('settings.modelRouting.status.goToSetup') }}</button>
    </div>

    <div v-else-if="loaded && !groups.length" class="mt-5 rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center" data-testid="model-routing-decisions-no-match">
      <p class="text-sm text-gray-600">{{ t('settings.modelRouting.decisions.noMatch') }}</p>
      <button type="button" class="mt-2 text-sm font-medium text-blue-700 hover:text-blue-800" @click="emit('update:source', '')">{{ t('settings.modelRouting.decisions.clearFilters') }}</button>
    </div>

    <template v-else-if="groups.length">
      <ul data-testid="model-routing-decisions-list" :aria-label="t('settings.modelRouting.decisions.title')">
        <li
          v-for="task in tasks"
          :key="task.key"
          class="border-t border-slate-100 py-5 first:border-t-0 first:pt-0 transition-colors"
          :class="task.delegations.some((item) => item.id === focusId) ? '-mx-3 rounded-xl bg-blue-50/60 px-3 ring-1 ring-blue-200' : ''"
          :data-testid="`model-routing-task-${task.taskKey ?? NO_TASK}`"
        >
          <!-- The Task: its key (a link to its page) and title; with one delegation its time and Open run at the right -->
          <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
            <div class="flex min-w-0 flex-1 basis-64 items-baseline gap-x-2">
              <template v-if="task.taskKey">
                <NuxtLink v-if="task.link" :to="task.link" class="flex-shrink-0 text-sm text-gray-500 underline decoration-gray-300 underline-offset-2 hover:text-blue-700 hover:decoration-blue-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" data-testid="model-routing-task-link"><TaskKey :task-key="task.taskKey" /></NuxtLink>
                <span v-else class="flex-shrink-0 text-sm text-gray-400"><TaskKey :task-key="task.taskKey" /></span>
              </template>
              <span v-else class="flex-shrink-0 text-sm text-gray-400">{{ t('settings.modelRouting.decisions.noProjectTask') }}</span>
              <p class="min-w-0 break-words text-base font-semibold text-gray-900" :title="task.taskTitle">{{ task.taskTitle }}</p>
            </div>
            <p v-if="task.delegations.length === 1" class="flex flex-shrink-0 items-baseline gap-4 text-sm">
              <span class="whitespace-nowrap text-gray-400">{{ decisionTime(task.delegations[0]!.recordedAt, locale, t) }}</span>
              <button v-if="task.delegations[0]!.delegatingRunId" type="button" class="inline-flex items-center gap-1 whitespace-nowrap font-medium text-blue-700 hover:text-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1" data-testid="model-routing-decision-open-run" :title="t('settings.modelRouting.decisions.openRunTitle', { delegator: task.delegations[0]!.delegatingAgentName })" @click="openRun(task.delegations[0]!.delegatingRunId!)">
                {{ t('settings.modelRouting.decisions.openRun') }}<Icon icon="heroicons:arrow-top-right-on-square" class="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </p>
          </div>

          <!-- Each delegation of the Task: a team is one folded row; an agent shows its launch -->
          <div v-for="item in task.delegations" :id="`decision-${item.id}`" :key="item.id" class="mt-2" :data-testid="`model-routing-decision-${item.copyAddress}`">
            <div v-if="showRow(task, item)" class="flex items-center justify-between gap-4">
              <component
                :is="item.isTeam ? 'button' : 'div'"
                :type="item.isTeam ? 'button' : undefined"
                :aria-expanded="item.isTeam ? isOpen(item.id) : undefined"
                class="-ml-1 flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                :class="item.isTeam ? 'hover:bg-slate-50' : ''"
                :data-testid="`model-routing-delegation-${item.copyAddress}`"
                @click="item.isTeam && toggle(item.id)"
              >
                <Icon v-if="item.isTeam" icon="heroicons:chevron-right-20-solid" class="h-4 w-4 flex-shrink-0 text-gray-400 transition-transform" :class="isOpen(item.id) ? 'rotate-90' : ''" aria-hidden="true" />
                <span class="font-medium text-gray-800">{{ item.targetName }}</span>
                <template v-if="item.isTeam && !isOpen(item.id)">
                  <span class="inline-flex items-center gap-1" aria-hidden="true"><span v-for="runtime in runtimesOf(item.records)" :key="runtime" class="inline-block h-2.5 w-2.5 rounded-[3px]" :style="{ backgroundColor: runtimeColor(runtime) }"></span></span>
                  <span class="text-gray-400">{{ t(item.records.length === 1 ? 'settings.modelRouting.decisions.agentCountOne' : 'settings.modelRouting.decisions.agentCount', { count: item.records.length }) }}</span>
                  <Icon v-if="hasNote(item)" icon="heroicons:exclamation-triangle" class="h-3.5 w-3.5 flex-shrink-0 text-amber-600" :title="t('settings.modelRouting.decisions.hasNotes')" />
                </template>
              </component>
              <p v-if="task.delegations.length > 1" class="flex flex-shrink-0 items-baseline gap-4 text-sm">
                <span class="whitespace-nowrap text-gray-400">{{ decisionTime(item.recordedAt, locale, t) }}</span>
                <button v-if="item.delegatingRunId" type="button" class="inline-flex items-center gap-1 whitespace-nowrap font-medium text-blue-700 hover:text-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1" data-testid="model-routing-decision-open-run" :title="t('settings.modelRouting.decisions.openRunTitle', { delegator: item.delegatingAgentName })" @click="openRun(item.delegatingRunId)">
                  {{ t('settings.modelRouting.decisions.openRun') }}<Icon icon="heroicons:arrow-top-right-on-square" class="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </p>
            </div>

            <template v-if="!item.isTeam || isOpen(item.id)">
              <p v-if="item.failure" class="mt-1 flex items-start gap-1.5 pl-5 text-xs text-amber-800" data-testid="model-routing-decision-failure">
                <Icon icon="heroicons:exclamation-triangle" class="mt-px h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                <span>{{ t('settings.modelRouting.decisions.failure', { reason: failureText(item.failure) }) }}</span>
              </p>
              <ul :class="item.isTeam ? 'mt-1 pl-5' : showRow(task, item) ? 'mt-1' : ''">
                <li v-for="record in item.records" :key="record.agentAddress" class="py-1.5" data-testid="model-routing-decision-row">
                  <div class="grid gap-x-4 gap-y-0.5" :class="showName(task, item) ? 'sm:grid-cols-[14rem_minmax(0,1fr)]' : ''">
                    <p v-if="showName(task, item)" class="flex min-w-0 items-center gap-2 text-sm font-medium text-gray-900">
                      <span :class="item.isTeam ? 'truncate' : ''" :title="nameOf(item, record)">{{ nameOf(item, record) }}</span>
                    </p>
                    <div class="min-w-0">
                      <p class="flex min-w-0 flex-wrap items-baseline gap-x-2 text-sm text-gray-800">
                        <span class="inline-block h-2.5 w-2.5 flex-shrink-0 translate-y-px self-center rounded-[3px]" :style="{ backgroundColor: runtimeColor(record.runtimeKind) }" aria-hidden="true"></span>
                        <span class="min-w-0 truncate"><span class="font-medium">{{ runtimeName(record.runtimeKind) }}</span><span class="text-gray-400"> · </span>{{ record.llmModelIdentifier }}</span>
                        <span v-if="record.source !== 'model_router'" class="flex-shrink-0 text-xs" :class="record.source === 'inherited' ? 'text-amber-700' : 'text-gray-400'">{{ t(SOURCE_KEY[record.source]) }}</span>
                      </p>
                      <p v-if="record.choiceReason" class="mt-0.5 text-xs text-gray-500" data-testid="model-routing-decision-reason">{{ record.choiceReason }}</p>
                      <p v-for="(layer, index) in record.skipped" :key="index" class="mt-1 flex items-start gap-1 text-xs text-amber-700" data-testid="model-routing-decision-skipped">
                        <Icon icon="heroicons:exclamation-triangle" class="mt-px h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" /><span>{{ skippedText(layer) }}</span>
                      </p>
                    </div>
                  </div>
                </li>
              </ul>
            </template>
          </div>
        </li>
      </ul>
      <div class="mt-4 flex items-center justify-between gap-3 text-sm text-gray-500">
        <p>{{ t('settings.modelRouting.decisions.shown', { shown: groups.length, total: totalTasks }) }}</p>
        <button v-if="groups.length < totalTasks" type="button" :disabled="loading" class="inline-flex min-h-9 items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1" data-testid="model-routing-decisions-more" @click="loadPage()">{{ t('settings.modelRouting.decisions.showMore') }}</button>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { getApolloClient } from '~/utils/apolloClient'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { ModelRoutingDecisionsQuery } from '~/graphql/queries/modelRoutingQueries'
import { buildAgentRunChatRoute } from '~/services/workspace/workspaceNavigationService'
import type {
  DecisionLocator, ModelRoutingStatus, RoutingDecisionDelegation, RoutingDecisionPage, RoutingDecisionRecord, RoutingDecisionTaskGroup,
} from '~/types/modelRouting'
import TaskKey from '~/components/projects/TaskKey.vue'
import { agentName, decisionTime, runtimeColor, runtimeName, SOURCE_KEY } from './modelRoutingPresentation'

const props = defineProps<{ status: ModelRoutingStatus | null; focus: DecisionLocator | null; source: string }>()
const emit = defineEmits<{ (event: 'show-setup'): void; (event: 'update:source', value: string): void; (event: 'loaded', hasDecisions: boolean): void }>()
const { t, resolvedLocale } = useLocalization()
const router = useRouter()
const node = useWindowNodeContextStore()
const locale = computed(() => String(resolvedLocale.value || 'en'))

const PAGE = 8
/** "View decision" reads at most this many pages to find its delegation. */
const FOCUS_PAGES = 12
const NO_TASK = '__no_project_task__'

const groups = shallowRef<readonly RoutingDecisionTaskGroup[]>([])
const totalTasks = ref(0)
/** Every Task with a decision, whatever the filter (the empty and "off with history" states). */
const totalAll = ref(0)
const loaded = ref(false)
const loading = ref(false)
const loadError = ref('')

const SOURCE_FILTERS: Readonly<Record<string, string>> = { router: 'ROUTER', not_router: 'NOT_ROUTER' }

const fetchPage = async (before: string | null, source: string): Promise<RoutingDecisionPage> => {
  const { data } = await getApolloClient().query({
    query: ModelRoutingDecisionsQuery,
    variables: { limit: PAGE, before, source: SOURCE_FILTERS[source] ?? null },
    fetchPolicy: 'network-only', context: { queryDeduplication: false },
  })
  return data.modelRoutingDecisions as RoutingDecisionPage
}

/** The next page of Task groups (newest first), continuing after the last one shown. */
const loadPage = async (): Promise<number> => {
  loading.value = true
  loadError.value = ''
  try {
    const before = groups.value.at(-1)?.latestAt ?? null
    const page = await fetchPage(before, props.source)
    groups.value = [...groups.value, ...page.groups]
    totalTasks.value = page.totalTasks
    return page.groups.length
  } catch (cause) {
    loadError.value = cause instanceof Error ? cause.message : String(cause)
    return 0
  } finally {
    loading.value = false
  }
}

const reload = async (): Promise<void> => {
  if (!await node.waitForBoundBackendReady()) return
  groups.value = []
  loaded.value = false
  if (!props.source) {
    await loadPage()
    totalAll.value = totalTasks.value
  } else {
    const [, all] = await Promise.all([loadPage(), fetchPage(null, '').catch(() => null)])
    totalAll.value = all?.totalTasks ?? totalTasks.value
  }
  if (props.focus) {
    for (let page = 1; page < FOCUS_PAGES && !focusId.value && groups.value.length < totalTasks.value; page += 1) {
      if (!await loadPage()) break
    }
    if (focusId.value) opened.value = new Set([...opened.value, focusId.value])
  }
  loaded.value = true
  emit('loaded', totalAll.value > 0)
  if (focusId.value) void nextTick(() => document.getElementById(`decision-${focusId.value}`)?.scrollIntoView({ block: 'center' }))
}
onMounted(() => { void reload() })
watch(() => props.source, () => { void reload() })
watch(() => node.bindingRevision, () => { void reload() })

type DelegationView = RoutingDecisionDelegation & Readonly<{ id: string; isTeam: boolean; targetName: string; failure: string | null }>
type TaskView = Readonly<{ key: string; taskKey: string | null; taskTitle: string; link: string | null; delegations: readonly DelegationView[] }>

const delegationId = (item: RoutingDecisionDelegation): string => `${item.recordedAt}|${item.delegatingRunId ?? item.fromNode ?? ''}|${item.copyAddress}`
const tasks = computed<readonly TaskView[]>(() => groups.value.map((group) => ({
  key: group.taskId ?? `${NO_TASK}:${delegationId(group.delegations[0]!)}`,
  taskKey: group.taskKey,
  taskTitle: group.taskTitle,
  link: group.taskKey && group.projectId && group.taskId ? `/projects/${group.projectId}/tasks/${group.taskId}` : null,
  delegations: group.delegations.map((item) => ({
    ...item,
    id: delegationId(item),
    isTeam: item.copyKind === 'agent_team',
    targetName: agentName(item.copyAddress).replace(/_/g, ' '),
    failure: item.records.find((record) => record.routerFailure)?.routerFailure ?? null,
  })),
})))

/** The delegation "View decision" points at (D9: delegating run + copy + agent). */
const focusId = computed(() => {
  if (!props.focus) return null
  for (const task of tasks.value) {
    const found = task.delegations.find((item) => item.delegatingRunId === props.focus!.runId && item.copyAddress === props.focus!.copy
      && item.records.some((record) => record.agentAddress === props.focus!.agent))
    if (found) return found.id
  }
  return null
})

const opened = ref(new Set<string>())
const isOpen = (id: string): boolean => opened.value.has(id)
const toggle = (id: string): void => { const next = new Set(opened.value); next.has(id) ? next.delete(id) : next.add(id); opened.value = next }
const runtimesOf = (records: readonly RoutingDecisionRecord[]): string[] => [...new Set(records.map((record) => record.runtimeKind))]
const hasNote = (item: DelegationView): boolean => Boolean(item.failure || item.records.some((record) => record.skipped.length))
/** The row with the delegation's name (and, with several delegations, its time and Open run) exists for a team, or when the Task header cannot carry them. */
const showRow = (task: TaskView, item: DelegationView): boolean => item.isTeam || task.delegations.length > 1
/** An agent shows its name in the launch row when no row above shows it. */
const showName = (task: TaskView, item: DelegationView): boolean => item.isTeam || !showRow(task, item)
const nameOf = (item: DelegationView, record: RoutingDecisionRecord): string => (item.isTeam ? agentName(record.agentAddress) : item.targetName)
const skippedText = (layer: RoutingDecisionRecord['skipped'][number]): string => t('runSettings.delegated.fallback', {
  layer: t(`runSettings.delegated.layer.${layer.layer}`),
  model: `${layer.runtimeKind ? runtimeName(layer.runtimeKind) : '—'} · ${layer.llmModelIdentifier ?? '—'}`,
  detail: layer.detail,
})
/** The failure sentence ends with the router's reason (its own words) and a full stop. */
const failureText = (reason: string): string => (/[.!?]$/.test(reason) ? reason : `${reason}.`)
const openRun = (runId: string): void => { void router.push(buildAgentRunChatRoute(runId)) }
</script>
