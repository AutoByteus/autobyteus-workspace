<template>
  <div class="space-y-0.5" :data-test="`run-settings-card${testSuffix ? `-${testSuffix}` : ''}`">
    <template v-for="field in fields" :key="field">
      <div
        class="flex min-h-[2.25rem] items-center gap-2"
        :data-test="`run-setting-${field}`"
        :data-state="rowState(field)"
      >
        <span class="w-24 flex-shrink-0 text-[0.8125rem] text-gray-900">{{ fieldLabel(field) }}</span>

        <div class="flex min-w-0 flex-1 flex-col items-start [&>div>button]:max-w-full [&>div]:max-w-full">
          <!-- Workspace -->
          <template v-if="field === 'workspace'">
            <span
              v-if="isLocked('workspace')"
              class="inline-flex max-w-full items-center gap-1.5 px-2 py-1 text-[0.8125rem] leading-5 text-gray-600"
              :title="presentation.workspacePath(values.workspace)"
              :aria-label="lockedAria(field, presentation.workspaceName(values.workspace))"
              data-test="run-setting-locked"
            >
              <Icon icon="heroicons:folder" class="h-4 w-4 flex-shrink-0 text-gray-400" aria-hidden="true" />
              <span class="truncate">{{ presentation.workspaceName(values.workspace) }}</span>
              <Icon icon="heroicons:lock-closed" class="h-3 w-3 flex-shrink-0 text-gray-300" aria-hidden="true" />
            </span>
            <ChatWorkspaceMenu
              v-else-if="values.workspace"
              :workspace="values.workspace"
              placement="auto"
              @select="emit('change', { field: 'workspace', choice: $event })"
            />
          </template>

          <!-- Model (with its runtime) -->
          <template v-else-if="field === 'model'">
            <span
              v-if="isLocked('model')"
              class="inline-flex max-w-full items-center gap-1.5 px-2 py-1 text-[0.8125rem] leading-5"
              :aria-label="lockedAria(field, `${modelText} · ${presentation.runtimeLabel(values.runtimeKind)}`)"
              data-test="run-setting-locked"
            >
              <span class="truncate font-medium text-gray-700">{{ modelText }}</span>
              <span class="truncate whitespace-nowrap text-gray-400">{{ presentation.runtimeShortLabel(values.runtimeKind) }}</span>
              <Icon icon="heroicons:lock-closed" class="h-3 w-3 flex-shrink-0 text-gray-300" aria-hidden="true" />
            </span>
            <ChatModelMenu
              v-else
              :runtime-kind="values.runtimeKind"
              :llm-model-identifier="values.llmModelIdentifier"
              :model-label="modelText"
              placement="auto"
              :align="nested ? 'right' : 'left'"
              :runtime-locked="runtimeLocked"
              :locked-models="lockedModels"
              :locked-models-state="lockedModelsState"
              :drill-in="nested"
              @select="emit('change', { field: 'model', choice: $event })"
            />
            <p v-if="modelUnavailable" class="px-2 pb-1 text-xs leading-5 text-amber-700" data-test="run-setting-model-unavailable">
              {{ $t('runSettings.model.unavailable', { runtime: presentation.runtimeLabel(values.runtimeKind) }) }}
            </p>
          </template>

          <!-- Thinking -->
          <template v-else-if="field === 'thinking'">
            <span v-if="thinkingHidden" class="px-2 py-1 text-[0.8125rem] leading-5 text-gray-500" data-test="run-setting-thinking-unavailable">
              {{ values.llmModelIdentifier ? $t('runSettings.thinking.unavailable') : '—' }}
            </span>
            <span
              v-else-if="isLocked('thinking')"
              class="inline-flex items-center gap-1 px-2 py-1 text-[0.8125rem] leading-5 text-gray-600"
              :aria-label="lockedAria(field, thinkingSummary)"
              data-test="run-setting-locked"
            >
              <Icon icon="heroicons:light-bulb" class="h-3.5 w-3.5" :class="thinkingActive ? 'text-gray-500' : 'text-gray-300'" aria-hidden="true" />
              <span>{{ thinkingSummary }}</span>
              <Icon icon="heroicons:lock-closed" class="ml-0.5 h-3 w-3 text-gray-300" aria-hidden="true" />
            </span>
            <ChatThinkingControl
              v-else
              :schema="schema"
              :llm-config="values.llmConfig"
              placement="auto"
              :align="nested ? 'right' : 'left'"
              @update="emit('change', { field: 'thinking', llmConfig: $event })"
            />
          </template>

          <!-- Tool approval -->
          <template v-else>
            <span
              v-if="isLocked('approval') && !approvalRuntimeLocked"
              class="inline-flex items-center gap-1.5 px-2 py-1 text-[0.8125rem] leading-5 text-gray-600"
              :aria-label="lockedAria(field, presentation.approvalLabel(values))"
              data-test="run-setting-locked"
            >
              <Icon :icon="values.autoExecuteTools ? 'heroicons:shield-check' : 'heroicons:shield-exclamation'" class="h-4 w-4 text-gray-400" aria-hidden="true" />
              <span class="whitespace-nowrap">{{ presentation.approvalLabel(values) }}</span>
              <Icon icon="heroicons:lock-closed" class="h-3 w-3 text-gray-300" aria-hidden="true" />
            </span>
            <ChatApprovalToggle
              v-else
              :model-value="approvalRuntimeLocked || values.autoExecuteTools"
              :locked="approvalRuntimeLocked"
              @update:model-value="emit('change', { field: 'approval', value: $event })"
            />
          </template>
        </div>

        <button
          v-if="canReset(field)"
          type="button"
          class="flex-shrink-0 rounded px-1.5 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
          :aria-label="$t('runSettings.inherited.resetAria', { setting: fieldLabel(field) })"
          data-test="run-setting-reset"
          @click="emit('reset', { field })"
        >
          {{ $t('runSettings.inherited.reset') }}
        </button>
      </div>

      <!-- REQ-022: the model's other settings (e.g. Codex Fast mode), one row each under Thinking,
           with the message box's chip. Locked with the thinking rules (a running saved run). -->
      <template v-if="field === 'thinking'">
        <div
          v-for="option in modelOptions"
          :key="option.key"
          class="flex min-h-[2.25rem] items-center gap-2"
          :data-test="`run-setting-option-${option.key}`"
          :data-state="isLocked('thinking') ? 'locked' : optionCustomized(option.key) ? 'customized' : member ? 'inherited' : 'set'"
        >
          <span class="w-24 flex-shrink-0 text-[0.8125rem] text-gray-900">{{ option.title }}</span>
          <div class="flex min-w-0 flex-1 flex-col items-start">
            <span
              v-if="isLocked('thinking')"
              class="inline-flex items-center gap-1 px-2 py-1 text-[0.8125rem] leading-5 text-gray-600"
              :aria-label="$t('runSettings.locked.fixedAria', { setting: option.title, value: lockedOptionText(option) })"
              data-test="run-setting-locked"
            >
              <Icon :icon="option.set ? `${option.icon}-solid` : option.icon" class="h-3.5 w-3.5" :class="option.set ? 'text-gray-500' : 'text-gray-300'" aria-hidden="true" />
              <span>{{ lockedOptionText(option) }}</span>
              <Icon icon="heroicons:lock-closed" class="ml-0.5 h-3 w-3 text-gray-300" aria-hidden="true" />
            </span>
            <ChatModelOptionControl
              v-else
              :option="option"
              placement="auto"
              :align="nested ? 'right' : 'left'"
              @update="emit('change', { field: 'thinking', llmConfig: applyModelOption(values.llmConfig, option.key, $event) })"
            />
          </div>
          <button
            v-if="resettable && optionCustomized(option.key)"
            type="button"
            class="flex-shrink-0 rounded px-1.5 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
            :aria-label="$t('runSettings.inherited.resetAria', { setting: option.title })"
            :data-test="`run-setting-option-reset-${option.key}`"
            @click="emit('reset', { field: 'option', key: option.key })"
          >
            {{ $t('runSettings.inherited.reset') }}
          </button>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { Icon } from '@iconify/vue'
