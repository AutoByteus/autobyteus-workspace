<template>
  <main class="p-6 bg-gray-100 min-h-screen">
    <h1 class="text-xl font-bold">Activity retention — isolated implementation fixture</h1>
    <p>Real Team stop owner, context and ActivityFeed. Stubbed external command; no backend or provider.</p>
    <div v-if="team" class="my-4 flex gap-4 items-center">
      <button class="bg-blue-700 text-white rounded px-4 py-2" @click="stop">Stop Team</button>
      <button class="border px-4 py-2" @click="team.view.focusAgent('lead')">Lead</button>
      <button class="border px-4 py-2" @click="team.view.focusAgent('empty')">Empty member</button>
      <span>{{ team.view.getFocusedAgentContext()?.state.currentStatus }} · {{ commands }} stop command(s)</span>
    </div>
    <div v-if="team" class="max-w-xl h-[600px] border rounded"><ActivityFeed /></div>
  </main>
</template>
<script setup lang="ts">
import { ref, shallowRef, onMounted } from 'vue'
import ActivityFeed from '~/components/progress/ActivityFeed.vue'
import { buildTestTeamContext, testAgentNode } from '~/test-support/currentTeamTestFixtures'
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore'
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'
import { useAgentActivityStore } from '~/stores/agentActivityStore'
import { BOUND_APOLLO_CLIENT_KEY } from '~/plugins/30.apollo.client'
definePageMeta({ layout: false })
const commands = ref(0), team = shallowRef<ReturnType<typeof buildTestTeamContext>>()
const app = useNuxtApp(), contexts = useAgentTeamContextsStore(), runs = useAgentTeamRunStore(), selection = useAgentSelectionStore(), activity = useAgentActivityStore()
onMounted(() => {
  ;(app as any)[BOUND_APOLLO_CLIENT_KEY] = { query: async () => ({ data: {} }), mutate: async () => { commands.value++; return { data: { terminateAgentTeamRun: { success: true } } } } }
  contexts.teams = new Map([['retention-preview', buildTestTeamContext({ teamRunId: 'retention-preview', coordinatorAddress: '/lead', focusedAgentRunId: 'lead', rootChildren: ['lead', 'empty'].map(id => testAgentNode(`/${id}`, { agentRunId: id })) })]])
  team.value = contexts.getTeamContextById('retention-preview')!
  selection.selectRun('retention-preview', 'team')
  activity.upsertSystemInstructionActivity('lead', { kind: 'system_instruction', activityId: 'system', content: 'Preserve the inspected conversation and completed work after Stop.', timestamp: new Date() })
  activity.addToolActivity('lead', { kind: 'tool', activityId: 'tool', invocationId: 'message-completed', toolName: 'send_message_to', type: 'tool_call', status: 'success', contextText: '', arguments: { recipient: '/worker', message: 'Review complete' }, logs: [], result: 'Delivered to worker', error: null, timestamp: new Date() })
})
const stop = () => runs.terminateTeamRun('retention-preview')
</script>
