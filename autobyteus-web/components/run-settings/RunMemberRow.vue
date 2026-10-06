<template>
  <!-- A member or placed team: a flat two-line row; opened, a white card with its settings. -->
  <div
    :data-test="`run-member-${node.key}`"
    :data-customized="customized ? 'true' : 'false'"
    class="rounded-xl border transition-[border-color,box-shadow]"
    :class="expanded ? 'border-gray-200 bg-white shadow-sm' : 'border-transparent'"
  >
    <div class="group flex items-center gap-1 rounded-xl pr-1 transition-colors" :class="expanded ? '' : 'hover:bg-gray-50'">
      <button
        type="button"
        class="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
        :aria-expanded="expanded ? 'true' : 'false'"
        :aria-label="$t('runSettings.members.toggleAria', { name: node.name })"
        :title="node.name"
        data-test="run-member-toggle"
        @click="emit('toggle', node.key)"
      >
        <span
          v-if="node.kind === 'team'"
          class="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"
          aria-hidden="true"
        >
          <Icon icon="heroicons:user-group" class="h-4 w-4" />
        </span>
        <span
          v-else
          class="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[0.6875rem] font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-100"
          aria-hidden="true"
        >{{ initialsFor(node.name) }}</span>
        <span class="min-w-0 flex-1">
          <span class="flex min-w-0 items-center gap-2">
            <span class="truncate text-sm font-medium text-gray-900">{{ node.name }}</span>
            <span v-if="node.isCoordinator" class="flex-shrink-0 rounded-full bg-gray-100 px-1.5 py-px text-[0.6875rem] font-medium text-gray-600">{{ $t('runSettings.members.coordinator') }}</span>
          </span>
          <span class="mt-0.5 flex min-w-0 items-center gap-1 text-xs" data-test="run-member-summary">
            <span v-if="node.modelRequired" class="truncate font-medium text-amber-700">{{ $t('chat.model.chooseModel') }}</span>
            <template v-else>
              <span v-if="customized" class="flex-shrink-0 font-medium text-blue-700">{{ $t('runSettings.members.customizedLabel') }}</span>
              <span v-else-if="childCustomizedCount" class="flex-shrink-0 font-medium text-blue-700">{{ $t('runSettings.members.customizedCount', { count: childCustomizedCount }) }}</span>
              <span v-if="customized || childCustomizedCount" class="flex-shrink-0 text-gray-300" aria-hidden="true">·</span>
              <span class="truncate text-gray-600">{{ summary }}</span>
            </template>
          </span>
        </span>
      </button>
      <button
        v-if="customized && !readOnly"
        type="button"
        class="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
        :aria-label="$t('runSettings.members.resetMemberAria', { name: node.name })"
        :title="$t('runSettings.members.resetMemberAria', { name: node.name })"
        data-test="run-member-reset"
        @click="emit('reset', node.key, { field: 'all' })"
      >
        <Icon icon="heroicons:arrow-uturn-left-solid" class="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <button
        type="button"
        tabindex="-1"
        aria-hidden="true"
        class="inline-flex h-8 w-7 flex-shrink-0 items-center justify-center text-gray-400"
        @click="emit('toggle', node.key)"
      >
        <Icon icon="heroicons:chevron-down" class="h-4 w-4 transition-transform duration-150 motion-reduce:transition-none" :class="expanded ? 'rotate-180' : ''" />
      </button>
    </div>

    <div v-if="expanded" class="border-t border-gray-100 pb-2.5 pl-[3.25rem] pr-3 pt-1.5" data-test="run-member-detail">
      <RunSettingsCard
        nested
        :values="node.values"
        :fields="node.fields"
        :member="node"
        :locked="locked"
        :runtime-locked="runtimeLocked"
        :locked-models="lockedModelsFor?.(node.key) ?? null"
        :resettable="!readOnly"
        :test-suffix="node.key"
        @change="emit('change', node.key, $event)"
        @reset="emit('reset', node.key, $event)"
      />
      <template v-if="node.children.length">
        <p class="mb-1 mt-3 text-[0.6875rem] font-medium uppercase tracking-wide text-gray-400">{{ $t('runSettings.members.title') }}</p>
        <div class="-ml-2 space-y-0.5">
          <RunMemberRow
            v-for="child in node.children"
            :key="child.key"
            :node="child"
            :expanded-keys="expandedKeys"
            :locked="locked"
            :runtime-locked="runtimeLocked"
            :locked-models-for="lockedModelsFor"
            :read-only="readOnly"
            @toggle="emit('toggle', $event)"
            @change="(key, change) => emit('change', key, change)"
            @reset="(key, reset) => emit('reset', key, reset)"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { initialsFor } from '~/components/chat/chatComposerMenus'
import { setModelOptionLabels } from '~/utils/runSettings/modelOptions'
import type { ChatModelOption } from '~/composables/chat/useChatModelCatalog'
import type { RunMemberSettingChange, RunMemberSettingReset, RunSettingFlags } from '~/types/runSettings/RunSettings'
import { countCustomizedMembers, isRunMemberCustomized, type RunMemberNode } from '~/utils/runSettings/runMemberTree'
import RunSettingsCard from './RunSettingsCard.vue'
import { useRunSettingsPresentation } from './useRunSettingsPresentation'

defineOptions({ name: 'RunMemberRow' })

const props = withDefaults(defineProps<{
  node: RunMemberNode
  expandedKeys: ReadonlySet<string>
  locked?: RunSettingFlags
  runtimeLocked?: boolean
  /** Saved runs: the models each scope may switch to. */
  lockedModelsFor?: ((key: string) => readonly ChatModelOption[] | null) | null
  /** Saved runs show what a member sets itself but offer no reset. */
  readOnly?: boolean
}>(), { locked: () => ({}), runtimeLocked: false, lockedModelsFor: null, readOnly: false })

const emit = defineEmits<{
  (event: 'toggle', key: string): void
  (event: 'change', key: string, change: RunMemberSettingChange): void
  (event: 'reset', key: string, reset: RunMemberSettingReset): void
}>()

const presentation = useRunSettingsPresentation()
const expanded = computed(() => props.expandedKeys.has(props.node.key))
const customized = computed(() => isRunMemberCustomized(props.node))
const childCustomizedCount = computed(() => countCustomizedMembers(props.node.children))
/** What this member runs with, in one line: workspace (teams), model · runtime, other settings on, approval. */
const summary = computed(() => {
  const values = props.node.values
  const parts: string[] = []
  if (props.node.fields.includes('workspace')) parts.push(presentation.workspaceName(values.workspace))
  if (values.llmModelIdentifier) parts.push(`${presentation.modelLabel(values)} · ${presentation.runtimeShortLabel(values.runtimeKind)}`)
  parts.push(...setModelOptionLabels(presentation.modelOptions(values)))
  parts.push(presentation.approvalLabel(values))
  return parts.filter(Boolean).join(' · ')
})
</script>
