<template>
  <div class="h-full flex-1 overflow-auto bg-slate-50">
    <div class="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <div v-if="teamDef">
        <div class="mb-6">
          <h1 class="text-4xl font-semibold text-slate-900">{{ $t('agentTeams.components.agentTeams.AgentTeamEdit.edit_agent_team') }}</h1>
          <p class="mt-1 text-lg text-slate-600">{{ $t('agentTeams.components.agentTeams.AgentTeamEdit.updateDetails', { name: teamDef.name }) }}</p>
        </div>

        <AgentTeamDefinitionForm
          :initial-data="initialFormData"
          :is-submitting="isSubmitting"
          :submit-button-text="$t('agentTeams.components.agentTeams.AgentTeamEdit.submitButton')"
          @submit="handleUpdate"
          @cancel="handleCancel"
        />
      </div>
      <div v-else-if="loading" class="rounded-lg border border-slate-200 bg-white py-16 text-center shadow-sm">
        <div class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
        <p class="text-slate-600">{{ $t('agentTeams.components.agentTeams.AgentTeamEdit.loading_agent_team_definition') }}</p>
      </div>
      <div v-else class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        <p class="font-bold">{{ $t('agentTeams.components.agentTeams.AgentTeamEdit.error') }}</p>
        <p>{{ $t('agentTeams.components.agentTeams.AgentTeamEdit.agent_team_definition_not_found') }}</p>
      </div>

      <div
        v-if="notification"
        :class="[
          'fixed bottom-5 right-5 z-50 rounded-lg p-4 text-white shadow-lg',
          notification.type === 'success' ? 'bg-green-500' : 'bg-red-500',
        ]"
      >
        {{ notification.message }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, toRefs } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import { useAgentTeamDefinitionStore, type UpdateAgentTeamDefinitionInput } from '~/stores/agentTeamDefinitionStore';
import AgentTeamDefinitionForm from '~/components/agentTeams/AgentTeamDefinitionForm.vue';

const props = defineProps<{ teamDefinitionId: string }>();
const { teamDefinitionId } = toRefs(props);

const emit = defineEmits(['navigate']);

const store = useAgentTeamDefinitionStore();
const { t: $t } = useLocalization();

const teamDef = computed(() => store.getAgentTeamDefinitionById(teamDefinitionId.value));
const initialFormData = computed(() => {
  if (!teamDef.value) {
    return null;
  }
  return {
    ...teamDef.value,
    avatarUrl: teamDef.value.avatarUrl || '',
  };
});

const loading = ref(false);
const isSubmitting = ref(false);
const notification = ref<{ type: 'success' | 'error'; message: string } | null>(null);

onMounted(async () => {
  if (store.agentTeamDefinitions.length === 0) {
    loading.value = true;
    await store.fetchAllAgentTeamDefinitions();
    loading.value = false;
  }
});

const handleUpdate = async (formData: UpdateAgentTeamDefinitionInput) => {
  isSubmitting.value = true;
  notification.value = null;

  const updateInput: UpdateAgentTeamDefinitionInput = {
    id: teamDefinitionId.value,
    ...formData,
  };

  try {
    const updatedTeam = await store.updateAgentTeamDefinition(updateInput);
    if (updatedTeam) {
      showNotification($t('agentTeams.components.agentTeams.AgentTeamEdit.updatedSuccess'), 'success');
      setTimeout(() => {
        emit('navigate', { view: 'team-detail', id: updatedTeam.id });
      }, 1200);
    } else {
      throw new Error($t('agentTeams.components.agentTeams.AgentTeamEdit.updateFailedEmpty'));
    }
  } catch (error: any) {
    console.error('Failed to update agent team definition:', error);
    showNotification(error.message || $t('agentTeams.components.agentTeams.AgentTeamEdit.unexpectedError'), 'error');
  } finally {
    isSubmitting.value = false;
  }
};

const handleCancel = () => {
  emit('navigate', { view: 'team-detail', id: props.teamDefinitionId });
};

const showNotification = (message: string, type: 'success' | 'error') => {
  notification.value = { message, type };
  setTimeout(() => {
    notification.value = null;
  }, 3000);
};
</script>
