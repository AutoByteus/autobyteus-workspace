<template>
  <div class="space-y-4">
    <div>
      <label class="mb-1 block text-sm font-medium text-gray-700">{{ $t('workspace.components.workspace.config.TeamRunConfigForm.team_definition') }}</label>
      <div class="block w-full cursor-not-allowed select-none rounded-md border border-transparent bg-slate-50 px-3 py-2 text-sm text-gray-500">
        {{ teamDefinition.name }}
      </div>
    </div>

    <RuntimeModelConfigFields
      :runtime-kind="config.runtimeKind"
      :llm-model-identifier="config.llmModelIdentifier"
      :llm-config="config.llmConfig"
      :disabled="isFormReadOnly"
      :read-only="isFormReadOnly"
      :runtime-selection-locked="runtimeSelectionLocked"
      :runtime-help-text="$t('workspace.components.workspace.config.TeamRunConfigForm.selects_the_runtime_backend_used_by')"
      :model-label="$t('workspace.components.workspace.config.TeamRunConfigForm.default_llm_model_global')"
      :model-help-text="$t('workspace.components.workspace.config.TeamRunConfigForm.this_model_will_be_used_by')"
      :advanced-initially-expanded="readOnlyMode"
      :missing-historical-config="missingHistoricalGlobalConfig"
      id-prefix="team-run"
      control-variant="quiet"
      @update:runtime-kind="updateRuntimeKind"
      @update:llm-model-identifier="updateLlmModelIdentifier"
      @update:llm-config="updateLlmConfig"
    />

    <div class="mt-8">
      <WorkspaceSelector
        :workspace-id="config.workspaceId"
        :is-loading="workspaceLoadingState.isLoading"
        :error="workspaceLoadingState.error"
        :initial-path="initialPath || workspaceLoadingState.loadedPath || ''"
        :disabled="isFormReadOnly"
        control-variant="quiet"
        @select-existing="handleSelectExisting"
        @workspace-input-change="handleWorkspaceInputChange"
      />
    </div>

    <div class="mt-4 flex items-center justify-between gap-4 py-2" data-test="team-auto-approve-row">
      <div class="min-w-0">
        <label for="team-auto-execute" class="block text-base text-gray-900 select-none" :class="{ 'text-gray-400': isFormReadOnly }">{{ $t('workspace.components.workspace.config.TeamRunConfigForm.auto_approve_tools') }}</label>
        <p class="mt-1 text-xs leading-relaxed text-gray-500">
          {{ $t('workspace.components.workspace.config.TeamRunConfigForm.auto_approve_tools_help') }}
        </p>
      </div>
      <button
        id="team-auto-execute"
        type="button"
        class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        :class="config.autoExecuteTools ? 'bg-blue-600' : 'bg-gray-200'"
        :disabled="isFormReadOnly"
        @click="updateAutoExecute(!config.autoExecuteTools)"
      >
        <span class="sr-only">{{ $t('workspace.components.workspace.config.TeamRunConfigForm.auto_approve_tools') }}</span>
        <span
          aria-hidden="true"
          class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
          :class="config.autoExecuteTools ? 'translate-x-5' : 'translate-x-0'"
        />
      </button>
    </div>

    <div v-if="leafMembers.length > 0" class="mt-4">
      <button
        type="button"
        class="flex w-full items-center justify-between rounded-md px-1 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        data-test="team-member-overrides-toggle"
        :aria-expanded="overridesExpanded"
        :aria-controls="memberOverridesPanelId"
        @click="overridesExpanded = !overridesExpanded"
      >
        <span class="flex min-w-0 items-center gap-1.5">
          <span class="truncate">
            {{ t('workspace.components.workspace.config.TeamRunConfigForm.team_members_override') }} ({{ leafMembers.length }})
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-4 w-4 flex-shrink-0 transform text-gray-600 transition-transform duration-300"
            :class="overridesExpanded ? '' : '-rotate-90'"
            data-test="team-member-overrides-chevron"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
        <span
          v-if="meaningfulOverrideCount > 0"
          class="ml-3 flex-shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-100"
          data-test="team-member-overrides-count"
        >
          {{ t('workspace.components.workspace.config.TeamRunConfigForm.member_overrides_count', { count: meaningfulOverrideCount }) }}
        </span>
      </button>

      <div
        v-show="overridesExpanded"
        :id="memberOverridesPanelId"
        class="mt-3"
        data-test="team-member-overrides-panel"
      >
        <MemberOverrideTree
          :member-nodes="memberTree"
          :config="config"
          :global-runtime-kind="config.runtimeKind"
          :global-llm-model="config.llmModelIdentifier"
          :global-llm-config="config.llmConfig"
          :coordinator-address="coordinatorAddress"
          :disabled="isFormReadOnly"
          :advanced-initially-expanded="readOnlyMode"
          :read-only-mode="readOnlyMode"
          @update:override="handleOverrideUpdate"
        />
      </div>
    </div>


    <div v-if="readOnlyMode" class="flex items-center rounded bg-slate-50 p-2 text-xs text-slate-600">
      <span class="i-heroicons-eye-20-solid mr-1 h-4 w-4"></span>
      <span>{{ $t('workspace.components.workspace.config.TeamRunConfigForm.selected_team_run_configuration_read_only') }}</span>
    </div>

    <div v-else-if="config.isLocked" class="flex items-center rounded bg-amber-50 p-2 text-xs text-amber-600">
      <span class="i-heroicons-lock-closed-20-solid mr-1 h-4 w-4"></span>
      <span>{{ $t('workspace.components.workspace.config.TeamRunConfigForm.configuration_locked_because_execution_has_start') }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRef } from 'vue'
