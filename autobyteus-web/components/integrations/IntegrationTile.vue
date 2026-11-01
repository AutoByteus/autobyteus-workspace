<template>
  <article
    :id="`integration-${item.id}`"
    tabindex="-1"
    class="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-50"
    :data-testid="`integration-card-${item.id}`"
    :aria-labelledby="`integration-${item.id}-title`"
  >
    <div class="flex items-start gap-4">
      <IntegrationIcon :item="item" />
      <div class="min-w-0 flex-1">
        <h3 :id="`integration-${item.id}-title`" class="text-lg font-semibold leading-7 text-gray-900">{{ item.name }}</h3>
        <p class="text-sm text-gray-500">{{ item.description }}</p>
      </div>
    </div>

    <p v-if="missingTools.length > 0" class="mt-3 flex items-start gap-1.5 text-xs text-amber-800" :data-testid="`integration-tools-missing-${item.id}`">
      <Icon icon="heroicons:exclamation-triangle" class="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" aria-hidden="true" />
      <span>{{ t('integrations.tile.toolsMissing', { tools: missingTools.join(', ') }) }}</span>
    </p>

    <p v-if="item.state === 'CONNECTED'" class="mt-3 text-xs text-gray-500" :data-testid="`integration-access-hint-${item.id}`">
      <template v-for="(part, index) in withSkillName(t('integrations.tile.accessHint', { skill: item.skillName }), item.skillName)" :key="index">
        <code v-if="part.skill" class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-800">{{ part.text }}</code>
        <template v-else>{{ part.text }}</template>
      </template>
    </p>

    <div class="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-4">
      <IntegrationStatusChip :item="item" />

      <button
        v-if="item.state === 'NEEDS_TOKEN'"
        type="button"
        class="inline-flex h-9 items-center rounded-lg bg-blue-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        :data-testid="`integration-open-${item.id}`"
        @click="$emit('open', item.id)"
      >
        {{ t('integrations.tile.connect') }}
      </button>
      <button
        v-else-if="item.state === 'CONNECTED'"
        type="button"
        class="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        :data-testid="`integration-open-${item.id}`"
        @click="$emit('open', item.id)"
      >
        {{ t('integrations.tile.manage') }}
      </button>
      <NuxtLink
        v-else
        to="/settings?section=updates"
        class="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        :data-testid="`integration-newer-${item.id}`"
      >
        {{ t('integrations.newer.action') }}
      </NuxtLink>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import IntegrationIcon from '~/components/integrations/IntegrationIcon.vue'
import IntegrationStatusChip from '~/components/integrations/IntegrationStatusChip.vue'
import { useLocalization } from '~/composables/useLocalization'
import type { IntegrationView } from '~/stores/integrationsStore'
import { withSkillName } from '~/utils/integrations/integrationText'

const props = defineProps<{ item: IntegrationView }>()
defineEmits<{ open: [id: string] }>()

const { t } = useLocalization()
const missingTools = computed(() => props.item.tools.filter(check => !check.found).map(check => check.tool))
</script>
