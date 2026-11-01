<template>
  <div
    class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50"
    :data-testid="`integration-icon-${item.id}`"
  >
    <!-- Repository content: the icon is only ever an <img> of its data URL, never inline SVG. -->
    <img v-if="item.iconDataUrl" :src="item.iconDataUrl" alt="" class="h-6 w-6" aria-hidden="true">
    <span v-else class="text-base font-semibold text-slate-500" aria-hidden="true">{{ item.name.charAt(0).toUpperCase() }}</span>
  </div>
</template>

<script setup lang="ts">
import type { IntegrationView } from '~/stores/integrationsStore'

defineProps<{ item: Pick<IntegrationView, 'id' | 'name' | 'iconDataUrl'> }>()
</script>
