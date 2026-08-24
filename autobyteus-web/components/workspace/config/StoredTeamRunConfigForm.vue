<template>
  <div class="space-y-4" data-test="stored-team-run-config-form">
    <div>
      <p class="mb-1 text-sm font-medium text-gray-700">{{ t('workspace.components.workspace.config.TeamRunConfigForm.team_definition') }}</p>
      <div class="rounded-md bg-slate-50 px-3 py-2 text-sm text-gray-500">{{ view.teamDefinitionName }}</div>
    </div>

    <section class="rounded-lg border border-slate-200 bg-white p-3" aria-labelledby="stored-root-team-heading">
      <div class="mb-3">
        <h4 id="stored-root-team-heading" class="text-sm font-semibold text-slate-900">{{ t('workspace.components.workspace.config.StoredTeamRunConfig.root_defaults') }}</h4>
        <p class="font-mono text-xs text-slate-500">/</p>
      </div>
      <StoredLaunchConfigurationCard :config="view.root.effectiveConfig" />
    </section>

    <div v-if="hasMembers">
      <h4 class="mb-3 text-sm font-semibold text-slate-800">{{ t('workspace.components.workspace.config.StoredTeamRunConfig.stored_members') }}</h4>
      <StoredTeamRunConfigTree :view="view" parent-address="/" />
    </div>

    <p role="status" class="flex items-center rounded bg-slate-50 p-2 text-xs text-slate-600">
      <span aria-hidden="true" class="mr-1">◉</span>
      <span>{{ t('workspace.components.workspace.config.StoredTeamRunConfig.read_only') }}</span>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TeamRunConfigurationView } from '~/types/agent/TeamRunConfig'
import { useLocalization } from '~/composables/useLocalization'
import StoredLaunchConfigurationCard from './StoredLaunchConfigurationCard.vue'
import StoredTeamRunConfigTree from './StoredTeamRunConfigTree.vue'

const props = defineProps<{ view: Readonly<TeamRunConfigurationView> }>()
const { t } = useLocalization()
const hasMembers = computed(() => Object.keys(props.view.teamsByAddress).length > 1
  || Object.keys(props.view.agentsByAddress).length > 0)
</script>
