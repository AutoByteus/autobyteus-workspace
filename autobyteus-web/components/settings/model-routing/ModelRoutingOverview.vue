<template>
  <section class="" data-testid="model-routing-overview" :aria-label="t('settings.modelRouting.overview.title')">
    <p v-if="loadError" class="mt-4 text-sm text-red-600" role="alert" data-testid="model-routing-overview-error">{{ loadError }}</p>

    <!-- Empty -->
    <div v-if="statistics && !statistics.totalAgents" class="mt-10 text-center" data-testid="model-routing-overview-empty">
      <p class="text-sm font-medium text-gray-700">{{ anyRecords ? t('settings.modelRouting.overview.emptyPeriod') : t('settings.modelRouting.overview.empty') }}</p>
      <p class="mx-auto mt-1 max-w-xl text-sm text-gray-500">{{ anyRecords ? t('settings.modelRouting.overview.emptyPeriodHint') : (status?.enabled ? t('settings.modelRouting.overview.emptyOnHint') : t('settings.modelRouting.overview.emptyOffHint')) }}</p>
      <button v-if="!status?.enabled && !anyRecords" type="button" class="mt-3 text-sm font-medium text-blue-700 hover:text-blue-800" @click="emit('show-setup')">{{ t('settings.modelRouting.status.goToSetup') }}</button>
    </div>

    <template v-else-if="statistics">
      <!-- Who chose the launches: one number, one bar -->
      <div data-testid="model-routing-overview-sources">
        <p class="text-gray-900"><span class="text-3xl font-semibold tabular-nums" data-tile="total">{{ statistics.totalAgents }}</span> <span class="text-base text-gray-600">{{ t('settings.modelRouting.overview.total') }}</span></p>
        <div class="mt-3 flex h-2.5 w-full gap-0.5" role="img" :aria-label="sourceSummary">
          <span v-for="part in sourceParts" :key="part.source" class="h-full min-w-[3px] first:rounded-l last:rounded-r" :style="{ flexGrow: part.count, backgroundColor: part.color }" :title="`${part.label} · ${part.count}`"></span>
        </div>
        <ul class="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-600" data-testid="model-routing-overview-source-legend">
          <li v-for="part in sourceParts" :key="part.source" class="inline-flex items-center gap-1.5">
            <span class="inline-block h-2.5 w-2.5 rounded-[3px]" :style="{ backgroundColor: part.color }" aria-hidden="true"></span>{{ part.label }} <span class="font-medium tabular-nums text-gray-900">{{ part.count }}</span> <span class="tabular-nums text-gray-400">{{ percent(part.count, statistics.totalAgents) }}</span>
          </li>
        </ul>
        <p v-if="statistics.routerFailures" class="mt-2 text-sm text-amber-800">{{ t('settings.modelRouting.overview.failures', { count: statistics.routerFailures }) }}</p>
      </div>

      <!-- By task kind -->
      <div class="mt-10" data-testid="model-routing-overview-kinds">
        <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 class="text-base font-semibold text-gray-900">{{ t('settings.modelRouting.overview.byKind.title') }}</h3>
          <ul class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500" :aria-label="t('settings.modelRouting.overview.byKind.legend')" data-testid="model-routing-overview-runtime-legend">
            <li v-for="runtime in usedRuntimes" :key="runtime" class="inline-flex items-center gap-1.5">
              <span class="inline-block h-2.5 w-2.5 rounded-[3px]" :style="{ backgroundColor: runtimeColor(runtime) }" aria-hidden="true"></span>{{ names.runtimeName(runtime) }}
            </li>
          </ul>
        </div>
        <ul class="mt-2 divide-y divide-slate-100" data-testid="model-routing-overview-kind-list">
          <li v-for="kind in kinds" :key="kind.kind" :data-kind="kind.kind || 'none'">
            <button type="button" class="grid w-full items-center gap-x-4 gap-y-1 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:grid-cols-[9rem_minmax(0,1fr)_1.5rem]" :aria-expanded="open.has(kind.kind)" :data-testid="`model-routing-overview-details-${kind.kind || 'none'}`" @click="toggle(kind.kind)">
              <span class="min-w-0">
                <span class="block text-sm font-medium text-gray-900">{{ kindLabel(kind.kind || null, t) }}</span>
                <span v-if="!kind.kind" class="block text-xs text-gray-400">{{ t('settings.modelRouting.overview.notRoutedHint') }}</span>
              </span>
              <span class="flex min-w-0 items-center gap-3">
                <span class="flex h-2 gap-0.5" role="img" :aria-label="runtimeSummary(kind)" :style="{ width: `${Math.max(8, Math.round((kind.total / maxKindTotal) * 70))}%` }">
                  <span v-for="runtime in kind.runtimes" :key="runtime.runtime" class="h-full min-w-[3px] first:rounded-l last:rounded-r" :style="{ flexGrow: runtime.count, backgroundColor: runtimeColor(runtime.runtime) }" :title="`${names.runtimeName(runtime.runtime)} · ${runtime.count}`"></span>
                </span>
                <span class="flex-shrink-0 text-sm text-gray-500"><span class="font-medium tabular-nums text-gray-800">{{ kind.total }}</span> {{ t(kind.total === 1 ? 'settings.modelRouting.overview.agentOne' : 'settings.modelRouting.overview.agentMany') }}</span>
              </span>
              <Icon icon="heroicons:chevron-down" class="hidden h-4 w-4 text-gray-400 transition-transform sm:block" :class="open.has(kind.kind) ? 'rotate-180' : ''" aria-hidden="true" />
            </button>
            <ul v-if="open.has(kind.kind)" class="mb-3 ml-[9rem] space-y-1 pl-4" :data-testid="`model-routing-overview-models-${kind.kind || 'none'}`">
              <template v-for="runtime in kind.runtimes" :key="runtime.runtime">
                <li v-for="model in runtime.models" :key="`${runtime.runtime}-${model.model}`" class="flex items-center gap-2 text-sm text-gray-700">
                  <span class="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-[3px]" :style="{ backgroundColor: runtimeColor(runtime.runtime) }" aria-hidden="true"></span>
                  <span class="min-w-0 flex-1 truncate" data-testid="model-routing-overview-model"><span class="font-medium">{{ names.modelLabel(runtime.runtime, model.model) }}</span> <span class="text-gray-400">{{ names.modelWithRuntime(runtime.runtime, model.model).runtime }}</span></span>
                  <span class="tabular-nums text-gray-900">{{ model.count }}</span>
                  <span class="w-10 text-right text-xs tabular-nums text-gray-400">{{ percent(model.count, kind.total) }}</span>
                </li>
              </template>
            </ul>
          </li>
        </ul>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { getApolloClient } from '~/utils/apolloClient'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { ModelRoutingStatisticsQuery } from '~/graphql/queries/modelRoutingQueries'
