<template>
  <nav
    data-test="workspace-semantic-surface-triggers"
    class="flex flex-shrink-0 items-center gap-2 overflow-x-auto border-b border-gray-200 bg-white px-2 py-2"
    :aria-label="$t('shell.workspaceSurfaces.semanticTriggersAriaLabel')"
  >
    <button
      v-if="showNavigationTrigger"
      type="button"
      data-test="workspace-navigation-trigger"
      class="whitespace-nowrap rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
      @click="emit('open-navigation')"
    >
      {{ $t('shell.workspaceSurfaces.openNavigation') }}
    </button>
    <button
      v-if="showToolsTrigger"
      type="button"
      data-test="workspace-tools-trigger"
      class="whitespace-nowrap rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
      @click="emit('open-tools')"
    >
      {{ $t('shell.workspaceSurfaces.openTools') }}
    </button>
  </nav>
</template>

<script setup lang="ts">
defineProps<{
  showNavigationTrigger: boolean
  showToolsTrigger: boolean
}>();

const emit = defineEmits<{
  (event: 'open-navigation'): void
  (event: 'open-tools'): void
}>();
</script>
