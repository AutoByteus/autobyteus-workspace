<template>
  <li
    class="grid grid-cols-[2rem_minmax(0,1fr)_2rem] items-center gap-x-3 px-4 py-3 sm:grid-cols-[2rem_minmax(0,1fr)_auto_2rem] sm:px-6"
    :aria-busy="store.sourceBusy[source.sourceId] !== undefined"
    :data-testid="`integration-source-row-${source.sourceId}`"
  >
    <span class="row-span-3 mt-0.5 flex h-8 w-8 items-center justify-center self-start rounded-lg bg-slate-100 text-slate-600" aria-hidden="true">
      <Icon :icon="source.kind === 'LOCAL_PATH' ? 'heroicons:folder' : 'mdi:github'" class="h-[18px] w-[18px]" />
    </span>
    <span class="min-w-0 truncate text-sm font-medium leading-5 text-slate-900" :title="nameOf(source)">{{ nameOf(source) }}</span>
    <span class="hidden whitespace-nowrap text-right text-[13px] leading-5 tabular-nums text-slate-700 sm:block">
      {{ countLabel }}
    </span>
    <span class="-my-1.5 flex justify-end">
      <button
        type="button"
        class="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="disabled"
        :title="t('integrations.sources.remove')"
        :aria-label="t('integrations.sources.removeNamed', { name: nameOf(source) })"
        :data-testid="`integration-source-remove-${source.sourceId}`"
        @click="$emit('remove')"
      >
        <Icon icon="heroicons:trash" class="h-4 w-4" aria-hidden="true" />
      </button>
    </span>

    <span class="col-start-2 col-end-4 mt-0.5 min-w-0 truncate font-mono sm:col-end-5 text-[11.5px] leading-[18px] text-slate-500" :title="source.location">{{ source.location }}</span>

    <div class="col-start-2 col-end-4 mt-1.5 flex sm:col-end-5 min-h-6 min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      <span v-if="source.kind === 'LOCAL_PATH'" class="text-slate-600" :data-testid="`integration-source-status-${source.sourceId}`">{{ t('integrations.sources.localLabel') }}</span>
      <span v-else class="inline-flex items-center gap-1.5 font-medium" :class="statusTone(source).text" role="status" :data-testid="`integration-source-status-${source.sourceId}`">
        <Icon v-if="store.sourceBusy[source.sourceId]" icon="svg-spinners:ring-resize" class="h-3 w-3 text-slate-400" aria-hidden="true" />
        <span v-else class="h-1.5 w-1.5 rounded-full" :class="statusTone(source).dot" aria-hidden="true" />
        {{ statusLabel(source) }}
      </span>
      <span class="text-[13px] tabular-nums text-slate-500 sm:hidden">{{ countLabel }}</span>
      <button
        v-if="source.kind === 'GITHUB_REPOSITORY' && updateAvailable(source) && !store.sourceBusy[source.sourceId]"
        type="button"
        class="inline-flex h-6 items-center rounded-md border border-blue-200 bg-blue-50 px-2 text-xs font-medium text-blue-700 hover:bg-blue-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="disabled"
        :data-testid="`integration-source-update-${source.sourceId}`"
        @click="$emit('update')"
      >
        {{ t('integrations.sources.update') }}
      </button>
    </div>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useLocalization } from '~/composables/useLocalization'
import { sourceDisplayName, useIntegrationsStore, type IntegrationSourceView } from '~/stores/integrationsStore'

/** One imported source in Manage sources: name, location, integration count, status (GitHub) and its actions. */
const props = defineProps<{ source: IntegrationSourceView; disabled: boolean }>()
defineEmits<{ update: []; remove: [] }>()

const store = useIntegrationsStore()
const { t } = useLocalization()

const nameOf = (source: IntegrationSourceView) => sourceDisplayName(source)
const updateAvailable = (source: IntegrationSourceView) => source.github?.status === 'UPDATE_AVAILABLE'
const statusLabel = (source: IntegrationSourceView) => {
  const pending = store.sourceBusy[source.sourceId]
  if (pending) return t(pending === 'update' ? 'integrations.sources.updating' : 'integrations.sources.removing')
  return t(updateAvailable(source) ? 'integrations.sources.updateAvailable' : 'integrations.sources.upToDate')
}
const statusTone = (source: IntegrationSourceView) => {
  if (store.sourceBusy[source.sourceId]) return { text: 'text-slate-500', dot: '' }
  return updateAvailable(source)
    ? { text: 'text-amber-700', dot: 'bg-amber-500' }
    : { text: 'text-slate-600', dot: 'bg-emerald-500' }
}
const countLabel = computed(() => (props.source.integrationIds.length === 1
  ? t('integrations.sources.integrationsOne')
  : t('integrations.sources.integrationsMany', { count: props.source.integrationIds.length })))
</script>
