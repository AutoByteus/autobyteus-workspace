<template>
  <div class="h-full">
    <AgentEventMonitor
      v-if="conversationOfFocusedMember"
      :conversation="conversationOfFocusedMember"
      :inter-agent-sender-name-by-id="interAgentSenderNameById"
      class="h-full"
    />
    <div v-else class="p-8 text-center text-gray-500 h-full flex items-center justify-center">
      <div v-if="!activeTeam">
        <p>No active team session.</p>
      </div>
      <div v-else-if="!focusedMember">
         <p>Select a team member from the panel to view their activity.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import AgentEventMonitor from '~/components/workspace/agent/AgentEventMonitor.vue';

const teamContextsStore = useAgentTeamContextsStore();

const activeTeam = computed(() => teamContextsStore.activeTeamContext);
const focusedMember = computed(() => teamContextsStore.focusedMemberContext);
const conversationOfFocusedMember = computed(() => focusedMember.value?.state.conversation);

const formatMemberDisplayName = (memberRouteKey: string): string => {
  const routeLeaf = memberRouteKey
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .pop() || memberRouteKey;
  if (!routeLeaf) return 'Teammate';
  return `${routeLeaf.charAt(0).toUpperCase()}${routeLeaf.slice(1)}`;
};

const interAgentSenderNameById = computed<Record<string, string>>(() => {
  const team = activeTeam.value;
  if (!team) {
    return {};
  }

  const mapping: Record<string, string> = {};
  team.members.forEach((memberContext, memberRouteKey) => {
    const agentId = String(memberContext.state.agentId || '').trim();
    if (!agentId || mapping[agentId]) {
      return;
    }
    mapping[agentId] = formatMemberDisplayName(memberRouteKey);
  });
  return mapping;
});
</script>
