<template>
  <div class="p-8">
    <div class="max-w-6xl mx-auto">
      <div v-if="agentDef">
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900">Edit Agent Definition</h1>
          <p class="text-lg text-gray-500 mt-2">Update the details for "{{ agentDef.name }}".</p>
        </div>

        <AgentDefinitionForm
          :initial-data="agentDef"
          :is-submitting="isSubmitting"
          submit-button-text="Save Changes"
          :is-create-mode="false"
          @submit="handleUpdate"
          @cancel="handleCancel"
        />
      </div>
       <div v-else-if="loading" class="text-center py-10">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-4"></div>
        <p>Loading agent definition...</p>
      </div>
      <div v-else class="bg-red-50 border border-red-200 text-red-700 rounded-md p-4">
        <p class="font-bold">Error:</p>
        <p>Agent definition not found.</p>
      </div>

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
import { ref, computed, onMounted, toRefs } from 'vue';
import { useAgentDefinitionStore, type UpdateAgentDefinitionInput } from '~/stores/agentDefinitionStore';
import AgentDefinitionForm from '~/components/agents/AgentDefinitionForm.vue';

const props = defineProps<{ agentId: string }>();
const { agentId } = toRefs(props);

const emit = defineEmits(['navigate']);

const agentDefinitionStore = useAgentDefinitionStore();
const agentDef = computed(() => agentDefinitionStore.getAgentDefinitionById(agentId.value));
const loading = ref(false);
const isSubmitting = ref(false);
const notification = ref<{ type: 'success' | 'error'; message: string } | null>(null);

onMounted(async () => {
  if (agentDefinitionStore.agentDefinitions.length === 0) {
    loading.value = true;
    await agentDefinitionStore.fetchAllAgentDefinitions();
    loading.value = false;
  }
});

const handleUpdate = async (formData: any) => {
  isSubmitting.value = true;
  notification.value = null;

  const updateInput: UpdateAgentDefinitionInput = {
    id: agentId.value,
    ...formData,
  };

  try {
    const updatedAgent = await agentDefinitionStore.updateAgentDefinition(updateInput);
    if (updatedAgent) {
      showNotification('Agent definition updated successfully!', 'success');
      setTimeout(() => {
        emit('navigate', { view: 'detail', id: updatedAgent.id });
      }, 1500);
    } else {
      throw new Error('Failed to update agent definition. The result was empty.');
    }
  } catch (error: any) {
    console.error('Failed to update agent definition:', error);
    showNotification(error.message || 'An unexpected error occurred.', 'error');
  } finally {
    isSubmitting.value = false;
  }
};

const handleCancel = () => {
  emit('navigate', { view: 'detail', id: props.agentId });
};

const showNotification = (message: string, type: 'success' | 'error') => {
  notification.value = { message, type };
  setTimeout(() => {
    notification.value = null;
  }, 3000);
};
</script>