import type { DecisionLaunchSource, ModelRoutingStatus, RoutingStatistics, RoutingStatisticsGroup } from '~/types/modelRouting'
import { kindLabel, runtimeColor, SOURCE_COLORS, SOURCE_KEY } from './modelRoutingPresentation'
import { useModelRoutingNames } from './modelRoutingNames'

const props = defineProps<{ status: ModelRoutingStatus | null; period: string }>()
const emit = defineEmits<{ (event: 'show-setup'): void }>()
const { t } = useLocalization()
const node = useWindowNodeContextStore()

const PERIODS: Readonly<Record<string, string>> = { '7d': 'DAYS_7', '30d': 'DAYS_30', all: 'ALL' }

const statistics = shallowRef<RoutingStatistics | null>(null)
/** Whether any record exists at all (the empty states differ: no records vs none in this period). */
const anyRecords = ref(false)
const loadError = ref('')

const fetchStatistics = async (period: string): Promise<RoutingStatistics> => {
  const { data } = await getApolloClient().query({
    query: ModelRoutingStatisticsQuery, variables: { period }, fetchPolicy: 'network-only', context: { queryDeduplication: false },
  })
  return data.modelRoutingStatistics as RoutingStatistics
}
const load = async (): Promise<void> => {
  loadError.value = ''
  try {
    if (!await node.waitForBoundBackendReady()) return
    const current = await fetchStatistics(PERIODS[props.period] ?? 'DAYS_30')
    anyRecords.value = current.totalAgents > 0 || (props.period !== 'all' && (await fetchStatistics('ALL')).totalAgents > 0)
    statistics.value = current
  } catch (cause) {
    loadError.value = cause instanceof Error ? cause.message : String(cause)
  }
}
onMounted(() => { void load() })
watch(() => props.period, () => { void load() })
watch(() => node.bindingRevision, () => { void load() })

const open = ref(new Set<string>())
const toggle = (kind: string): void => { const next = new Set(open.value); next.has(kind) ? next.delete(kind) : next.add(kind); open.value = next }
const percent = (part: number, total: number): string => (total ? `${Math.round((part / total) * 100)}%` : '—')

const sourceParts = computed(() => (['model_router', 'agent_default', 'team_default', 'inherited'] as DecisionLaunchSource[])
  .map((source) => ({ source, count: statistics.value?.sources[source] ?? 0, label: t(SOURCE_KEY[source]), color: SOURCE_COLORS[source] }))
  .filter((part) => part.count > 0))
const sourceSummary = computed(() => sourceParts.value.map((part) => `${part.label} ${part.count}`).join(', '))

type KindRow = Readonly<{ kind: string; total: number; runtimes: readonly Readonly<{ runtime: string; count: number; models: readonly Readonly<{ model: string; count: number }>[] }>[] }>
const rowOf = (kind: string, group: RoutingStatisticsGroup): KindRow => ({
  kind,
  total: group.count,
  runtimes: group.runtimes.map((runtime) => ({
    runtime: runtime.runtimeKind,
    count: runtime.count,
    models: group.models.filter((model) => model.runtimeKind === runtime.runtimeKind).map((model) => ({ model: model.llmModelIdentifier, count: model.count })),
  })),
})
/** Each task kind the router labelled, most agents first; then "Not routed" (defaults and inherited launches). */
const kinds = computed<readonly KindRow[]>(() => {
  const value = statistics.value
  if (!value) return []
  return [...value.taskKinds.map((kind) => rowOf(kind.taskKind, kind)), ...(value.notRouted.count ? [rowOf('', value.notRouted)] : [])]
})
const maxKindTotal = computed(() => Math.max(1, ...kinds.value.map((kind) => kind.total)))
const runtimeSummary = (kind: KindRow): string => kind.runtimes.map((runtime) => `${names.runtimeName(runtime.runtime)} ${runtime.count}`).join(', ')
const usedRuntimes = computed(() => [...new Set(kinds.value.flatMap((kind) => kind.runtimes.map((runtime) => runtime.runtime)))])
/** The app's names for the runtimes and models in these statistics (autobyteus-313 REQ-004). */
const names = useModelRoutingNames(() => usedRuntimes.value)
</script>
