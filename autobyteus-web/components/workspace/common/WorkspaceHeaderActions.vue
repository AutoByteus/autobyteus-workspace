<template>
  <div class="flex items-center space-x-1">
    <button
      type="button"
      data-test="workspace-header-edit-config"
      @click="$emit('editConfig')"
      class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 tooltip transition-colors"
      :aria-label="$t('workspace.components.workspace.common.WorkspaceHeaderActions.edit_config')"
      data-tooltip="Edit Config"
    >
      <Icon icon="heroicons:cog-6-tooth" class="w-5 h-5" />
    </button>
    <button
      type="button"
      data-test="workspace-header-new-run"
      @click="$emit('newAgent')"
      class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-blue-500 tooltip transition-colors"
      :aria-label="$t('workspace.components.workspace.common.WorkspaceHeaderActions.new_agent')"
      data-tooltip="New Agent"
    >
      <Icon icon="heroicons:plus" class="w-5 h-5" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';

defineEmits(['newAgent', 'editConfig']);
</script>

<style scoped>
.tooltip {
  position: relative;
}

.tooltip:hover::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: -30px; 
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 8px;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 10;
}
</style>
