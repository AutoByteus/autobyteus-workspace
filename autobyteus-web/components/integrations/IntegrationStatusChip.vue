<template>
  <span
    class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium"
    :class="chip.class"
    :data-testid="`integration-status-${item.id}`"
  >
    <Icon v-if="chip.icon" :icon="chip.icon" class="h-4 w-4" aria-hidden="true" />
    <span v-else class="h-2 w-2 rounded-full" :class="chip.dot" aria-hidden="true" />
    {{ chip.text }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useLocalization } from '~/composables/useLocalization'
import type { IntegrationView } from '~/stores/integrationsStore'

const props = defineProps<{ item: Pick<IntegrationView, 'id' | 'state' | 'login'> }>()
const { t } = useLocalization()

const chip = computed(() => {
  switch (props.item.state) {
    case 'CONNECTED':
      return { text: t('integrations.status.connectedAs', { login: props.item.login ?? '' }), class: 'bg-green-50 text-green-700 ring-1 ring-green-200', dot: 'bg-green-500', icon: null }
    case 'NEEDS_TOKEN':
      return { text: t('integrations.status.needsToken'), class: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200', dot: 'bg-amber-500', icon: null }
    default:
      return { text: t('integrations.status.needsNewer'), class: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200', dot: '', icon: 'heroicons:arrow-up-circle' }
  }
})
</script>
