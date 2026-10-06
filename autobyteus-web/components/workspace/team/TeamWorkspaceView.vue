<template>
  <div v-if="target" class="flex h-full min-h-0 flex-col">
    <p v-if="copyPending" role="status" class="px-4 py-2 text-sm text-slate-600" data-test="team-copy-status">
      {{ t('workspace.teamCopy.loading') }}
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
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import TeamWorkspaceSurface from '~/components/workspace/team/TeamWorkspaceSurface.vue'
import { useActiveContextStore } from '~/stores/activeContextStore'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore'
import { useWorkspaceCenterViewStore } from '~/stores/workspaceCenterViewStore'
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import { useLocalization } from '~/composables/useLocalization'
import { useRunStart } from '~/composables/runSettings/useRunStart'

const active = useActiveContextStore()
const definitions = useAgentDefinitionStore()
const teamRuns = useAgentTeamRunStore()
const center = useWorkspaceCenterViewStore()
const teamContexts = useAgentTeamContextsStore()
const selection = useAgentSelectionStore()
const target = computed(() => active.activeWorkspaceTarget?.kind === 'standalone_team_member'
  ? active.activeWorkspaceTarget
  : null)
const streamRecoveryNotice = computed(() => target.value
  && teamRuns.getTeamStreamRecoveryNotice(target.value.team.rootRunId)
  ? 'Live Team updates are out of sync. Wait for the Team to finish its current work, then select this Team member again to reload the complete conversation.'
  : null)

const { t } = useLocalization()
const runStart = useRunStart()
const copyPending = ref(false)
let mounted = true
onBeforeUnmount(() => { mounted = false })
/** ＋ opens New chat for this team with the run's settings and member overrides (REQ-013). */
const createNewTeamRun = async () => {
  const source = teamContexts.activeTeamContext
  if (!source || copyPending.value) return
  const configuration = source.view.getConfigurationView()
  const intent = selection.beginSelectionIntent()
  const selected = selection.subject
  const focus = source.view.getFocusedAgentRunId()
  copyPending.value = true
  try {
    await runStart.copyTeamRun({
      teamRunId: source.view.getRootTeamRunId(),
      teamDefinitionId: configuration.teamDefinitionId,
      workspaceMetadata: Object.values(configuration.teamsByAddress)
        .flatMap(team => team.effectiveConfig.workspaceMetadata ? [team.effectiveConfig.workspaceMetadata] : []),
      // The user may move on while the run is read; a late copy then opens nothing.
      isCurrent: () => mounted && intent.isCurrent() && selection.subject === selected
        && teamContexts.activeTeamContext === source && source.view.getFocusedAgentRunId() === focus,
    })
  } finally { if (mounted) copyPending.value = false }
}
const openSelectedTeamConfig = () => { if (target.value) center.showConfig() }

onMounted(async () => {
  if (!definitions.agentDefinitions.length) await definitions.fetchAllAgentDefinitions().catch(() => undefined)
})
</script>
