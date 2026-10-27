<template>
  <p v-if="!models.length" class="text-sm text-gray-500" :data-testid="testid">{{ t('settings.modelRouting.runtimesNow.models.none') }}</p>
  <details v-else class="available-model-list" :data-testid="testid">
    <summary class="inline-flex cursor-pointer select-none items-center gap-1.5 rounded text-sm text-gray-700 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
      <Icon icon="heroicons:chevron-right-20-solid" class="available-model-list-chevron h-4 w-4 flex-shrink-0 text-gray-400 transition-transform" aria-hidden="true" />
      <span :data-testid="`${testid}-summary`">{{ models.length === 1 ? t('settings.modelRouting.runtimesNow.models.one') : t('settings.modelRouting.runtimesNow.models.count', { count: models.length }) }}</span>{{ ' ' }}
      <span v-if="blocked > 0" class="text-amber-700" :data-testid="`${testid}-blocked-count`">· {{ t('settings.modelRouting.runtimesNow.models.blockedCount', { count: blocked }) }}</span>
    </summary>
    <ul class="mt-2 space-y-1.5 pl-5">
      <li v-for="model in models" :key="model.id" class="text-sm" :data-testid="`${testid}-model`" :data-model-id="model.id">
        <span class="text-gray-900" data-testid="available-model-name">{{ names.reportedModelName(runtime, model) }}</span>{{ ' ' }}
        <span v-if="names.reportedModelName(runtime, model) !== model.id" class="ml-1 font-mono text-xs text-gray-400">{{ model.id }}</span>{{ ' ' }}
        <span v-if="model.contextTokens" class="ml-1 text-xs text-gray-500">{{ t('settings.modelRouting.runtimesNow.models.context', { tokens: shortTokens(model.contextTokens, locale) }) }}</span>
        <span v-if="model.blocked" class="block text-xs text-amber-700" :data-testid="`${testid}-model-blocked`">{{ blockedText(model.blocked) }}</span>
      </li>
    </ul>
  </details>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import type { AvailableModel, ModelBlock } from '~/types/availableAgentRuntimes'
import { blockedCount, localTime, shortTokens } from './availableAgentRuntimesPresentation'
import { useModelRoutingNames } from './modelRoutingNames'

const props = defineProps<{ runtime: string; models: AvailableModel[]; testid: string }>()
/** Model names as the app's model menu names them, the report's name where the catalog has none (autobyteus-313 REQ-004). */
const names = useModelRoutingNames(() => [props.runtime])
const { t, resolvedLocale } = useLocalization()
const locale = computed(() => String(resolvedLocale.value || 'en'))
const blocked = computed(() => blockedCount(props.models))

const blockedText = (block: ModelBlock): string => block.until
  ? t('settings.modelRouting.runtimesNow.models.blockedUntil', { time: localTime(block.until, locale.value), by: block.by })
  : t('settings.modelRouting.runtimesNow.models.blocked', { by: block.by })
</script>

<style scoped>
.available-model-list > summary { list-style: none; }
.available-model-list > summary::-webkit-details-marker { display: none; }
.available-model-list[open] .available-model-list-chevron { transform: rotate(90deg); }
</style>
