<template>
  <div 
    class="border rounded-lg mb-3 bg-white transition-all duration-200 shadow-sm"
    :class="containerClasses"
  >
    <!-- Header -->
    <div 
      class="flex flex-wrap items-center gap-2 px-4 py-3 cursor-pointer select-none"
      @click="toggleExpand"
    >
      <!-- Left: Icon + Title + ID -->
      <div class="flex min-w-0 flex-1 items-center gap-3">
        <!-- Icon -->
        <Icon :icon="statusIconName" class="w-5 h-5 flex-shrink-0" :class="iconColorClass" />
        
        <!-- Title & ID -->
        <div class="flex min-w-0 items-center gap-2">
          <span class="truncate font-bold text-gray-800 text-sm">{{ activity.toolName }}</span>
          <span class="shrink-0 font-mono text-xs text-gray-600">#{{ shortId }}</span>
        </div>
      </div>

      <!-- Right: Status Chip -->
      <div class="ml-auto shrink-0">
        <span 
          class="inline-flex max-w-full px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border shadow-sm"
          :class="[statusChipClasses, 'whitespace-nowrap']"
        >
          {{ statusLabel }}
        </span>
      </div>
    </div>

    <!-- Expanded Details -->
    <div v-show="isExpanded" class="px-4 pb-4">
      <div class="pt-2 space-y-3 border-t border-gray-100 mt-1">
        
        <!-- Arguments Section -->
        <div v-if="sections.arguments">
          <div 
            class="flex items-center gap-1.5 mb-1.5 cursor-pointer hover:text-gray-800 transition-colors"
            @click.stop="toggleSection('args')"
          >
            <Icon 
              :icon="sectionStates.args ? 'heroicons:chevron-down' : 'heroicons:chevron-right'" 
              class="w-3.5 h-3.5 text-gray-600"
            />
            <span class="text-xs font-semibold text-gray-700">{{ $t('workspace.components.progress.ToolActivityItem.arguments') }}</span>
          </div>
          <div v-show="sectionStates.args" class="pl-5">
             <div class="bg-gray-50 border border-gray-100 rounded p-2.5 font-mono text-xs text-gray-900 whitespace-pre-wrap overflow-x-auto">
               {{ sections.arguments.text }}
             </div>
          </div>
        </div>

        <!-- Logs Section -->
        <div v-if="sections.logs">
           <div 
            class="flex items-center gap-1.5 mb-1.5 cursor-pointer hover:text-gray-800 transition-colors"
            @click.stop="toggleSection('logs')"
          >
            <Icon 
              :icon="sectionStates.logs ? 'heroicons:chevron-down' : 'heroicons:chevron-right'" 
              class="w-3.5 h-3.5 text-gray-600"
            />
            <span class="text-xs font-semibold text-gray-700">Logs ({{ sections.logs.lines?.length }})</span>
          </div>
          <div v-show="sectionStates.logs" class="pl-5">
             <div class="bg-gray-50 border border-gray-100 rounded p-2.5 font-mono text-xs text-gray-900 space-y-1">
               <div v-for="(log, idx) in sections.logs.lines" :key="idx" class="whitespace-pre-wrap break-all">
                 {{ log }}
               </div>
             </div>
          </div>
        </div>

        <!-- Result Section -->
        <div v-if="sections.result">
           <div 
            class="flex items-center gap-1.5 mb-1.5 cursor-pointer hover:text-gray-800 transition-colors"
            @click.stop="toggleSection('result')"
          >
            <Icon 
              :icon="sectionStates.result ? 'heroicons:chevron-down' : 'heroicons:chevron-right'" 
              class="w-3.5 h-3.5 text-gray-600"
            />
            <span class="text-xs font-semibold text-gray-700">{{ $t('workspace.components.progress.ToolActivityItem.result') }}</span>
          </div>
          <div v-show="sectionStates.result" class="pl-5">
             <div class="bg-white border border-gray-200 rounded p-3 font-mono text-xs text-gray-800 whitespace-pre-wrap shadow-sm overflow-x-auto">
               {{ sections.result.text }}
             </div>
          </div>
        </div>

        <!-- Error Section -->
        <div v-if="sections.error">
          <div
            data-test="tool-activity-error-toggle"
            class="flex items-center gap-1.5 mb-1.5 cursor-pointer hover:text-red-800 transition-colors"
            @click.stop="toggleSection('error')"
          >
            <Icon 
              :icon="sectionStates.error ? 'heroicons:chevron-down' : 'heroicons:chevron-right'" 
              class="w-3.5 h-3.5 text-red-500"
            />
            <span class="text-xs font-semibold text-red-600">{{ $t('workspace.components.progress.ToolActivityItem.error') }}</span>
          </div>
          <div v-show="sectionStates.error" data-test="tool-activity-error-body" class="pl-5">
             <div class="bg-red-50 border border-red-200 rounded p-2.5 font-mono text-xs text-red-700 whitespace-pre-wrap">
               {{ sections.error.text }}
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
import type { ToolActivity } from '~/types/activity/RunActivity';
import {
  toolActivityDetailSections,
  toolActivityStatusPresentation,
  type ToolActivityDetailSection,
  type ToolActivityDetailSectionKey,
  type ToolActivityTone,
} from '~/utils/activity/toolActivityPresentation';

