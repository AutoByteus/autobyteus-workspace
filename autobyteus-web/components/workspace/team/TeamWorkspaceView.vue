<template>
  <div v-if="target" class="flex h-full min-h-0 flex-col">
    <p v-if="copyPending || copyError" :role="copyError ? 'alert' : 'status'" class="px-4 py-2 text-sm" :class="copyError ? 'text-red-700' : 'text-slate-600'" data-test="team-copy-status">
      {{ copyError || t('workspace.teamCopy.loading') }}
    </p>
    <TeamWorkspaceSurface
      class="min-h-0 flex-1"
      :target="target"
      :show-header-actions="true"
      :recovery-notice="streamRecoveryNotice"
      @new-team="createNewTeamRun"
      @edit-config="openSelectedTeamConfig"
    />
  </div>
  <div v-else class="flex h-full items-center justify-center bg-gray-50 p-8 text-center text-gray-500">
    <div>
      <h3 class="text-lg font-medium text-gray-900">{{ $t('workspace.components.workspace.team.TeamWorkspaceView.no_active_team_runs') }}</h3>
      <p class="mx-auto mt-2 max-w-md">{{ $t('workspace.components.workspace.team.TeamWorkspaceView.this_team_profile_has_no_running') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import TeamWorkspaceSurface from '~/components/workspace/team/TeamWorkspaceSurface.vue'
import { useActiveContextStore } from '~/stores/activeContextStore'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore'
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore'
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import { useWorkspaceCenterViewStore } from '~/stores/workspaceCenterViewStore'
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore'
import { loadTeamRunLaunchSeed } from '~/services/runConfigEditing/teamRunLaunchSeed'
import { useLocalization } from '~/composables/useLocalization'

const active = useActiveContextStore()
const definitions = useAgentDefinitionStore()
const teamRunConfig = useTeamRunConfigStore()
const teamRuns = useAgentTeamRunStore()
const agentRunConfig = useAgentRunConfigStore()
const selection = useAgentSelectionStore()
const center = useWorkspaceCenterViewStore()
const teamContexts = useAgentTeamContextsStore()
const target = computed(() => active.activeWorkspaceTarget?.kind === 'standalone_team_member'
  ? active.activeWorkspaceTarget
  : null)
const streamRecoveryNotice = computed(() => target.value
  && teamRuns.getTeamStreamRecoveryNotice(target.value.team.rootRunId)
  ? 'Live Team updates are out of sync. Wait for the Team to finish its current work, then select this Team member again to reload the complete conversation.'
  : null)

const { t } = useLocalization()
const copyPending = ref(false)
const copyError = ref<string | null>(null)
let mounted = true
onBeforeUnmount(() => { mounted = false })
watch(() => selection.subject, () => { copyError.value = null })
const createNewTeamRun = async () => {
  const source = teamContexts.activeTeamContext
  if (!source || copyPending.value) return
  const intent = selection.beginSelectionIntent()
  const selected = selection.subject
  const focus = source.view.getFocusedAgentRunId()
  const configuration = source.view.getConfigurationView()
  const current = () => mounted && intent.isCurrent() && selection.subject === selected
    && teamContexts.activeTeamContext === source && source.view.getFocusedAgentRunId() === focus
  copyPending.value = true
  copyError.value = null
  try {
    const seed = await loadTeamRunLaunchSeed({ teamRunId: source.view.getRootTeamRunId(),
      expectedDefinitionId: configuration.teamDefinitionId,
      workspaceMetadata: Object.values(configuration.teamsByAddress).flatMap(team => team.effectiveConfig.workspaceMetadata ? [team.effectiveConfig.workspaceMetadata] : []),
    })
    if (!current()) return
    teamRunConfig.setConfig(seed)
    agentRunConfig.clearConfig()
    selection.clearSelection()
  } catch (cause) {
    if (current()) copyError.value = t('workspace.teamCopy.failed', { error: cause instanceof Error ? cause.message : String(cause) })
  } finally { if (mounted) copyPending.value = false }
}
const openSelectedTeamConfig = () => { if (target.value) center.showConfig() }

onMounted(async () => {
  if (!definitions.agentDefinitions.length) await definitions.fetchAllAgentDefinitions().catch(() => undefined)
})
</script>
