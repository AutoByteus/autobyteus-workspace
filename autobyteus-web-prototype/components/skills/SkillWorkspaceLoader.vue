<template>
  <div v-if="error" class="text-red-500 p-4">
    Error loading skill workspace: {{ error }}
  </div>
  <div v-else-if="isLoading" class="flex items-center justify-center p-8 text-gray-400">
    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mr-2"></div>
    Loading workspace for {{ skillId }}...
  </div>
  <div v-else class="flex flex-col flex-1 min-h-0 overflow-hidden">
    <slot :workspaceId="workspaceId"></slot>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { useWorkspaceStore } from '~/stores/workspace';

const props = defineProps<{
  skillId: string;
}>();

const workspaceStore = useWorkspaceStore();
const isLoading = ref(true);
const error = ref<string | null>(null);
const workspaceId = ref<string>('');

const register = async () => {
  if (!props.skillId) return;
  isLoading.value = true;
  error.value = null;
  try {
    // Register the transient workspace.
    // The action returns the workspaceId (e.g. "skill:my_skill")
    const id = await workspaceStore.registerSkillWorkspace(props.skillId);
    workspaceId.value = id;
  } catch (e: any) {
    console.error('Failed to register skill workspace:', e);
    error.value = e.message || 'Unknown error';
  } finally {
    isLoading.value = false;
  }
};

const unregister = async () => {
  if (workspaceId.value) {
    try {
      await workspaceStore.unregisterSkillWorkspace(workspaceId.value);
      workspaceId.value = '';
    } catch (e) {
      console.error('Error unregistering skill workspace:', e);
    }
  }
};

onMounted(() => {
  register();
});

onBeforeUnmount(() => {
  unregister();
});

watch(() => props.skillId, async (newId, oldId) => {
  if (newId !== oldId) {
    await unregister();
    await register();
  }
});
</script>
