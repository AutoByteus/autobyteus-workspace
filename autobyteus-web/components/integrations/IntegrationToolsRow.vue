<template>
  <div v-if="item.tools.length > 0" class="mt-6 border-t border-slate-100 pt-4" :data-testid="`integration-tools-${item.id}`">
    <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <h4 class="text-sm font-medium text-gray-700">{{ t('integrations.tools.title') }}</h4>
      <ul class="flex flex-wrap items-center gap-2" role="list">
        <li
          v-for="check in item.tools"
          :key="check.tool"
          class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
          :class="check.found ? 'bg-slate-100 text-slate-700' : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'"
          :data-testid="`integration-tool-${item.id}-${check.tool}`"
        >
          <Icon
            :icon="check.found ? 'heroicons:check-circle' : 'heroicons:exclamation-triangle'"
            class="h-4 w-4"
            :class="check.found ? 'text-green-600' : 'text-amber-600'"
            aria-hidden="true"
          />
          <span class="sr-only">{{ check.found ? t('integrations.tools.found') : '' }}</span>
          <span class="font-mono">{{ check.tool }}</span>
          <span v-if="!check.found" class="text-amber-700">{{ t('integrations.tools.missing') }}</span>
        </li>
      </ul>
    </div>
    <div v-if="missingTools.length > 0" class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
      <p class="text-xs text-amber-800" :data-testid="`integration-tools-missing-${item.id}`">
        {{ missingTools.length === 1
          ? t('integrations.tools.missingText', { tools: missingTools.join(', ') })
          : t('integrations.tools.missingTextMany', { tools: missingTools.join(', ') }) }}
      </p>
      <button
        type="button"
        class="text-xs font-medium text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60"
        :disabled="busy"
        :data-testid="`integration-tools-recheck-${item.id}`"
        @click="$emit('recheck')"
      >
        {{ checking ? t('integrations.tools.checking') : t('integrations.tools.checkAgain') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useLocalization } from '~/composables/useLocalization'
import type { IntegrationView } from '~/stores/integrationsStore'

/** The integration's prerequisite tools on this node: found or not found, and Check again. AutoByteus installs none. */
const props = defineProps<{ item: Pick<IntegrationView, 'id' | 'tools'>; busy: boolean; checking: boolean }>()
defineEmits<{ recheck: [] }>()

const { t } = useLocalization()
const missingTools = computed(() => props.item.tools.filter(check => !check.found).map(check => check.tool))
</script>
