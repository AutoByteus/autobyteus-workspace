<template>
  <div v-if="count > 0" class="mt-4" data-test="member-overrides-disclosure">
    <button
      type="button"
      class="flex w-full items-center rounded-md px-1 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
      :data-test="`${testPrefix}-toggle`"
      :aria-expanded="expanded"
      :aria-controls="panelId"
      @click="expanded = !expanded"
    >
      <span class="flex min-w-0 items-center gap-1.5">
        <span class="truncate">{{ label }} ({{ count }})</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="h-4 w-4 flex-shrink-0 transform text-gray-600 transition-transform duration-300"
          :class="expanded ? '' : '-rotate-90'"
          :data-test="`${testPrefix}-chevron`"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </span>
    </button>
    <div
      v-show="expanded"
      :id="panelId"
      class="mt-3"
      :data-test="`${testPrefix}-panel`"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  label: string
  count: number
  testPrefix: string
}>()

const expanded = ref(false)
const panelId = computed(() => `${props.testPrefix}-panel`)
</script>
