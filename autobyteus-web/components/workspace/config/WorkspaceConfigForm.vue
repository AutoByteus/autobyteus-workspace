<template>
  <div class="space-y-4">
    <div>
      <label for="root-path" class="block text-sm font-medium text-gray-700">{{ $t('workspace.components.workspace.config.WorkspaceConfigForm.root_path') }}<span class="text-red-500">*</span>
      </label>
      <input
        id="root-path"
        type="text"
        :placeholder="$t('workspace.components.workspace.config.WorkspaceConfigForm.home_user_projects_my_project')"
        v-model="localConfig.root_path"
        required
        @input="emitUpdate"
        class="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
      />
      <p class="text-xs text-gray-500 mt-1">{{ $t('workspace.components.workspace.config.WorkspaceConfigForm.the_absolute_path_to_the_directory') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue';
import type { WorkspaceLaunchConfig } from '~/types/TeamLaunchProfile';

type NewWorkspaceConfig = NonNullable<WorkspaceLaunchConfig['newWorkspaceConfig']>;

const props = defineProps<{
  modelValue: NewWorkspaceConfig;
}>();

const emit = defineEmits(['update:modelValue']);

const localConfig = reactive<NewWorkspaceConfig>({ 
    root_path: props.modelValue?.root_path || '' 
});

const emitUpdate = () => {
  emit('update:modelValue', { ...localConfig });
};

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
      Object.assign(localConfig, newVal);
  }
}, { deep: true });
</script>
