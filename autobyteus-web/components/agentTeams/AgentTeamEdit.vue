<template>
  <div class="h-full flex-1 overflow-auto bg-slate-50">
    <div class="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <div v-if="teamDef">
        <div class="mb-6">
          <h1 class="text-4xl font-semibold text-slate-900">Edit Agent Team</h1>
          <p class="mt-1 text-lg text-slate-600">Update details for "{{ teamDef.name }}".</p>
        </div>

        <AgentTeamDefinitionForm
          :initial-data="initialFormData"
          :is-submitting="isSubmitting"
          submit-button-text="Save Changes"
          @submit="handleUpdate"
          @cancel="handleCancel"
        />
      </div>
      <div v-else-if="loading" class="rounded-lg border border-slate-200 bg-white py-16 text-center shadow-sm">
        <div class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
        <p class="text-slate-600">Loading agent team definition...</p>
      </div>
      <div v-else class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        <p class="font-bold">Error:</p>
        <p>Agent team definition not found.</p>
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
import { useAgentTeamDefinitionStore, type UpdateAgentTeamDefinitionInput } from '~/stores/agentTeamDefinitionStore';
import AgentTeamDefinitionForm from '~/components/agentTeams/AgentTeamDefinitionForm.vue';

const props = defineProps<{ teamId: string }>();
const { teamId } = toRefs(props);

const emit = defineEmits(['navigate']);

const store = useAgentTeamDefinitionStore();

const teamDef = computed(() => store.getAgentTeamDefinitionById(teamId.value));
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
    id: teamId.value,
    ...formData,
  };

  try {
    const updatedTeam = await store.updateAgentTeamDefinition(updateInput);
    if (updatedTeam) {
      showNotification('Agent team definition updated successfully!', 'success');
      setTimeout(() => {
        emit('navigate', { view: 'team-detail', id: updatedTeam.id });
      }, 1200);
    } else {
      throw new Error('Failed to update agent team definition. The result was empty.');
    }
  } catch (error: any) {
    console.error('Failed to update agent team definition:', error);
    showNotification(error.message || 'An unexpected error occurred.', 'error');
  } finally {
    isSubmitting.value = false;
  }
};

const handleCancel = () => {
  emit('navigate', { view: 'team-detail', id: props.teamId });
};

const showNotification = (message: string, type: 'success' | 'error') => {
  notification.value = { message, type };
  setTimeout(() => {
    notification.value = null;
  }, 3000);
};
</script>
