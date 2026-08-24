<template>
  <div class="p-8">
    <div class="max-w-6xl mx-auto">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">{{ $t('agents.components.agents.AgentCreate.create_agent_definition') }}</h1>
        <p class="text-lg text-gray-500 mt-2">{{ $t('agents.components.agents.AgentCreate.define_a_new_agent_by_providing') }}</p>
      </div>

      <AgentDefinitionForm
        :is-submitting="isSubmitting"
        :submit-button-text="$t('agents.components.agents.AgentCreate.submitButton')"
        :is-create-mode="true"
        @submit="handleCreate"
        @cancel="handleCancel"
      />

      <div v-if="notification"
           :class="[
             'fixed bottom-5 right-5 p-4 rounded-lg shadow-lg text-white',
             notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
           ]">
        {{ notification.message }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useLocalization } from '~/composables/useLocalization';
import { useAgentDefinitionStore, type CreateAgentDefinitionInput } from '~/stores/agentDefinitionStore';
import AgentDefinitionForm from '~/components/agents/AgentDefinitionForm.vue';

const emit = defineEmits(['navigate']);

const agentDefinitionStore = useAgentDefinitionStore();
const { t: $t } = useLocalization();
const isSubmitting = ref(false);
const notification = ref<{ type: 'success' | 'error'; message: string } | null>(null);

const handleCreate = async (formData: CreateAgentDefinitionInput) => {
  isSubmitting.value = true;
  notification.value = null;

  try {
    const newAgent = await agentDefinitionStore.createAgentDefinition(formData);
    if (newAgent) {
      showNotification($t('agents.components.agents.AgentCreate.createdSuccess'), 'success');
      setTimeout(() => {
        emit('navigate', { view: 'detail', id: newAgent.id });
      }, 1500);
    } else {
      throw new Error($t('agents.components.agents.AgentCreate.createFailedEmpty'));
    }
  } catch (error: any) {
    console.error('Failed to create agent definition:', error);
    showNotification(error.message || $t('agents.components.agents.AgentCreate.unexpectedError'), 'error');
  } finally {
    isSubmitting.value = false;
  }
};

const handleCancel = () => {
  emit('navigate', { view: 'list' });
};

const showNotification = (message: string, type: 'success' | 'error') => {
  notification.value = { message, type };
  setTimeout(() => {
    notification.value = null;
  }, 3000);
};
</script>
