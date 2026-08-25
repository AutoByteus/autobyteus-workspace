<template>
  <div class="space-y-4">
    <div>
      <label class="mb-1 block text-sm font-medium text-gray-700">{{ $t('workspace.components.workspace.config.AgentRunConfigForm.agent_definition') }}</label>
      <div class="block w-full cursor-not-allowed select-none rounded-md border border-transparent bg-slate-50 px-3 py-2 text-sm text-gray-500">
        {{ agentDefinition.name }}
      </div>
    </div>

    <RuntimeModelConfigFields
      :runtime-kind="config.runtimeKind"
      :llm-model-identifier="config.llmModelIdentifier"
      :llm-config="config.llmConfig"
      :disabled="!existingRun && isFormReadOnly"
      :read-only="!existingRun && isFormReadOnly"
      :runtime-selection-locked="runtimeSelectionLocked"
      :model-selection-locked="existingRun || isFormReadOnly"
      :model-config-disabled="modelConfigReadOnly"
      :model-config-read-only="modelConfigReadOnly"
      :runtime-help-text="existingRun ? $t('workspace.runModelConfig.fixedIdentity') : $t('workspace.components.workspace.config.AgentRunConfigForm.selects_the_runtime_backend_used_for')"
      :model-label="$t('workspace.components.workspace.config.AgentRunConfigForm.llm_model')"
      :model-help-text="existingRun ? $t('workspace.runModelConfig.fixedIdentity') : $t('workspace.components.workspace.config.AgentRunConfigForm.select_a_model')"
      :advanced-initially-expanded="existingRun"
      :historical-model-config="existingRun"
      :missing-historical-config="missingHistoricalConfig"
      :validation-errors="modelConfigFieldErrors"
      id-prefix="agent-run"
      control-variant="quiet"
      @update:runtime-kind="updateRuntimeKind"
      @update:llm-model-identifier="updateLlmModelIdentifier"
      @update:llm-config="updateLlmConfig"
      @schema-state="emit('schema-state', $event)"
    />

    <div class="mt-8">
      <WorkspaceSelector
        :model="{
          mode: 'editable',
          selection: workspaceSelection,
          isLoading: workspaceLoadingState.isLoading,
          error: workspaceLoadingState.error,
        }"
        :disabled="isFormReadOnly"
        :workspace-locked="workspaceLocked"
        :workspace-locked-message="$t('workspace.runModelConfig.fixedWorkspace')"
        control-variant="quiet"
        @update:model-value="handleWorkspaceSelectionChange"
      />
    </div>

    <div class="mt-2 flex items-center justify-between gap-4 py-2">
      <div class="min-w-0">
        <label for="auto-execute" class="block text-base text-gray-900 select-none" :class="{ 'text-gray-400': isFormReadOnly }">{{ $t('workspace.components.workspace.config.AgentRunConfigForm.auto_approve_tools') }}</label>
        <p class="mt-1 text-xs leading-relaxed text-gray-500">
          {{ $t('workspace.components.workspace.config.AgentRunConfigForm.auto_approve_tools_help') }}
        </p>
      </div>
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

    <div v-if="existingRun" class="flex items-center rounded p-2 text-xs" :class="existingModelConfigEditable ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'">
      <span aria-hidden="true" class="mr-1">{{ existingModelConfigEditable ? '●' : '🔒' }}</span>
      <span>{{ existingRunStatusMessage }}</span>
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
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig'
import type { WorkspaceSelectionState } from '~/types/workspace/WorkspaceSelectionState'
import RuntimeModelConfigFields from '~/components/launch-config/RuntimeModelConfigFields.vue'
import WorkspaceSelector from './WorkspaceSelector.vue'
import { useLocalization } from '~/composables/useLocalization'

interface WorkspaceLoadingState {
  isLoading: boolean;
  error: string | null;
  loadedPath: string | null;
}

const props = defineProps<{
  config: AgentRunConfig | any;
  agentDefinition: Pick<AgentDefinition, 'name'>;
  workspaceLoadingState: WorkspaceLoadingState;
  workspaceSelection: WorkspaceSelectionState;
  workspaceLocked?: boolean;
  runtimeLocked?: boolean;
  existingRun?: boolean;
  existingModelConfigEditable?: boolean;
  existingModelConfigReason?: string | null;
  saving?: boolean;
  modelConfigFieldErrors?: Readonly<Record<string, string>>;
}>();

const emit = defineEmits<{
  (e: 'update:workspaceSelection', selection: WorkspaceSelectionState): void;
  (e: 'update:llmConfig', value: Record<string, unknown> | null): void;
  (e: 'schema-state', value: { status: 'loading' | 'ready' | 'invalid' | 'unavailable'; message: string | null }): void;
}>();
const { t } = useLocalization()

const workspaceLocked = computed(() => props.workspaceLocked === true)
const runtimeLocked = computed(() => props.runtimeLocked === true)
const existingRun = computed(() => props.existingRun === true)
const existingModelConfigEditable = computed(() => props.existingModelConfigEditable === true)
const existingRunStatusMessage = computed(() => props.existingModelConfigReason === 'REFRESH_REQUIRED'
  ? t('workspace.runModelConfig.refreshRequired')
  : existingModelConfigEditable.value
    ? t('workspace.runModelConfig.agentStopped')
    : t('workspace.runModelConfig.agentActive'))
const modelConfigFieldErrors = computed(() => props.modelConfigFieldErrors ?? {})
const isFormReadOnly = computed(() => props.config.isLocked)
const modelConfigReadOnly = computed(() => props.saving === true || (existingRun.value
  ? !existingModelConfigEditable.value
  : isFormReadOnly.value))
const missingHistoricalConfig = computed(() =>
  existingRun.value && props.config.llmConfig == null,
)
const runtimeSelectionLocked = computed(() => existingRun.value || isFormReadOnly.value || runtimeLocked.value)

const updateAutoExecute = (checked: boolean) => {
  if (isFormReadOnly.value) return
  props.config.autoExecuteTools = checked
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
  if (modelConfigReadOnly.value) return
  if (existingRun.value) emit('update:llmConfig', value)
  else props.config.llmConfig = value
}

const handleWorkspaceSelectionChange = (selection: WorkspaceSelectionState) => {
  if (isFormReadOnly.value) return
  emit('update:workspaceSelection', selection)
}
</script>
