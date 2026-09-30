<template>
  <!-- A collaborator that could not be brought into this run. Success has no notice: the run tree shows it. -->
  <div v-if="visible.length" class="mb-2 space-y-2" data-test="collaborator-add-failures">
    <div
      v-for="failure in visible"
      :key="failure.invocationId"
      class="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
      role="alert"
      data-test="collaborator-add-failure"
    >
      <Icon icon="heroicons:exclamation-triangle-20-solid" class="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" aria-hidden="true" />
      <div class="min-w-0 flex-1">
        <p class="font-medium">{{ $t('chat.mentions.noticeFailed', { name: failure.name }) }}</p>
        <p class="mt-0.5 text-xs text-red-700">{{ $t('chat.mentions.noticeFailedDetail', { reason: failure.reason }) }}</p>
      </div>
      <button
        type="button"
        class="flex-shrink-0 rounded p-1 text-red-400 hover:bg-red-100 hover:text-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        :aria-label="$t('chat.mentions.noticeDismiss')"
        data-test="collaborator-add-failure-dismiss"
        @click="dismissed.add(failure.invocationId)"
      >
        <Icon icon="heroicons:x-mark" class="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { Icon } from '@iconify/vue'
import { useActiveContextStore } from '~/stores/activeContextStore'
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore'
import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore'
import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { collaboratorDisplayName } from '~/services/collaborators/agentSourceSelectors'
import { deriveCollaboratorAddFailures } from '~/services/collaborators/collaboratorAddFailures'

/** Dismissed notices, by `delegate_task` invocation; a new send replaces the notice anyway. */
const dismissed = reactive(new Set<string>())

const active = useActiveContextStore()
const teams = useAgentTeamContextsStore()
const orgs = useAgentOrgContextsStore()
const agentRoots = useAgentRunCollaborationStore()
const agentDefinitions = useAgentDefinitionStore()
const teamDefinitions = useAgentTeamDefinitionStore()

type Entry = Readonly<{ address: string; kind: 'agent' | 'agent_team'; definitionId: string }>

/** The root-level collaborator entries of the run the focused agent belongs to. */
const entries = computed<Entry[]>(() => {
  const target = active.activeWorkspaceTarget
  if (!target) return []
  if (target.kind === 'standalone_team_member') {
    return (teams.activeTeamContext?.view.getExecutionTree().root_team.collaborators ?? []).map((entry) => ({
      address: entry.address, kind: entry.kind,
      definitionId: entry.kind === 'agent' ? entry.agent_definition_id : entry.team_definition_id,
    }))
  }
  const camel = 'root' in target
    ? orgs.contextFor(target.root.orgRunId)?.executionTree.rootOrg.collaborators
    : agentRoots.contextFor('host' in target ? target.host.hostRunId : target.context.state.runId)?.view.execution_tree.collaborators
  return (camel ?? []).map((entry) => ({
    address: entry.address, kind: entry.kind,
    definitionId: entry.kind === 'agent' ? entry.agentDefinitionId : entry.teamDefinitionId,
  }))
})

const collaboratorNames = computed(() => new Map(entries.value.map((entry) => {
  const definitionName = entry.kind === 'agent'
    ? agentDefinitions.getAgentDefinitionById(entry.definitionId)?.name
    : teamDefinitions.agentTeamDefinitions.find((definition) => definition.id === entry.definitionId)?.name
  return [entry.address, definitionName || collaboratorDisplayName(entry.address)]
})))

const visible = computed(() => {
  const context = active.activeWorkspaceTarget?.context
  if (!context || collaboratorNames.value.size === 0) return []
  return deriveCollaboratorAddFailures({ conversation: context.state.conversation, collaboratorNames: collaboratorNames.value })
    .filter((failure) => !dismissed.has(failure.invocationId))
})
</script>
