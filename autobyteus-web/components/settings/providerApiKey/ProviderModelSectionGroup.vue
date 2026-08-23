<template>
  <div>
    <h4 class="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">{{ title }}</h4>
    <div class="grid grid-cols-1 gap-2 xl:grid-cols-2">
      <div
        v-for="model in models"
        :key="`${prefix}-${model.modelIdentifier}`"
        class="rounded-lg border border-gray-100 bg-white px-3 py-2.5 text-sm transition-all duration-200 hover:shadow-sm"
        :class="accentClass"
      >
        <span class="break-all font-medium text-gray-900">{{ getDisplayedModelLabel(model) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DEFAULT_AGENT_RUNTIME_KIND } from '~/types/agent/AgentRunConfig'
import { getModelSelectionOptionLabel } from '~/utils/modelSelectionLabel'

interface ModelInfo {
  modelIdentifier: string
  name?: string | null
  providerType?: string | null
}

defineProps<{
  title: string
  prefix: string
  models: ModelInfo[]
  accentClass: string
}>()

const getDisplayedModelLabel = (model: ModelInfo): string =>
  getModelSelectionOptionLabel(model, DEFAULT_AGENT_RUNTIME_KIND)
</script>
