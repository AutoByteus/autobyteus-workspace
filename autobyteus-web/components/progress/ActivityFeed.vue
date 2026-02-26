<template>
  <div class="h-full flex flex-col bg-white overflow-hidden">
    <!-- Header -->
    <div 
      class="px-3 py-2 bg-white border-b border-gray-200 flex justify-between items-center flex-shrink-0 cursor-pointer hover:bg-gray-50 transition-colors select-none"
      @click="$emit('toggle')"
    >
      <div class="flex items-center gap-2">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          stroke-width="2" 
          stroke-linecap="round" 
          stroke-linejoin="round"
          class="text-gray-500 transition-transform duration-300 transform"
          :class="collapsed ? '-rotate-90' : ''"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
        <h3 class="text-xs font-bold text-gray-900 tracking-wider leading-none">Activity</h3>
      </div>
      <span class="text-xs text-gray-600 font-medium">{{ activities.length }} Events</span>
    </div>

    <!-- Feed -->
    <div v-show="!collapsed" ref="feedContainer" class="flex-1 overflow-y-auto custom-scrollbar">
      <div v-if="activities.length === 0" class="p-8 text-center text-gray-700 text-sm">
        No activity history yet.
      </div>
      
      <div v-else>
        <ActivityItem 
          v-for="(activity, index) in activities" 
          :key="activity.invocationId || `activity-${index}`" 
          :activity="activity"
          :isHighlighted="activity.invocationId === highlightedId"
          :ref="(el) => setItemRef(activity.invocationId, el)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import { useActiveContextStore } from '~/stores/activeContextStore';
import ActivityItem from './ActivityItem.vue';

const props = defineProps<{
  collapsed?: boolean;
}>();

defineEmits<{
  (e: 'toggle'): void;
}>();

const activityStore = useAgentActivityStore();
const activeContext = useActiveContextStore();

const currentAgentId = computed(() => activeContext.activeAgentContext?.state.agentId ?? '');

const activities = computed(() => {
  if (!currentAgentId.value) return [];
  // Return reversed copy if we want newest up top? Or standard log order?
  // Standard log order (append bottom) is usually better for "Feed".
  return activityStore.getActivities(currentAgentId.value);
});

// Highlighting / Scrolling
const feedContainer = ref<HTMLElement | null>(null);
const itemRefs = ref<Record<string, any>>({});

const setItemRef = (id: string, el: any) => {
  if (!id) return;
  if (el) itemRefs.value[id] = el;
};

// Scroll to bottom on new activity
watch(() => activities.value.length, () => {
  nextTick(() => {
    if (feedContainer.value) {
      feedContainer.value.scrollTop = feedContainer.value.scrollHeight;
    }
  });
});

// Scroll to highlighted
const highlightedId = computed(() => 
  currentAgentId.value ? activityStore.getHighlightedActivityId(currentAgentId.value) : null
);

watch(highlightedId, (newId) => {
  if (newId) {
    nextTick(() => {
      const refEntry = itemRefs.value[newId];
      if (refEntry) {
        // Determine strict Vue component or DOM element
        const el = refEntry.$el || refEntry; 
        if (el && typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    });
  }
});
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
