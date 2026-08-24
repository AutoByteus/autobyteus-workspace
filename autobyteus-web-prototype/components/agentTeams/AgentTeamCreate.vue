<template>
  <div class="h-full flex-1 overflow-auto bg-slate-50">
    <div class="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      <div class="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 class="text-4xl font-semibold text-slate-900">{{ $t('agentTeams.components.agentTeams.AgentTeamCreate.create_agent_team') }}</h1>
          <p class="mt-1 text-lg text-slate-600">{{ $t('agentTeams.components.agentTeams.AgentTeamCreate.drag_from_library_to_canvas_then') }}</p>
        </div>
        <button
          type="button"
          class="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >{{ $t('agentTeams.components.agentTeams.AgentTeamCreate.use_template') }}</button>
      </div>

      <AgentTeamDefinitionForm
        :is-submitting="isSubmitting"
        :submit-button-text="$t('agentTeams.components.agentTeams.AgentTeamCreate.submitButton')"
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
import { useLocalization } from '~/composables/useLocalization';
import { useAgentTeamDefinitionStore, type CreateAgentTeamDefinitionInput } from '~/stores/agentTeamDefinitionStore';
import AgentTeamDefinitionForm from '~/components/agentTeams/AgentTeamDefinitionForm.vue';

const emit = defineEmits(['navigate']);

const store = useAgentTeamDefinitionStore();
const { t: $t } = useLocalization();

const isSubmitting = ref(false);
const notification = ref<{ type: 'success' | 'error'; message: string } | null>(null);

const handleCreate = async (formData: CreateAgentTeamDefinitionInput) => {
  isSubmitting.value = true;
  notification.value = null;

  try {
    const newTeam = await store.createAgentTeamDefinition(formData);
    if (newTeam) {
      showNotification($t('agentTeams.components.agentTeams.AgentTeamCreate.createdSuccess'), 'success');
      setTimeout(() => {
        emit('navigate', { view: 'team-detail', id: newTeam.id });
      }, 1200);
    } else {
      throw new Error($t('agentTeams.components.agentTeams.AgentTeamCreate.createFailedEmpty'));
    }
  } catch (error: any) {
    console.error('Failed to create agent team:', error);
    showNotification(error.message || $t('agentTeams.components.agentTeams.AgentTeamCreate.unexpectedError'), 'error');
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