import ChatWorkspaceMenu from '~/components/chat/ChatWorkspaceMenu.vue'
import ChatModelMenu from '~/components/chat/ChatModelMenu.vue'
import ChatThinkingControl from '~/components/chat/ChatThinkingControl.vue'
import ChatApprovalToggle from '~/components/chat/ChatApprovalToggle.vue'
import ChatModelOptionControl from '~/components/chat/ChatModelOptionControl.vue'
import { applyModelOption, type ModelOption } from '~/utils/runSettings/modelOptions'
import type { ChatCatalogState, ChatModelOption } from '~/composables/chat/useChatModelCatalog'
import { useLocalization } from '~/composables/useLocalization'
import { isAutoApproveLockedForRuntime } from '~/utils/agentRunRuntimeDraftPolicy'
import {
  ALL_RUN_SETTING_FIELDS,
  type RunMemberSettingChange,
  type RunMemberSettingReset,
  type RunSettingField,
  type RunSettingFlags,
  type RunSettingsValues,
} from '~/types/runSettings/RunSettings'
import { useRunSettingsPresentation } from './useRunSettingsPresentation'

/**
 * The run settings as labelled rows with the chat controls (Org launch card, an opened member,
 * saved-run settings). Locked fields show their value with a lock. For a member, what it sets
 * itself carries a Reset.
 */
