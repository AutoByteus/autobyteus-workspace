<template>
  <main class="h-screen" data-test="implementation-preview">
    <AgentTeamDetail :team-definition-id="selectedTeam" @navigate="navigation = $event" />
    <output hidden data-test="preview-navigation">{{ JSON.stringify(navigation) }}</output>
  </main>
</template>
<script setup lang="ts">
// Temporary implementation preview: product component/children, test-owned catalog.
// This is not an API/E2E suite or a real backend/full desktop journey.
import { computed, ref } from 'vue'
import AgentTeamDetail from '~/components/agentTeams/AgentTeamDetail.vue'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import { useAgentDefinitionStore, type AgentDefinition } from '~/stores/agentDefinitionStore'
definePageMeta({ layout: false })
const route = useRoute()
const selectedTeam = computed(() => String(route.query.team || 'preview-team'))
const navigation = ref({})
const names = ['solution_designer', 'architecture_reviewer', 'implementation_engineer', 'code_reviewer', 'api_e2e_engineer', 'delivery_engineer']
const nodes = names.map((memberName, index) => ({ memberName, ref: index === 2 ? 'implementer' : 'preview-agent-' + index, refScope: index === 2 ? 'TEAM_LOCAL' as const : 'SHARED' as const }))
const team = {
  id: 'preview-team', name: 'Software Engineering Team',
  description: 'A coordinator-led team that investigates requests, designs, implements, reviews, validates and delivers the solution.',
  instructions: Array.from({ length: 34 }, (_, index) => 'Instruction ' + (index + 1) + ': preserve approved requirements and ownership boundaries.').join('\n'),
  category: 'software-engineering', coordinatorMemberName: 'solution_designer',
  ownershipScope: 'SHARED' as const, nodes,
  handoffs: Array.from({ length: 8 }, (_, index) => ({
    from: '/' + names[index % names.length], to: '/' + names[(index + 1) % names.length],
    rules: ['Handoff ' + (index + 1) + ': when the current stage completes, pass the cumulative package.', 'Preserve evidence and route findings to the accountable owner.'],
  })),
}
useAgentTeamDefinitionStore().agentTeamDefinitions = [
  team, { ...team, id: 'preview-research', name: 'Research Team', ownershipScope: 'APPLICATION_OWNED', handoffs: [] },
]
useAgentDefinitionStore().agentDefinitions = names.flatMap((name, index) => [
  { id: index === 2 ? 'team-local-agent:preview-team:implementer' : 'preview-agent-' + index, name: name.replaceAll('_', ' '), description: 'Preview member', role: 'Preview', instructions: 'Preview' } as AgentDefinition,
  ...(index === 2 ? [{ id: 'team-local-agent:preview-research:implementer', name: 'implementation engineer', description: 'Preview member', role: 'Preview', instructions: 'Preview' } as AgentDefinition] : []),
])
</script>
