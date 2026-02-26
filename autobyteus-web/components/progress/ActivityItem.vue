<template>
  <div 
    class="border rounded-lg mb-3 bg-white transition-all duration-200 shadow-sm"
    :class="containerClasses"
  >
    <!-- Header -->
    <div 
      class="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
      @click="toggleExpand"
    >
      <!-- Left: Icon + Title + ID -->
      <div class="flex items-center gap-3">
        <!-- Icon -->
        <Icon :icon="statusIconName" class="w-5 h-5 flex-shrink-0" :class="iconColorClass" />
        
        <!-- Title & ID -->
        <div class="flex items-center gap-2">
          <span class="font-bold text-gray-800 text-sm">{{ activity.toolName }}</span>
          <span v-if="shortId" class="font-mono text-xs text-gray-600">#{{ shortId }}</span>
        </div>
      </div>

      <!-- Right: Status Chip -->
      <div>
        <span 
          class="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border shadow-sm"
          :class="statusChipClasses"
        >
          {{ statusLabel }}
        </span>
      </div>
    </div>

    <!-- Expanded Details -->
    <div v-show="isExpanded" class="px-4 pb-4">
      <div class="pt-2 space-y-3 border-t border-gray-100 mt-1">
        
        <!-- Arguments Section -->
        <div v-if="hasInterestingArgs">
          <div 
            class="flex items-center gap-1.5 mb-1.5 cursor-pointer hover:text-gray-800 transition-colors"
            @click.stop="toggleSection('args')"
          >
            <Icon 
              :icon="sectionStates.args ? 'heroicons:chevron-down' : 'heroicons:chevron-right'" 
              class="w-3.5 h-3.5 text-gray-600"
            />
            <span class="text-xs font-semibold text-gray-700">Arguments</span>
          </div>
          <div v-show="sectionStates.args" class="pl-5">
             <div class="bg-gray-50 border border-gray-100 rounded p-2.5 font-mono text-xs text-gray-900 whitespace-pre-wrap overflow-x-auto">
               {{ formatJson(activity.arguments) }}
             </div>
          </div>
        </div>

        <!-- Logs Section -->
        <div v-if="activity.logs.length > 0">
           <div 
            class="flex items-center gap-1.5 mb-1.5 cursor-pointer hover:text-gray-800 transition-colors"
            @click.stop="toggleSection('logs')"
          >
            <Icon 
              :icon="sectionStates.logs ? 'heroicons:chevron-down' : 'heroicons:chevron-right'" 
              class="w-3.5 h-3.5 text-gray-600"
            />
            <span class="text-xs font-semibold text-gray-700">Logs ({{ activity.logs.length }})</span>
          </div>
          <div v-show="sectionStates.logs" class="pl-5">
             <div class="bg-gray-50 border border-gray-100 rounded p-2.5 font-mono text-xs text-gray-900 space-y-1">
               <div v-for="(log, idx) in activity.logs" :key="idx" class="whitespace-pre-wrap break-all">
                 {{ log }}
               </div>
             </div>
          </div>
        </div>

        <!-- Result Section -->
        <div v-if="activity.result">
           <div 
            class="flex items-center gap-1.5 mb-1.5 cursor-pointer hover:text-gray-800 transition-colors"
            @click.stop="toggleSection('result')"
          >
            <Icon 
              :icon="sectionStates.result ? 'heroicons:chevron-down' : 'heroicons:chevron-right'" 
              class="w-3.5 h-3.5 text-gray-600"
            />
            <span class="text-xs font-semibold text-gray-700">Result</span>
          </div>
          <div v-show="sectionStates.result" class="pl-5">
             <div class="bg-white border border-gray-200 rounded p-3 font-mono text-xs text-gray-800 whitespace-pre-wrap shadow-sm overflow-x-auto">
               {{ formatJson(activity.result) }}
             </div>
          </div>
        </div>

        <!-- Error Section -->
        <div v-if="activity.error">
           <div 
            class="flex items-center gap-1.5 mb-1.5 cursor-pointer hover:text-red-800 transition-colors"
            @click.stop="toggleSection('error')"
          >
            <Icon 
              :icon="sectionStates.error ? 'heroicons:chevron-down' : 'heroicons:chevron-right'" 
              class="w-3.5 h-3.5 text-red-500"
            />
            <span class="text-xs font-semibold text-red-600">Error</span>
          </div>
          <div v-show="sectionStates.error" class="pl-5">
             <div class="bg-red-50 border border-red-200 rounded p-2.5 font-mono text-xs text-red-700 whitespace-pre-wrap">
               {{ activity.error }}
             </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue';
import { Icon } from '@iconify/vue';
import type { ToolActivity } from '~/stores/agentActivityStore';

const props = defineProps<{
  activity: ToolActivity;
  isHighlighted?: boolean;
}>();

const isExpanded = ref(true); 

const sectionStates = reactive({
  args: false,
  logs: false,
  result: false,
  error: true
});

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
};

const toggleSection = (section: keyof typeof sectionStates) => {
  sectionStates[section] = !sectionStates[section];
};

const shortId = computed(() => {
  const invocationId = props.activity?.invocationId;
  if (typeof invocationId !== 'string' || invocationId.trim().length === 0) {
    return null;
  }
  return invocationId.slice(0, 6);
});

