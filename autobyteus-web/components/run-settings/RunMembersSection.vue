<template>
  <section :class="title ? 'mt-6' : ''" data-test="run-members">
    <!-- An optional heading (saved runs) and "Reset all" (only when something is customized). -->
    <div v-if="title || (customizedCount && !readOnly)" class="mb-2 flex items-baseline justify-between gap-3">
      <h3 v-if="title" class="min-w-0 text-xs font-medium text-gray-500">{{ title }}</h3>
      <button
        v-if="customizedCount && !readOnly"
        type="button"
        class="ml-auto rounded px-1 text-xs font-medium text-blue-600 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
        data-test="run-members-reset-all"
        @click="emit('reset-all')"
      >
        {{ $t('runSettings.members.resetAll') }}
      </button>
    </div>
    <!-- No overflow clipping: member menus open outside the list. Without a heading (the drawer)
         rows bleed into the drawer padding; with one (saved run) they align with the card above. -->
    <div :class="title ? 'space-y-1.5' : '-mx-2 space-y-1.5'">
      <RunMemberRow
        v-for="node in nodes"
        :key="node.key"
        :node="node"
        :expanded-keys="expandedKeys"
        :locked="locked"
        :runtime-locked="runtimeLocked"
        :locked-models-for="lockedModelsFor"
        :read-only="readOnly"
        @toggle="toggle"
        @change="(key, change) => emit('change', key, change)"
        @reset="(key, reset) => emit('reset', key, reset)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ChatModelOption } from '~/composables/chat/useChatModelCatalog'
import type { RunMemberSettingChange, RunMemberSettingReset, RunSettingFlags } from '~/types/runSettings/RunSettings'
import { countCustomizedMembers, type RunMemberNode } from '~/utils/runSettings/runMemberTree'
import RunMemberRow from './RunMemberRow.vue'

const props = withDefaults(defineProps<{
  nodes: readonly RunMemberNode[]
  title?: string
  locked?: RunSettingFlags
  runtimeLocked?: boolean
  lockedModelsFor?: ((key: string) => readonly ChatModelOption[] | null) | null
  readOnly?: boolean
}>(), { title: '', locked: () => ({}), runtimeLocked: false, lockedModelsFor: null, readOnly: false })

const emit = defineEmits<{
  (event: 'change', key: string, change: RunMemberSettingChange): void
  (event: 'reset', key: string, reset: RunMemberSettingReset): void
  (event: 'reset-all'): void
}>()

const expandedKeys = ref<Set<string>>(new Set())
const toggle = (key: string) => {
  const next = new Set(expandedKeys.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expandedKeys.value = next
}
const customizedCount = computed(() => countCustomizedMembers(props.nodes))
</script>
