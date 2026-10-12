<template>
  <!-- REQ-007: collaborators and open delegated copies, read-only, each agent with what it runs on and why. -->
  <section class="mt-6" data-test="run-delegated-launches">
    <h3 class="text-xs font-medium text-gray-500">{{ $t('runSettings.delegated.title') }}</h3>
    <p class="mb-2 mt-0.5 text-xs text-gray-400">{{ $t('runSettings.delegated.description') }}</p>
    <ul class="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
      <li
        v-for="item in rows"
        :key="item.key"
        class="px-3 py-2"
        :class="item.member ? 'pl-9' : ''"
        :data-test="`run-delegated-${item.address}`"
        :data-source="item.source"
      >
        <div class="flex min-w-0 items-center gap-2">
          <Icon
            :icon="item.subject === 'team' ? 'heroicons:user-group' : 'heroicons:user'"
            class="h-3.5 w-3.5 flex-shrink-0 text-gray-400"
            aria-hidden="true"
          />
          <span class="truncate text-sm font-medium text-gray-900" :title="item.address">{{ nameOf(item.address) }}</span>
          <span
            v-if="!item.member"
            class="flex-shrink-0 rounded-full bg-gray-100 px-1.5 py-px text-[0.6875rem] font-medium text-gray-600"
          >{{ $t(item.entry === 'collaborator' ? 'runSettings.delegated.collaborator' : 'runSettings.delegated.copy') }}</span>
        </div>
        <p class="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1 text-xs text-gray-600" data-test="run-delegated-launch">
          <span v-if="item.llmModelIdentifier" class="truncate">{{ launchLabel(item) }}</span>
          <span v-if="item.llmModelIdentifier" class="text-gray-300" aria-hidden="true">·</span>
          <span class="text-gray-500" data-test="run-delegated-source">{{ t(SOURCE_LABEL_KEY[item.source]) }}</span>
        </p>
        <p
          v-for="(fallback, index) in item.fallbacks"
          :key="index"
          class="mt-0.5 flex items-start gap-1 text-xs text-amber-700"
          data-test="run-delegated-fallback"
        >
          <Icon icon="heroicons:exclamation-triangle" class="mt-px h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
          <span class="min-w-0">{{ fallbackText(fallback) }}</span>
        </p>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { useLocalization } from '~/composables/useLocalization'
import type { DelegatedLaunchFallback, DelegatedLaunchRow, DelegatedLaunchSource } from '~/utils/runSettings/delegatedLaunchRows'
import { useRunSettingsPresentation } from './useRunSettingsPresentation'

defineProps<{ rows: readonly DelegatedLaunchRow[] }>()

const { t } = useLocalization()
const presentation = useRunSettingsPresentation()

const nameOf = (address: string): string => address.split('/').filter(Boolean).at(-1) ?? address
const SOURCE_LABEL_KEY: Readonly<Record<DelegatedLaunchSource, string>> = {
  agent_default: 'runSettings.delegated.source.agent_default',
  team_default: 'runSettings.delegated.source.team_default',
  inherited: 'runSettings.delegated.source.inherited',
  configured: 'runSettings.delegated.source.configured',
  not_recorded: 'runSettings.delegated.source.notRecorded',
}
const LAYER_LABEL_KEY: Readonly<Record<DelegatedLaunchFallback['layer'], string>> = {
  agent_default: 'runSettings.delegated.layer.agent_default',
  team_default: 'runSettings.delegated.layer.team_default',
}
const launchLabel = (item: DelegatedLaunchRow): string => {
  const runtimeKind = item.runtimeKind ?? ''
  const model = presentation.modelLabel({ runtimeKind, llmModelIdentifier: item.llmModelIdentifier ?? '' }) || item.llmModelIdentifier
  return runtimeKind ? `${model} · ${presentation.runtimeShortLabel(runtimeKind)}` : `${model}`
}
const fallbackText = (fallback: DelegatedLaunchFallback): string => t('runSettings.delegated.fallback', {
  layer: t(LAYER_LABEL_KEY[fallback.layer]),
  model: [fallback.runtimeKind ? presentation.runtimeShortLabel(fallback.runtimeKind) : null, fallback.llmModelIdentifier].filter(Boolean).join(' · ') || '—',
  detail: fallback.detail,
})
</script>
