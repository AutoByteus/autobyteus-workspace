<template>
  <div class="p-8">
    <div class="max-w-6xl mx-auto">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Create Agent Definition</h1>
        <p class="text-lg text-gray-500 mt-2">Define a new agent by providing its core attributes and components.</p>
      </div>

      <AgentDefinitionForm
        :is-submitting="isSubmitting"
        submit-button-text="Create Agent"
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
import { useAgentDefinitionStore, type CreateAgentDefinitionInput } from '~/stores/agentDefinitionStore';
import AgentDefinitionForm from '~/components/agents/AgentDefinitionForm.vue';

const emit = defineEmits(['navigate']);

const agentDefinitionStore = useAgentDefinitionStore();
const isSubmitting = ref(false);
const notification = ref<{ type: 'success' | 'error'; message: string } | null>(null);

const handleCreate = async (formData: CreateAgentDefinitionInput) => {
  isSubmitting.value = true;
  notification.value = null;

  try {
    const newAgent = await agentDefinitionStore.createAgentDefinition(formData);
    if (newAgent) {
      showNotification('Agent definition created successfully!', 'success');
      setTimeout(() => {
        emit('navigate', { view: 'detail', id: newAgent.id });
      }, 1500);
    } else {
      throw new Error('Failed to create agent definition. The result was empty.');
    }
  } catch (error: any) {
    console.error('Failed to create agent definition:', error);
    showNotification(error.message || 'An unexpected error occurred.', 'error');
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
