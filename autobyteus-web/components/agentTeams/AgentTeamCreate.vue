<template>
  <div class="h-full flex-1 overflow-auto bg-slate-50">
    <div class="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <div class="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 class="text-4xl font-semibold text-slate-900">Create Agent Team</h1>
          <p class="mt-1 text-lg text-slate-600">Drag from library to canvas, then assign a coordinator.</p>
        </div>
        <button
          type="button"
          class="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Use Template
        </button>
      </div>

      <AgentTeamDefinitionForm
        :is-submitting="isSubmitting"
        submit-button-text="Create Team"
        @submit="handleCreate"
        @cancel="handleCancel"
      />

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
import { ref } from 'vue';
import { useAgentTeamDefinitionStore, type CreateAgentTeamDefinitionInput } from '~/stores/agentTeamDefinitionStore';
import AgentTeamDefinitionForm from '~/components/agentTeams/AgentTeamDefinitionForm.vue';

const emit = defineEmits(['navigate']);

const store = useAgentTeamDefinitionStore();

const isSubmitting = ref(false);
const notification = ref<{ type: 'success' | 'error'; message: string } | null>(null);

const handleCreate = async (formData: CreateAgentTeamDefinitionInput) => {
  isSubmitting.value = true;
  notification.value = null;

  try {
    const newTeam = await store.createAgentTeamDefinition(formData);
    if (newTeam) {
      showNotification('Agent team created successfully!', 'success');
      setTimeout(() => {
        emit('navigate', { view: 'team-detail', id: newTeam.id });
      }, 1200);
    } else {
      throw new Error('Failed to create agent team. The result was empty.');
    }
  } catch (error: any) {
    console.error('Failed to create agent team:', error);
    showNotification(error.message || 'An unexpected error occurred.', 'error');
  } finally {
    isSubmitting.value = false;
  }
};

const handleCancel = () => {
  emit('navigate', { view: 'team-list' });
};

const showNotification = (message: string, type: 'success' | 'error') => {
  notification.value = { message, type };
  setTimeout(() => {
    notification.value = null;
  }, 3000);
};
</script>