import type { AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore'
import type { TeamRunConfig, MemberConfigOverride } from '~/types/agent/TeamRunConfig'
import type { TeamLaunchConfigEdit } from '~/types/agent/TeamLaunchDraft'
import RuntimeModelConfigFields from '~/components/launch-config/RuntimeModelConfigFields.vue'
import WorkspaceSelector from './WorkspaceSelector.vue'
import MemberOverrideTree from './MemberOverrideTree.vue'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useLocalization } from '~/composables/useLocalization'
import { useTeamRunRuntimeCatalogSync } from '~/composables/useTeamRunRuntimeCatalogSync'
import {
  buildTeamMemberTreeFromDefinition,
  flattenLeafAgentMemberNodes,
} from '~/utils/teamDefinitionMembers'
import {
  hasMeaningfulMemberOverride,
} from '~/utils/teamRunConfigUtils'

interface WorkspaceLoadingState {
  isLoading: boolean
  error: string | null
  loadedPath: string | null
}

const props = defineProps<{
  config: Readonly<TeamRunConfig>
  teamDefinition: AgentTeamDefinition
  workspaceLoadingState: WorkspaceLoadingState
  initialPath?: string
  readOnly?: boolean
}>()

const emit = defineEmits<{
  (e: 'select-existing', workspaceId: string): void
  (e: 'workspace-input-change', input: { mode: 'existing' | 'new'; pendingPath: string }): void
  (e: 'edit-config', edit: TeamLaunchConfigEdit): void
}>()

const teamDefinitionStore = useAgentTeamDefinitionStore()
const { t } = useLocalization()
const overridesExpanded = ref(false)
const memberOverridesPanelId = 'team-member-overrides-panel'
const readOnlyMode = computed(() => props.readOnly === true)
const isFormReadOnly = computed(() => props.config.isLocked || readOnlyMode.value)
const missingHistoricalGlobalConfig = computed(() =>
  readOnlyMode.value &&
  props.config.llmConfig == null,
)
const runtimeSelectionLocked = computed(() => isFormReadOnly.value)
const memberTree = computed(() =>
  buildTeamMemberTreeFromDefinition(props.teamDefinition, {
    getTeamDefinitionById: (teamDefinitionId: string) =>
      teamDefinitionStore.getAgentTeamDefinitionById(teamDefinitionId),
  }),
)
const leafMembers = computed(() => flattenLeafAgentMemberNodes(memberTree.value))
const meaningfulOverrideCount = computed(() =>
  Object.values(props.config.memberOverrides || {}).filter((override) =>
    hasMeaningfulMemberOverride(override),
  ).length,
)
const coordinatorAddress = computed(() => {
  const coordinatorMemberName = props.teamDefinition.coordinatorMemberName?.trim() || ''
  if (!coordinatorMemberName) return ''
  return memberTree.value.find((node) => node.displayName === coordinatorMemberName)?.address || coordinatorMemberName
})

useTeamRunRuntimeCatalogSync(toRef(props, 'config'))

const handleOverrideUpdate = (memberAddress: string, override: MemberConfigOverride | null) => {
  if (isFormReadOnly.value) return
  emit('edit-config', { kind: 'set_member_override', memberAddress, override })
}

const updateAutoExecute = (checked: boolean) => {
  if (isFormReadOnly.value) return
  emit('edit-config', { kind: 'set_auto_execute_tools', autoExecuteTools: checked })
}

const updateRuntimeKind = (value: string) => {
  if (isFormReadOnly.value) return
  emit('edit-config', { kind: 'set_runtime', runtimeKind: value })
}

const updateLlmModelIdentifier = (value: string) => {
  if (isFormReadOnly.value) return
  emit('edit-config', { kind: 'set_model', llmModelIdentifier: value })
}

const updateLlmConfig = (value: Record<string, unknown> | null) => {
  if (isFormReadOnly.value) return
  emit('edit-config', { kind: 'set_llm_config', llmConfig: value })
}

const handleSelectExisting = (workspaceId: string) => {
  if (isFormReadOnly.value) return
  emit('select-existing', workspaceId)
}

const handleWorkspaceInputChange = (input: { mode: 'existing' | 'new'; pendingPath: string }) => {
  if (isFormReadOnly.value) return
  emit('workspace-input-change', input)
}
</script>
