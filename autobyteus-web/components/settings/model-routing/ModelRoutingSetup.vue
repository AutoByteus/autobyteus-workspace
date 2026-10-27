<template>
  <section class="max-w-3xl" data-testid="model-routing-setup" :aria-label="t('settings.modelRouting.setup.title')">
    <h3 class="text-base font-semibold text-gray-900">{{ t('settings.modelRouting.setup.router.label') }}</h3>

    <div class="mt-3 grid gap-3 sm:grid-cols-2" data-testid="model-routing-router-row">
      <label class="block">
        <span class="mb-1 block text-xs font-medium text-gray-500">{{ t('settings.modelRouting.setup.router.runtime') }}</span>
        <select :value="runtime" :disabled="!report || !enabled || saving" class="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:bg-gray-50" data-testid="model-routing-router-runtime" @change="chooseRuntime(($event.target as HTMLSelectElement).value)">
          <option value="">{{ t('settings.modelRouting.setup.router.chooseRuntime') }}</option>
          <option v-if="!report && runtime" :value="runtime">{{ runtimeName(runtime) }}</option>
          <option v-for="entry in report?.agentRuntimes ?? []" :key="entry.runtime" :value="entry.runtime">{{ entry.name }}</option>
        </select>
      </label>
      <label class="block">
        <span class="mb-1 block text-xs font-medium text-gray-500">{{ t('settings.modelRouting.setup.router.model') }}</span>
        <select :value="model" :disabled="!report || !enabled || saving || !runtime || !modelOptions.length" class="h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:bg-gray-50" data-testid="model-routing-router-model" @change="chooseModel(($event.target as HTMLSelectElement).value)">
          <option value="">{{ t('settings.modelRouting.setup.router.chooseModel') }}</option>
          <option v-if="model && !modelOptions.some((option) => option.id === model)" :value="model">{{ model }}</option>
          <option v-for="option in modelOptions" :key="option.id" :value="option.id">{{ option.name }}{{ option.blocked ? ` · ${blockedText(option)}` : '' }}</option>
        </select>
      </label>
    </div>

    <div class="mt-6">
      <button
        type="button"
        class="inline-flex min-h-9 items-center whitespace-nowrap rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
        :disabled="!enabled || !status?.routerLaunch || saving"
        :title="enabled && status?.routerLaunch ? undefined : t('settings.modelRouting.setup.router.noConversation')"
        data-testid="model-routing-open-conversation"
        @click="emit('open-agent')"
      >{{ t('settings.modelRouting.setup.router.openConversation') }}</button>
      <p class="mt-2 text-sm text-gray-500">{{ t('settings.modelRouting.setup.router.teachHint') }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { AvailableAgentRuntimesReport, AvailableModel } from '~/types/availableAgentRuntimes'
import type { ModelRoutingStatus } from '~/types/modelRouting'
import { runtimeName, shortDate } from './modelRoutingPresentation'

const props = defineProps<{ report: AvailableAgentRuntimesReport | null; status: ModelRoutingStatus | null; saving: boolean }>()
const emit = defineEmits<{
  (event: 'choose-launch', launch: Readonly<{ runtimeKind: string; llmModelIdentifier: string }>): void
  (event: 'open-agent'): void
}>()
const { t, resolvedLocale } = useLocalization()
const locale = computed(() => String(resolvedLocale.value || 'en'))

const enabled = computed(() => props.status?.enabled ?? false)
/** A runtime chosen here but without a model yet (TR-003: the launch is saved once both are set). */
const draftRuntime = ref<string | null>(null)
watch(() => props.status?.routerLaunch, () => { draftRuntime.value = null })
const runtime = computed(() => draftRuntime.value ?? props.status?.routerLaunch?.runtimeKind ?? '')
const model = computed(() => (draftRuntime.value === null ? props.status?.routerLaunch?.llmModelIdentifier ?? '' : ''))

/** The chosen runtime's models on this node (AutoByteus: every provider's). */
const modelOptions = computed<readonly AvailableModel[]>(() => {
  const entry = props.report?.agentRuntimes.find((item) => item.runtime === runtime.value)
  if (!entry) return []
  if (entry.runtime === 'autobyteus') return entry.providers.flatMap((provider) => (Array.isArray(provider.models) ? provider.models : []))
  return Array.isArray(entry.models) ? entry.models : []
})
const blockedText = (option: AvailableModel): string => option.blocked?.until
  ? t('settings.modelRouting.setup.router.blockedUntil', { time: shortDate(Date.parse(option.blocked.until), locale.value) })
  : t('settings.modelRouting.setup.router.blocked')

const chooseRuntime = (value: string): void => { draftRuntime.value = value }
const chooseModel = (value: string): void => {
  if (value && runtime.value) emit('choose-launch', { runtimeKind: runtime.value, llmModelIdentifier: value })
}
</script>
