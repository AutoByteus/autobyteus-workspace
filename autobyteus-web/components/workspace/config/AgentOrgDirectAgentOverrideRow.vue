<template>
  <div class="bg-white" :data-test="`org-placement-${node.address}`">
    <button
      type="button"
      class="flex w-full min-w-0 items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
      :aria-expanded="expanded"
      :aria-controls="panelId"
      @click="emit('toggle')"
    >
      <span class="inline-flex h-8 w-8 flex-none items-center justify-center rounded-full bg-slate-100 text-slate-600">
        <Icon icon="heroicons:user-20-solid" class="h-4 w-4" />
      </span>
      <span class="min-w-0 flex-1">
        <span class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span class="truncate text-sm font-semibold text-slate-800">{{ node.displayName }}</span>
          <span v-if="node.isCustomized" class="rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
            {{ t('workspace.components.workspace.config.MemberOverrideItem.overridden') }}
          </span>
        </span>
        <span class="mt-0.5 block truncate font-mono text-xs text-slate-500" :title="node.address">{{ node.address }}</span>
      </span>
      <Icon icon="heroicons:chevron-down-20-solid" class="h-4 w-4 flex-none text-slate-400 transition-transform" :class="expanded ? '' : '-rotate-90'" />
    </button>

    <div v-show="expanded" :id="panelId" class="border-t border-slate-100 bg-slate-50 p-3">
      <div class="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <MemberOverrideItem
          :node="node"
          :member-breadcrumb="node.address.split('/').filter(Boolean).join(' / ')"
          :disabled="disabled"
          :model-config-field-errors="modelConfigFieldErrors"
          @update:override="(_, value) => emit('update:override', value)"
          @update-existing-model-config="forwardExistingModelConfig"
          @schema-state="forwardSchemaState"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import MemberOverrideItem from './MemberOverrideItem.vue'
import { useLocalization } from '~/composables/useLocalization'
import type { TeamFormAgentNode } from '~/types/agent/TeamRunFormModel'
import type { ExistingRunModelSelection } from '~/types/agent/ExistingRunModelConfigDraft'
import type { AgentConfigOverride } from '~/types/agent/TeamRunConfig'
import type { RuntimeModelConfigSchemaState } from '~/types/agent/RuntimeModelConfigSchemaState'

const props = withDefaults(defineProps<{
  node: Readonly<TeamFormAgentNode>
  expanded: boolean
  disabled?: boolean
  modelConfigFieldErrors?: Readonly<Record<string, string>>
}>(), { disabled: false })

const emit = defineEmits<{
  (event: 'toggle'): void
  (event: 'update:override', value: AgentConfigOverride | null): void
  (event: 'update-existing-model-config', address: string, value: ExistingRunModelSelection, directlyEdited: boolean): void
  (event: 'schema-state', address: string, state: RuntimeModelConfigSchemaState): void
}>()

const { t } = useLocalization()
const panelId = computed(() => `org-direct-agent-${props.node.address.slice(1).replaceAll('/', '-')}-panel`)
const forwardSchemaState = (address: string, state: RuntimeModelConfigSchemaState) => {
  if (address === props.node.address) emit('schema-state', address, state)
}
const forwardExistingModelConfig = (address: string, value: ExistingRunModelSelection, directlyEdited: boolean) => {
  if (address === props.node.address) emit('update-existing-model-config', address, value, directlyEdited)
}
</script>