const props = defineProps<{
  activity: ToolActivity;
  isHighlighted?: boolean;
}>();

const isExpanded = ref(true); 

const sectionStates = reactive({
  args: false,
  logs: false,
  result: false,
  error: false
});

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
};

const toggleSection = (section: keyof typeof sectionStates) => {
  sectionStates[section] = !sectionStates[section];
};

const shortId = computed(() => props.activity.invocationId.slice(0, 6));

// The status and the details sections come from their one owner, shared with the phone (autobyteus-590 D-3); the classes
// for each tone are the panel's own.
const status = computed(() => toolActivityStatusPresentation(props.activity.status));
const sections = computed(() => Object.fromEntries(toolActivityDetailSections(props.activity).map((section) => [section.key, section])) as Partial<Record<ToolActivityDetailSectionKey, ToolActivityDetailSection>>);

const statusIconName = computed(() => status.value.icon);
const statusLabel = computed(() => status.value.label);

const GRAY_GLOW = 'ring-2 ring-gray-400 ring-inset shadow-[inset_0_0_20px_rgba(156,163,175,0.6),inset_0_0_40px_rgba(156,163,175,0.4),inset_0_0_80px_rgba(156,163,175,0.2)] bg-gray-50';

const TONE_CLASSES: Record<ToolActivityTone, { icon: string; chip: string; border: string; glow: string }> = {
  green: {
    icon: 'text-green-500', chip: 'bg-green-100 text-green-700 border-green-200', border: 'border-green-200 hover:border-green-300',
    glow: 'ring-2 ring-green-500 ring-inset shadow-[inset_0_0_20px_rgba(34,197,94,0.6),inset_0_0_40px_rgba(34,197,94,0.4),inset_0_0_80px_rgba(34,197,94,0.2)] bg-green-50/50',
  },
  red: {
    icon: 'text-red-500', chip: 'bg-red-100 text-red-700 border-red-200', border: 'border-red-200 hover:border-red-300',
    glow: 'ring-2 ring-red-500 ring-inset shadow-[inset_0_0_20px_rgba(239,68,68,0.6),inset_0_0_40px_rgba(239,68,68,0.4),inset_0_0_80px_rgba(239,68,68,0.2)] bg-red-50/50',
  },
  cyan: {
    icon: 'text-cyan-600', chip: 'bg-cyan-100 text-cyan-700 border-cyan-200', border: 'border-cyan-200 hover:border-cyan-300',
    glow: 'ring-2 ring-cyan-500 ring-inset shadow-[inset_0_0_20px_rgba(6,182,212,0.6),inset_0_0_40px_rgba(6,182,212,0.4),inset_0_0_80px_rgba(6,182,212,0.2)] bg-cyan-50/50',
  },
  slate: {
    icon: 'text-slate-500', chip: 'bg-slate-100 text-slate-700 border-slate-200', border: 'border-slate-200 hover:border-slate-300',
    glow: GRAY_GLOW,
  },
  blue: {
    icon: 'text-blue-500', chip: 'bg-blue-100 text-blue-700 border-blue-200', border: 'border-blue-200 hover:border-blue-300',
    glow: 'ring-2 ring-blue-500 ring-inset shadow-[inset_0_0_20px_rgba(59,130,246,0.6),inset_0_0_40px_rgba(59,130,246,0.4),inset_0_0_80px_rgba(59,130,246,0.2)] bg-blue-50/50',
  },
  amber: {
    icon: 'text-amber-500', chip: 'bg-amber-100 text-amber-700 border-amber-200', border: 'border-amber-200 hover:border-amber-300',
    glow: 'ring-2 ring-amber-500 ring-inset shadow-none bg-white',
  },
  gray: { icon: 'text-gray-400', chip: 'bg-gray-100 text-gray-500 border-gray-200', border: 'border-gray-200 opacity-75', glow: GRAY_GLOW },
  neutral: { icon: 'text-gray-400', chip: 'bg-gray-100 text-gray-600 border-gray-200', border: 'border-gray-200', glow: GRAY_GLOW },
};

const iconColorClass = computed(() => TONE_CLASSES[status.value.tone].icon);
const statusChipClasses = computed(() => TONE_CLASSES[status.value.tone].chip);
// Highlighted: a strong inner glow in the status's color replaces the border.
const containerClasses = computed(() => (props.isHighlighted
  ? `${TONE_CLASSES[status.value.tone].glow} scale-[1.00] z-10 border-transparent`
  : `hover:shadow-md ${TONE_CLASSES[status.value.tone].border}`));

</script>

<style scoped>
/* No extra styles needed */
</style>
