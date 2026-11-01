<template>
  <div class="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4" data-testid="integration-dialog-overlay" @click.self="$emit('close')">
    <section
      ref="panelRef"
      class="flex max-h-[min(44rem,90vh)] w-full max-w-[42rem] flex-col overflow-hidden rounded-2xl bg-white shadow-xl focus:outline-none"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="`integration-dialog-${item.id}-title`"
      tabindex="-1"
      :data-testid="`integration-dialog-${item.id}`"
    >
      <header class="flex items-start gap-4 border-b border-slate-100 px-6 py-5">
        <IntegrationIcon :item="item" />
        <div class="min-w-0 flex-1">
          <h2 :id="`integration-dialog-${item.id}-title`" class="text-xl font-semibold leading-7 text-gray-900">{{ item.name }}</h2>
          <p class="text-sm text-gray-500">{{ item.description }}</p>
        </div>
        <button
          type="button"
          class="-mr-2 -mt-1 rounded-lg p-2 text-gray-400 hover:bg-slate-100 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          :aria-label="t('integrations.dialog.close')"
          :title="t('integrations.dialog.close')"
          data-testid="integration-dialog-close"
          @click="$emit('close')"
        >
          <Icon icon="heroicons:x-mark" class="h-5 w-5" aria-hidden="true" />
        </button>
      </header>
      <div class="overflow-y-auto px-6 py-5">
        <div class="mb-5"><IntegrationStatusChip :item="item" /></div>
        <IntegrationDetail :item="item" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Icon } from '@iconify/vue'
import IntegrationDetail from '~/components/integrations/IntegrationDetail.vue'
import IntegrationIcon from '~/components/integrations/IntegrationIcon.vue'
import IntegrationStatusChip from '~/components/integrations/IntegrationStatusChip.vue'
import { useLocalization } from '~/composables/useLocalization'
import { useModalDialog } from '~/composables/useModalDialog'
import type { IntegrationView } from '~/stores/integrationsStore'

defineProps<{ item: IntegrationView }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useLocalization()
const panelRef = ref<HTMLElement | null>(null)
// Focus moves into the dialog, Tab stays in it, Esc closes; focus returns to the Connect or Manage button.
useModalDialog({ panelRef, onClose: () => emit('close') })
</script>
