<template>
  <div class="h-full flex flex-col bg-white overflow-hidden">
    <!-- Top Section: To-Do List (Goals) -->
    <div 
      class="flex flex-col transition-all duration-300 ease-in-out border-b border-gray-200"
      :class="[ expandedSection === 'todo' ? 'flex-1 min-h-0' : 'flex-none' ]"
    >
      <TodoListPanel 
        :todos="todos" 
        :collapsed="expandedSection !== 'todo'"
        @toggle="toggleSection('todo')"
        class="h-full" 
      />
    </div>

    <!-- Bottom Section: Activity Feed (Actions) -->
    <div 
      class="flex flex-col transition-all duration-300 ease-in-out"
      :class="[ expandedSection === 'activity' ? 'flex-1 min-h-0' : 'flex-none' ]"
    >
      <ActivityFeed 
        :collapsed="expandedSection !== 'activity'"
        @toggle="toggleSection('activity')"
        class="h-full"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAgentTodoStore } from '~/stores/agentTodoStore';
import { useActiveContextStore } from '~/stores/activeContextStore';
import type { ToDo } from '~/types/todo';
import TodoListPanel from '~/components/workspace/agent/TodoListPanel.vue';
import ActivityFeed from '~/components/progress/ActivityFeed.vue';

const todoStore = useAgentTodoStore();
const activeContextStore = useActiveContextStore();

const currentAgentId = computed(() => activeContextStore.activeAgentContext?.state.agentId ?? '');

const todos = computed(() => {
  if (!currentAgentId.value) return [];
  return todoStore.getTodos(currentAgentId.value);
});

const expandedSection = ref<'todo' | 'activity' | null>('activity');

const toggleSection = (section: 'todo' | 'activity') => {
  if (expandedSection.value === section) {
    expandedSection.value = null;
  } else {
    expandedSection.value = section;
  }
};
</script>

<style scoped>
/* No specific scrollbar styles needed here as they are inside the panels */
</style>
