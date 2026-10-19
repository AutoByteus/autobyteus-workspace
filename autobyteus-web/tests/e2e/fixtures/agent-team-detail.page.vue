<template>
  <main class="h-screen" data-test="agent-team-detail-probe">
    <AgentTeamDetail :team-definition-id="selectedTeam" @navigate="navigation = $event" />
    <output hidden data-test="probe-navigation">{{ JSON.stringify(navigation) }}</output>
  </main>
</template>
<script setup lang="ts">
// Renderer-only fixture: production component/children, deterministic catalog, no runtime turns.
import { computed, ref } from 'vue'
import AgentTeamDetail from '~/components/agentTeams/AgentTeamDetail.vue'
import { useAgentTeamDefinitionStore, type AgentTeamDefinition } from '~/stores/agentTeamDefinitionStore'
import { useAgentDefinitionStore, type AgentDefinition } from '~/stores/agentDefinitionStore'
import { buildTeamLocalAgentDefinitionId } from '~/utils/teamLocalDefinitionId'
definePageMeta({ layout: false })
const route = useRoute()
const selectedTeam = computed(() => String(route.query.team || 'probe-team'))
const navigation = ref({})
const names = ['coordinator', 'architect', 'implementer', 'reviewer', 'validator', 'delivery']
const team: AgentTeamDefinition = {
  id: 'probe-team', name: 'Engineering Team', description: 'Inspect members before reading long instructions and handoff rules.',
  instructions: Array.from({ length: 34 }, (_, i) => `Instruction ${i + 1}: preserve approved requirements and ownership boundaries.`).join('\n'),
  category: 'engineering', coordinatorMemberName: names[0]!, ownershipScope: 'SHARED',
  nodes: names.map((memberName, i) => ({ memberName, ref: i === 2 ? 'local-worker' : `probe-agent-${i}`, refScope: i === 2 ? 'TEAM_LOCAL' : 'SHARED' })),
  handoffs: Array.from({ length: 8 }, (_, i) => ({
    from: `/${names[i % names.length]}`, to: `/${names[(i + 1) % names.length]}`,
    rules: [`Handoff ${i + 1}: when this stage completes, pass the cumulative package.`, 'Preserve evidence and route findings to the accountable owner.'],
  })),
}
const researchTeam: AgentTeamDefinition = { ...team, id: 'probe-research', name: 'Research Team', ownershipScope: 'APPLICATION_OWNED', handoffs: [] }
useAgentTeamDefinitionStore().agentTeamDefinitions = [team, researchTeam]
const agent = (id: string, name: string, ownerTeamId?: string): AgentDefinition => ({
  id, name, description: 'Probe member', role: 'Probe', instructions: 'Probe instructions',
  toolNames: [], inputProcessorNames: [], llmResponseProcessorNames: [], toolExecutionResultProcessorNames: [],
  toolInvocationPreprocessorNames: [], lifecycleProcessorNames: [], skillNames: [], skillScope: 'CONFIGURED',
  ownershipScope: ownerTeamId ? 'TEAM_LOCAL' : 'SHARED', ownerTeamId,
})
useAgentDefinitionStore().agentDefinitions = [
  ...names.filter((_, i) => i !== 2).map(name => agent(`probe-agent-${names.indexOf(name)}`, name)),
  agent(buildTeamLocalAgentDefinitionId(team.id, 'local-worker'), 'Team-local Worker', team.id),
  agent(buildTeamLocalAgentDefinitionId(researchTeam.id, 'local-worker'), 'Team-local Worker', researchTeam.id),
]
</script>
