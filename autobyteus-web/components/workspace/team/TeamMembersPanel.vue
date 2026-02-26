<template>
  <div class="flex flex-col bg-gray-50 text-gray-800 h-full">
    <!-- Header -->
    <div class="p-4 flex-shrink-0 flex items-center justify-between">
      <div>
        <h3 class="text-base font-semibold text-gray-900">Team Members</h3>
        <p v-if="teamName" class="text-sm text-gray-500 truncate" :title="teamName">{{ teamName }}</p>
      </div>
      <button
        @click="promptTerminateTeam"
        :disabled="isTeamRunTemporary"
        class="px-4 py-2 bg-red-100 text-red-700 font-semibold text-sm rounded-md border border-red-200 shadow-sm hover:bg-red-600 hover:text-white hover:border-red-600 hover:shadow transform transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Terminate Team"
      >
        Terminate
      </button>
    </div>

    <!-- Member List -->
    <div class="flex-1 overflow-y-auto p-2 space-y-1">
      <div v-if="teamMembers.length === 0" class="text-center text-sm text-gray-500 pt-8">
        No active team members.
      </div>
      <div
        v-for="member in teamMembers"
        :key="member.memberName"
        @click="selectMember(member.memberName)"
        class="p-3 rounded-lg cursor-pointer transition-colors duration-150 border"
        :class="focusedMemberName === member.memberName
          ? 'bg-indigo-100 border-indigo-300 shadow-sm'
          : 'bg-white border-gray-200 hover:bg-gray-100 hover:border-gray-300'"
      >
        <div class="flex justify-between items-center">
          <p class="font-medium text-sm truncate" :title="member.memberName">{{ member.memberName }}</p>
          <span v-if="isCoordinator(member.memberName)" class="text-xs font-bold text-yellow-800 bg-yellow-200 px-2 py-0.5 rounded-full">
            Coord
          </span>
        </div>
        <div class="mt-2">
          <AgentStatusDisplay :status="member.context.state.currentStatus" />
        </div>
      </div>
    </div>
    
    <!-- Delete Confirmation Dialog -->
    <AgentDeleteConfirmDialog
      :show="showTerminateConfirm"
      :item-name="teamName"
      item-type="Team Run"
      title="Terminate Team Run"
      confirm-text="Terminate"
      @confirm="onTerminateConfirmed"
      @cancel="onTerminateCanceled"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore';
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore';
import AgentStatusDisplay from '~/components/workspace/agent/AgentStatusDisplay.vue';
import AgentDeleteConfirmDialog from '~/components/agents/AgentDeleteConfirmDialog.vue';

const teamContextsStore = useAgentTeamContextsStore();
const teamRunStore = useAgentTeamRunStore();
const teamDefinitionStore = useAgentTeamDefinitionStore();

const showTerminateConfirm = ref(false);

const teamMembers = computed(() => teamContextsStore.teamMembers);
const focusedMemberName = computed(() => teamContextsStore.activeTeamContext?.focusedMemberName);
const activeTeam = computed(() => teamContextsStore.activeTeamContext);
const teamName = computed(() => activeTeam.value?.config.teamDefinitionName || 'this team');
const coordinatorName = computed(() => {
  const teamDefId = activeTeam.value?.config.teamDefinitionId;
  if (!teamDefId) return null;
  return teamDefinitionStore.getAgentTeamDefinitionById(teamDefId)?.coordinatorMemberName || null;
});

onMounted(() => {
  if (teamDefinitionStore.agentTeamDefinitions.length === 0) {
    teamDefinitionStore.fetchAllAgentTeamDefinitions();
  }
});

const isTeamRunTemporary = computed(() => {
  return teamContextsStore.activeTeamContext?.teamRunId.startsWith('temp-') ?? false;
});

const isCoordinator = (memberName: string) => {
  return memberName === coordinatorName.value;
};

const selectMember = (memberName: string) => {
  teamContextsStore.setFocusedMember(memberName);
};

const promptTerminateTeam = () => {
  showTerminateConfirm.value = true;
};

const onTerminateConfirmed = () => {
  teamRunStore.terminateActiveTeam();
  showTerminateConfirm.value = false;
};

const onTerminateCanceled = () => {
  showTerminateConfirm.value = false;
};
</script>
