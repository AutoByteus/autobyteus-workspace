<template>
  <div class="h-full">
    <AgentEventMonitor
      v-if="conversationOfFocusedMember"
      :conversation="conversationOfFocusedMember"
      :agent-name="focusedMemberDisplayName"
      :agent-avatar-url="focusedMemberAvatarUrl"
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
import { useTeamMemberPresentation } from '~/composables/useTeamMemberPresentation';
import AgentEventMonitor from '~/components/workspace/agent/AgentEventMonitor.vue';

const teamContextsStore = useAgentTeamContextsStore();
const { getInterAgentSenderNameById, getMemberAvatarUrl, getMemberDisplayName } = useTeamMemberPresentation();

const activeTeam = computed(() => teamContextsStore.activeTeamContext);
const focusedMember = computed(() => teamContextsStore.focusedMemberContext);
const conversationOfFocusedMember = computed(() => focusedMember.value?.state.conversation);

const focusedMemberDisplayName = computed(() => {
  const team = activeTeam.value;
  if (!team?.focusedMemberName) {
    return '';
  }
  return getMemberDisplayName(team.focusedMemberName, focusedMember.value);
});

const focusedMemberAvatarUrl = computed(() => {
  const team = activeTeam.value;
  if (!team?.focusedMemberName || !focusedMember.value) {
    return null;
  }
  return getMemberAvatarUrl(team.focusedMemberName, focusedMember.value) || null;
});

const interAgentSenderNameById = computed<Record<string, string>>(() => {
  return getInterAgentSenderNameById(activeTeam.value);
});
</script>