const props = withDefaults(defineProps<{
  values: RunSettingsValues
  fields?: readonly RunSettingField[]
  /** Fields that cannot change here (a saved run's fixed values, a starting launch). */
  locked?: RunSettingFlags
  /** A saved run keeps its runtime: the model menu lists only that runtime's models. */
  runtimeLocked?: boolean
  lockedModels?: readonly ChatModelOption[] | null
  lockedModelsState?: ChatCatalogState
  modelUnavailable?: boolean
  /** A member: which fields and other model settings it sets itself. */
  member?: Readonly<{ customized: RunSettingFlags; customizedOptionKeys: readonly string[] }> | null
  /** Members offer a per-field Reset. */
  resettable?: boolean
  nested?: boolean
  testSuffix?: string
}>(), {
  fields: () => ALL_RUN_SETTING_FIELDS,
  locked: () => ({}),
  runtimeLocked: false,
  lockedModels: null,
  lockedModelsState: 'ready',
  modelUnavailable: false,
  member: null,
  resettable: true,
  nested: false,
  testSuffix: '',
})

const emit = defineEmits<{
  (event: 'change', value: RunMemberSettingChange): void
  (event: 'reset', value: RunMemberSettingReset): void
}>()

const { t } = useLocalization()
const presentation = useRunSettingsPresentation()
watch(() => props.values.runtimeKind, (runtimeKind) => presentation.ensureCatalog(runtimeKind), { immediate: true })

const fieldLabel = (field: RunSettingField) => ({
  workspace: t('runSettings.row.workspace'),
  model: t('runSettings.row.model'),
  thinking: t('runSettings.row.thinking'),
  approval: t('runSettings.row.tools'),
})[field]

const isLocked = (field: RunSettingField) => Boolean(props.locked[field])
const schema = computed(() => presentation.schemaOf(props.values))
const modelText = computed(() => presentation.modelLabel(props.values))
const thinking = computed(() => presentation.thinkingMenu(props.values))
const thinkingHidden = computed(() => thinking.value.mode === 'hidden')
const thinkingSummary = computed(() => (thinking.value.mode === 'hidden' ? '' : thinking.value.summary))
const thinkingActive = computed(() => thinking.value.mode !== 'hidden' && thinking.value.active)
const modelOptions = computed<ModelOption[]>(() => presentation.modelOptions(props.values))
const approvalRuntimeLocked = computed(() => isAutoApproveLockedForRuntime(props.values.runtimeKind))

const isCustomized = (field: RunSettingField) => Boolean(props.member?.customized[field])
const optionCustomized = (key: string) => !isLocked('thinking') && Boolean(props.member?.customizedOptionKeys.includes(key))
const canReset = (field: RunSettingField) => props.resettable && isCustomized(field) && !isLocked(field)
  && !(field === 'approval' && approvalRuntimeLocked.value)
const rowState = (field: RunSettingField) => {
  if (isLocked(field)) return 'locked'
  if (isCustomized(field)) return 'customized'
  return props.member ? 'inherited' : 'set'
}
const lockedAria = (field: RunSettingField, value: string) => t('runSettings.locked.fixedAria', { setting: fieldLabel(field), value })
const lockedOptionText = (option: ModelOption) => (option.kind === 'toggle'
  ? (option.set ? option.onLabel : t('chat.modelOption.off'))
  : option.valueLabel)
</script>
