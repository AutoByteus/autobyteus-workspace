<template>
  <main class="min-h-screen bg-slate-100 p-4 text-gray-900">
    <section class="mx-auto max-w-lg rounded-xl border bg-white p-5">
      <h1 class="mb-4 text-lg font-semibold">Fresh launch — implementation preview</h1>
      <div class="mb-5 flex gap-3">
        <button id="show-agent" @click="kind = 'agent'">Agent</button>
        <button id="show-team" @click="kind = 'team'">Team</button>
        <button id="fresh" @click="reset">Fresh template</button>
      </div>
      <AgentRunConfigForm v-if="kind === 'agent'" :config="agent.config"
        :agent-definition="agentDefinition" :workspace-loading-state="agent.workspaceLoadingState"
        :workspace-selection="selection" @update:workspace-selection="selection = $event" />
      <TeamRunConfigForm v-else :model="teamModel" @edit-config="team.applyConfigEdit"
        @update:workspace-selection="(_, value) => selection = value" />
    </section>
  </main>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import AgentRunConfigForm from '~/components/workspace/config/AgentRunConfigForm.vue'
import TeamRunConfigForm from '~/components/workspace/config/TeamRunConfigForm.vue'
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore'
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useRuntimeAvailabilityStore } from '~/stores/runtimeAvailabilityStore'
import { useLLMProviderConfigStore } from '~/stores/llmProviderConfig'
import { projectEditableTeamRunFormModel } from '~/utils/editableTeamRunFormModel'
definePageMeta({ layout: false })
const runtime = useRuntimeAvailabilityStore()
runtime.hasFetched = true
runtime.availabilities = ['autobyteus', 'codex_app_server', 'antigravity_cli'].map(runtimeKind => ({ runtimeKind, enabled: true, reason: null }))
// Deterministic renderer dependencies only; launch/payload validation is downstream.
const llm = useLLMProviderConfigStore()
for (const runtimeKind of ['autobyteus', 'codex_app_server', 'antigravity_cli']) {
  llm.catalogByRuntimeKind[runtimeKind] = { runtimeKind, currentRequestId: 0, state: 'ready', hasSuccessfulPayload: true, providersById: {}, errorMessage: null }
}
const agentDefinition = { id: 'preview-agent', name: 'Preview Agent' }
const teamDefinition = { id: 'preview-team', name: 'Preview Team', description: '', instructions: '', coordinatorMemberName: 'lead', nodes: [{ memberName: 'lead', ref: 'preview-agent' }] }
const agent = useAgentRunConfigStore()
const team = useTeamRunConfigStore()
useAgentTeamDefinitionStore().agentTeamDefinitions = [teamDefinition]
const selection = ref({ mode: 'new' as const, existingWorkspaceId: null, newWorkspacePath: '' })
const kind = ref('agent')
const reset = () => { agent.setTemplate(agentDefinition as any); team.setTemplate(teamDefinition) }
reset()
const teamModel = computed(() => projectEditableTeamRunFormModel({
  config: team.config!, teamDefinition, getTeamDefinitionById: () => teamDefinition,
  repairAddresses: [], workspaceOperationFor: () => ({ status: 'idle', error: null }),
  workspaceSelectionFor: () => selection.value, runtimeCatalogStateFor: () => ({ status: 'idle', error: null }),
}))
</script>
