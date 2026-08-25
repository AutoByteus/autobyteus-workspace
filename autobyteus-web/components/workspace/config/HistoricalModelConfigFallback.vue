<template>
  <div
    class="mt-4 border-l border-amber-200 pl-3 text-xs"
    data-test="historical-model-config-fallback"
  >
    <p class="font-medium text-gray-700">{{ title }}</p>
    <p class="mt-0.5 text-amber-600">{{ unavailableMessage }}</p>
    <dl class="mt-2 space-y-1.5">
      <div v-for="entry in entries" :key="entry.key" class="grid grid-cols-[minmax(7rem,auto)_minmax(0,1fr)] gap-3">
        <dt class="break-words font-medium text-gray-500">{{ entry.key }}</dt>
        <dd class="min-w-0 break-words font-mono text-gray-700">{{ entry.value }}</dd>
      </div>
    </dl>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  config: Readonly<Record<string, unknown>>
  title: string
  unavailableMessage: string
}>()

const displayValue = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (value === null) return 'null'
  if (typeof value === 'undefined') return 'undefined'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
const entries = computed(() => Object.entries(props.config).map(([key, value]) => ({
  key,
  value: displayValue(value),
})))
</script>
