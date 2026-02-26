<template>
  <div class="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200 hover:shadow-md transition-shadow">
    <div class="p-5">
      <!-- Header with Icon, Name and Status -->
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center">
          <div class="bg-purple-100 p-2 rounded-md mr-3">
            <span 
              v-if="agent.icon" 
              :class="agent.icon + ' w-5 h-5 text-purple-600'"
            ></span>
            <span 
              v-else 
              class="i-heroicons-cpu-chip-20-solid w-5 h-5 text-purple-600"
            ></span>
          </div>
          <h3 class="font-medium text-gray-900 text-lg">{{ agent.name }}</h3>
        </div>
        
        <!-- Status Indicator -->
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <span class="w-2 h-2 bg-green-500 rounded-full mr-1.5"></span>
          Connected
        </span>
      </div>
      
      <!-- Description -->
      <p class="text-sm text-gray-600 mb-4">{{ agent.description }}</p>
      
      <!-- Server Info -->
      <div class="mb-4">
        <span class="text-xs font-medium text-gray-500 uppercase tracking-wide">Server</span>
        <div class="flex items-center mt-1">
          <span class="i-heroicons-server-20-solid w-4 h-4 text-gray-500 mr-1.5"></span>
          <p class="text-sm text-gray-800">{{ agent.serverName }}</p>
        </div>
      </div>
      
      <!-- Role -->
      <div class="mb-4" v-if="agent.role">
        <span class="text-xs font-medium text-gray-500 uppercase tracking-wide">Role</span>
        <p class="text-sm text-gray-800 mt-1">{{ agent.role }}</p>
      </div>
      
      <!-- Skills -->
      <div class="mb-4" v-if="agent.skills && agent.skills.length > 0">
        <span class="text-xs font-medium text-gray-500 uppercase tracking-wide">Capabilities</span>
        <div class="flex flex-wrap gap-2 mt-1">
          <span 
            v-for="skill in displayedSkills" 
            :key="skill" 
            class="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-full"
          >
            {{ skill }}
          </span>
          <span 
            v-if="agent.skills.length > maxItemsToShow" 
            class="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-full"
          >
            +{{ agent.skills.length - maxItemsToShow }} more
          </span>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-end items-center mt-4">
        <button 
          @click="$emit('view-details', agent)"
          class="inline-flex items-center text-sm font-medium text-purple-600 hover:text-purple-500 mr-3"
        >
          View Details
        </button>
        <button 
          @click="$emit('run', agent)"
          class="inline-flex items-center px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
        >
          Run Agent
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { LocalAgent } from '~/stores/agents';

const props = defineProps({
  agent: {
    type: Object as () => LocalAgent,
    required: true
  },
  maxItemsToShow: {
    type: Number,
    default: 3
  }
});

const emit = defineEmits(['run', 'view-details']);

const displayedSkills = computed(() => {
  if (!props.agent.skills || props.agent.skills.length === 0) return [];
  return props.agent.skills.slice(0, props.maxItemsToShow);
});
</script>
