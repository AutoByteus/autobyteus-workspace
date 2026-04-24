<template>
  <div class="space-y-4">
    <div>
      <label class="mb-1 block text-sm font-medium text-gray-700">{{ $t('workspace.components.workspace.config.AgentRunConfigForm.agent_definition') }}</label>
      <div class="block w-full cursor-not-allowed select-none rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500 shadow-sm">
        {{ agentDefinition.name }}
      </div>
    </div>

    <RuntimeModelConfigFields
      :runtime-kind="config.runtimeKind"
      :llm-model-identifier="config.llmModelIdentifier"
      :llm-config="config.llmConfig"
      :disabled="isFormReadOnly"
      :read-only="isFormReadOnly"
      :runtime-selection-locked="runtimeSelectionLocked"
      :runtime-help-text="$t('workspace.components.workspace.config.AgentRunConfigForm.selects_the_runtime_backend_used_for')"
      :model-label="$t('workspace.components.workspace.config.AgentRunConfigForm.llm_model')"
      :model-help-text="$t('workspace.components.workspace.config.AgentRunConfigForm.select_a_model')"
      :advanced-initially-expanded="readOnlyMode"
      :missing-historical-config="missingHistoricalConfig"
      id-prefix="agent-run"
      @update:runtime-kind="updateRuntimeKind"
      @update:llm-model-identifier="updateLlmModelIdentifier"
      @update:llm-config="updateLlmConfig"
    />

    <div class="mt-8">
      <WorkspaceSelector
        :workspace-id="config.workspaceId"
        :is-loading="workspaceLoadingState.isLoading"
        :error="workspaceLoadingState.error"
        :disabled="isFormReadOnly"
        :workspace-locked="workspaceLocked"
        workspace-locked-message="Workspace is fixed for existing runs."
        @select-existing="handleSelectExisting"
        @load-new="handleLoadNew"
      />
    </div>

    <div class="mt-2 flex items-center justify-between gap-4 py-2">
      <label for="auto-execute" class="block text-base text-gray-900 select-none" :class="{ 'text-gray-400': isFormReadOnly }">{{ $t('workspace.components.workspace.config.AgentRunConfigForm.auto_approve_tools') }}</label>
      <button
        id="auto-execute"
        type="button"
        class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        :class="config.autoExecuteTools ? 'bg-blue-600' : 'bg-gray-200'"
        @click="updateAutoExecute(!config.autoExecuteTools)"
        :disabled="isFormReadOnly"
      >
        <span class="sr-only">{{ $t('workspace.components.workspace.config.AgentRunConfigForm.auto_approve_tools') }}</span>
        <span
          aria-hidden="true"
          class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
          :class="config.autoExecuteTools ? 'translate-x-5' : 'translate-x-0'"
        />
      </button>
    </div>

    <div>
      <label for="skill-access-mode" class="mb-1 block text-sm font-medium text-gray-700">{{ $t('workspace.components.workspace.config.AgentRunConfigForm.skill_access') }}</label>
      <select
        id="skill-access-mode"
        :value="config.skillAccessMode"
        :disabled="isFormReadOnly"
        class="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
        @change="updateSkillAccessMode(($event.target as HTMLSelectElement).value)"
      >
        <option value="PRELOADED_ONLY">{{ $t('workspace.components.workspace.config.AgentRunConfigForm.configured_skills_only_recommended') }}</option>
        <option value="GLOBAL_DISCOVERY">{{ $t('workspace.components.workspace.config.AgentRunConfigForm.all_installed_skills') }}</option>
        <option value="NONE">{{ $t('workspace.components.workspace.config.AgentRunConfigForm.no_skills') }}</option>
      </select>
      <p class="mt-1 text-xs text-gray-500">{{ $t('workspace.components.workspace.config.AgentRunConfigForm.controls_which_skills_this_agent_is') }}</p>
    </div>

    <div v-if="readOnlyMode" class="flex items-center rounded bg-slate-50 p-2 text-xs text-slate-600">
      <span class="i-heroicons-eye-20-solid mr-1 h-4 w-4"></span>
      <span>{{ $t('workspace.components.workspace.config.AgentRunConfigForm.selected_run_configuration_read_only') }}</span>
    </div>

    <div v-else-if="config.isLocked" class="flex items-center rounded bg-amber-50 p-2 text-xs text-amber-600">
      <span class="i-heroicons-lock-closed-20-solid mr-1 h-4 w-4"></span>
      <span>{{ $t('workspace.components.workspace.config.AgentRunConfigForm.configuration_locked_because_execution_has_start') }}</span>
    </div>

    <div v-else-if="runtimeLocked" class="flex items-center rounded bg-amber-50 p-2 text-xs text-amber-600">
      <span class="i-heroicons-lock-closed-20-solid mr-1 h-4 w-4"></span>
      <span>{{ $t('workspace.components.workspace.config.AgentRunConfigForm.runtime_is_fixed_for_existing_runs') }}</span>
    </div>

    <div v-else-if="workspaceLocked" class="flex items-center rounded bg-amber-50 p-2 text-xs text-amber-600">
      <span class="i-heroicons-lock-closed-20-solid mr-1 h-4 w-4"></span>
      <span>{{ $t('workspace.components.workspace.config.AgentRunConfigForm.existing_run_configuration_can_be_changed') }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AgentDefinition } from '~/stores/agentDefinitionStore'
import type { AgentRunConfig, SkillAccessMode } from '~/types/agent/AgentRunConfig'
import RuntimeModelConfigFields from '~/components/launch-config/RuntimeModelConfigFields.vue'
import WorkspaceSelector from './WorkspaceSelector.vue'

interface WorkspaceLoadingState {
  isLoading: boolean;
  error: string | null;
  loadedPath: string | null;
}

const props = defineProps<{
  config: AgentRunConfig | any;
  agentDefinition: AgentDefinition;
  workspaceLoadingState: WorkspaceLoadingState;
  initialPath?: string;
  workspaceLocked?: boolean;
  runtimeLocked?: boolean;
  readOnly?: boolean;
}>();

const emit = defineEmits<{
  (e: 'select-existing', workspaceId: string): void;
  (e: 'load-new', path: string): void;
}>();

const workspaceLocked = computed(() => props.workspaceLocked === true)
const runtimeLocked = computed(() => props.runtimeLocked === true)
const readOnlyMode = computed(() => props.readOnly === true)
const isFormReadOnly = computed(() => props.config.isLocked || readOnlyMode.value)
const missingHistoricalConfig = computed(() =>
  readOnlyMode.value &&
  props.config.llmConfig == null,
)
const runtimeSelectionLocked = computed(() => isFormReadOnly.value || runtimeLocked.value)

const updateAutoExecute = (checked: boolean) => {
  if (isFormReadOnly.value) return
  props.config.autoExecuteTools = checked
}

const updateSkillAccessMode = (value: string) => {
  if (isFormReadOnly.value) return
  props.config.skillAccessMode = value as SkillAccessMode
}

const updateRuntimeKind = (value: string) => {
  if (isFormReadOnly.value) return
  props.config.runtimeKind = value
}

const updateLlmModelIdentifier = (value: string) => {
  if (isFormReadOnly.value) return
  props.config.llmModelIdentifier = value
}

const updateLlmConfig = (value: Record<string, unknown> | null) => {
  if (isFormReadOnly.value) return
  props.config.llmConfig = value
}

const handleSelectExisting = (workspaceId: string) => {
  if (isFormReadOnly.value) return
  emit('select-existing', workspaceId)
}

const handleLoadNew = (path: string) => {
  if (isFormReadOnly.value) return
  emit('load-new', path)
}
</script>
