<template>
  <dl class="grid grid-cols-[minmax(7rem,auto)_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs" data-test="stored-launch-configuration">
    <dt class="font-medium text-slate-500">{{ t('workspace.components.workspace.config.StoredTeamRunConfig.runtime') }}</dt>
    <dd class="min-w-0 break-words text-slate-800">{{ runtimeKindToLabel(config.runtimeKind) }}</dd>
    <dt class="font-medium text-slate-500">{{ t('workspace.components.workspace.config.StoredTeamRunConfig.model') }}</dt>
    <dd class="min-w-0 break-words font-mono text-slate-800">{{ config.llmModelIdentifier || emptyValue }}</dd>
    <dt class="font-medium text-slate-500">{{ t('workspace.components.workspace.config.StoredTeamRunConfig.workspace') }}</dt>
    <dd class="min-w-0 break-all font-mono text-slate-800">{{ config.workspaceRootPath || emptyValue }}</dd>
    <dt class="font-medium text-slate-500">{{ t('workspace.components.workspace.config.StoredTeamRunConfig.skill_access') }}</dt>
    <dd class="min-w-0 break-words font-mono text-slate-800">{{ config.skillAccessMode }}</dd>
    <dt class="font-medium text-slate-500">{{ t('workspace.components.workspace.config.StoredTeamRunConfig.auto_execute') }}</dt>
    <dd class="text-slate-800">{{ config.autoExecuteTools ? enabledValue : disabledValue }}</dd>
    <dt class="font-medium text-slate-500">{{ t('workspace.components.workspace.config.StoredTeamRunConfig.model_config') }}</dt>
    <dd class="min-w-0">
      <pre v-if="config.llmConfig" class="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded bg-slate-50 p-2 font-mono text-[11px] leading-4 text-slate-700">{{ formattedLlmConfig }}</pre>
      <span v-else class="text-slate-500">{{ emptyValue }}</span>
    </dd>
  </dl>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { runtimeKindToLabel } from '~/types/agent/AgentRunConfig'
import type { ResolvedTeamRunLaunchConfig } from '~/types/agent/TeamRunConfig'
import { useLocalization } from '~/composables/useLocalization'

const props = defineProps<{ config: Readonly<ResolvedTeamRunLaunchConfig> }>()
const { t } = useLocalization()
const emptyValue = computed(() => t('workspace.components.workspace.config.StoredTeamRunConfig.none'))
const enabledValue = computed(() => t('workspace.components.workspace.config.StoredTeamRunConfig.enabled'))
const disabledValue = computed(() => t('workspace.components.workspace.config.StoredTeamRunConfig.disabled'))
const formattedLlmConfig = computed(() => JSON.stringify(props.config.llmConfig, null, 2))
</script>
