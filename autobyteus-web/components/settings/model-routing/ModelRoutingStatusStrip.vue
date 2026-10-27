<template>
  <!-- Shown only when something needs attention (the router is on but cannot answer), or in a peer node's window. -->
  <p v-if="detail || !ownNode" class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm" role="status" data-testid="model-routing-status" :data-status="status?.reasonCode ?? (status?.active ? 'ACTIVE' : '')">
    <template v-if="detail">
      <span class="inline-block h-2 w-2 flex-shrink-0 rounded-full bg-amber-500" aria-hidden="true"></span>
      <span class="text-amber-800">{{ detail }}</span>
      <button v-if="setupLink" type="button" class="font-medium text-blue-700 hover:text-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" data-testid="model-routing-status-setup" @click="emit('show-setup')">{{ t('settings.modelRouting.status.goToSetup') }}</button>
    </template>
    <span v-if="!ownNode" class="ml-auto font-medium text-gray-700" data-testid="model-routing-node">{{ nodeName }}</span>
  </p>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ModelRoutingStatus } from '~/types/modelRouting'
import { routerProblem } from './modelRoutingPresentation'

const props = defineProps<{ status: ModelRoutingStatus | null; nodeName: string; ownNode: boolean; setupLink: boolean }>()
const emit = defineEmits<{ (event: 'show-setup'): void }>()
const { t, resolvedLocale } = useLocalization()
const locale = computed(() => String(resolvedLocale.value || 'en'))

/** Why the router cannot answer while Model Routing is on (by the server's reason code); '' otherwise. */
const detail = computed(() => routerProblem(props.status, t, locale.value))
</script>