const hasInterestingArgs = computed(() => {
  const args = props.activity.arguments;
  return args && Object.keys(args).length > 0;
});

const formatJson = (val: any) => {
  if (typeof val === 'string') return val;
  try {
    return JSON.stringify(val, null, 2);
  } catch {
    return String(val);
  }
};

// --- Styling Logic ---

const statusIconName = computed(() => {
  switch (props.activity.status) {
    case 'success': return 'heroicons:check-circle-solid';
    case 'error': return 'heroicons:x-circle-solid';
    case 'approved': return 'heroicons:check-badge-solid';
    case 'executing':
    case 'parsing': return 'heroicons:clock-solid'; 
    case 'awaiting-approval': return 'heroicons:hand-raised-solid';
    case 'denied': return 'heroicons:no-symbol-solid';
    default: return 'heroicons:wrench-screwdriver-solid';
  }
});

const iconColorClass = computed(() => {
  switch (props.activity.status) {
    case 'success': return 'text-green-500';
    case 'error': return 'text-red-500';
    case 'approved': return 'text-cyan-600';
    case 'executing':
    case 'parsing': return 'text-blue-500';
    case 'awaiting-approval': return 'text-amber-500';
    case 'denied': return 'text-gray-400';
    default: return 'text-gray-400';
  }
});

const containerClasses = computed(() => {
  // Highlight effect: strong outer glow + inner glow for maximum visibility (like neon effect)
  // Added: stronger ring (ring-4), increased shadow opacity, background tint, and pulse animation
  
  if (props.isHighlighted) {
      let glowClass = '';
      // Define colors for each status
      // Success: Green (34,197,94)
      // Error: Red (239,68,68)
      // Executing: Blue (59,130,246)
      // Review: Amber (245,158,11)
      // Denied/Default: Gray (107,114,128)
      
      switch (props.activity.status) {
        case 'success':
            glowClass = 'ring-2 ring-green-500 ring-inset shadow-[inset_0_0_20px_rgba(34,197,94,0.6),inset_0_0_40px_rgba(34,197,94,0.4),inset_0_0_80px_rgba(34,197,94,0.2)] bg-green-50/50';
            break;
        case 'error':
            glowClass = 'ring-2 ring-red-500 ring-inset shadow-[inset_0_0_20px_rgba(239,68,68,0.6),inset_0_0_40px_rgba(239,68,68,0.4),inset_0_0_80px_rgba(239,68,68,0.2)] bg-red-50/50';
            break;
        case 'awaiting-approval':
            glowClass = 'ring-2 ring-amber-500 ring-inset shadow-none bg-white';
            break;
        case 'approved':
            glowClass = 'ring-2 ring-cyan-500 ring-inset shadow-[inset_0_0_20px_rgba(6,182,212,0.6),inset_0_0_40px_rgba(6,182,212,0.4),inset_0_0_80px_rgba(6,182,212,0.2)] bg-cyan-50/50';
            break;
        case 'executing':
        case 'parsing':
            glowClass = 'ring-2 ring-blue-500 ring-inset shadow-[inset_0_0_20px_rgba(59,130,246,0.6),inset_0_0_40px_rgba(59,130,246,0.4),inset_0_0_80px_rgba(59,130,246,0.2)] bg-blue-50/50';
            break;
        default:
             glowClass = 'ring-2 ring-gray-400 ring-inset shadow-[inset_0_0_20px_rgba(156,163,175,0.6),inset_0_0_40px_rgba(156,163,175,0.4),inset_0_0_80px_rgba(156,163,175,0.2)] bg-gray-50';
      }
      
      return `${glowClass} scale-[1.00] z-10 border-transparent`; // glow replaces border
  }

  // Non-highlighted state
  let borderClass = 'border-gray-200';
  switch (props.activity.status) {
    case 'success': borderClass = 'border-green-200 hover:border-green-300'; break;
    case 'error': borderClass = 'border-red-200 hover:border-red-300'; break;
    case 'approved': borderClass = 'border-cyan-200 hover:border-cyan-300'; break;
    case 'executing':
    case 'parsing': borderClass = 'border-blue-200 hover:border-blue-300'; break;
    case 'awaiting-approval': borderClass = 'border-amber-200 hover:border-amber-300'; break;
    case 'denied': borderClass = 'border-gray-200 opacity-75'; break;
  }

  return `hover:shadow-md ${borderClass}`;
});

const statusLabel = computed(() => {
  switch (props.activity.status) {
    case 'success': return 'Success';
    case 'error': return 'Failed';
    case 'approved': return 'Approved';
    case 'executing':
    case 'parsing': return 'Running';
    case 'awaiting-approval': return 'Review';
    case 'denied': return 'Denied';
    default: return 'Unknown';
  }
});

const statusChipClasses = computed(() => {
  switch (props.activity.status) {
    case 'success': return 'bg-green-100 text-green-700 border-green-200';
    case 'error': return 'bg-red-100 text-red-700 border-red-200';
    case 'approved': return 'bg-cyan-100 text-cyan-700 border-cyan-200';
    case 'executing':
    case 'parsing': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'awaiting-approval': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'denied': return 'bg-gray-100 text-gray-500 border-gray-200';
    default: return 'bg-gray-100 text-gray-600 border-gray-200';
  }
});

</script>

<style scoped>
/* No extra styles needed */
</style>
