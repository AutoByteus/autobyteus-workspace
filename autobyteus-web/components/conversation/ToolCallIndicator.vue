<template>
  <div class="my-2">
    <div
      class="rounded-lg border overflow-hidden transition-all duration-200"
      :class="[statusClasses, isNavigable ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default']"
      :role="isNavigable ? 'button' : undefined"
      :tabindex="isNavigable ? 0 : undefined"
      @click="handleCardClick"
      @keydown.enter.prevent="handleCardClick"
      @keydown.space.prevent="handleCardClick"
    >
      <!-- Main Header Row (Non-clickable for expanding) -->
      <div class="flex items-center justify-between px-3 py-2 select-none">
        <!-- Left Section: Icon + Tool Info -->
        <div class="flex items-center gap-2 overflow-hidden">
          <!-- Status Icon -->
          <div v-if="isExecuting" class="animate-spin h-5 w-5 border-[2.5px] border-blue-500 border-t-transparent rounded-full flex-shrink-0"></div>
          <Icon v-else-if="status === 'success'" icon="heroicons:check-circle-solid" class="w-5 h-5 text-green-500 flex-shrink-0" />
          <Icon v-else-if="status === 'error'" icon="heroicons:exclamation-circle-solid" class="w-5 h-5 text-red-500 flex-shrink-0" />
          <Icon v-else-if="status === 'approved'" icon="heroicons:check-badge-solid" class="w-5 h-5 text-cyan-500 flex-shrink-0" />
          <Icon v-else-if="isAwaiting" icon="heroicons:hand-raised-solid" class="w-5 h-5 text-amber-500 animate-pulse flex-shrink-0" />
          <Icon v-else-if="status === 'denied'" icon="heroicons:x-circle-solid" class="w-5 h-5 text-gray-400 flex-shrink-0" />
          <Icon v-else icon="heroicons:wrench-screwdriver-solid" class="w-5 h-5 text-gray-500 flex-shrink-0" />

          <!-- Tool Name + lightweight context (single-row for fluid reading) -->
          <div class="min-w-0 flex items-baseline gap-2 overflow-hidden">
            <span class="font-medium text-gray-700 text-sm truncate">{{ toolName }}</span>
            <span
              v-if="contextSummary"
              class="text-xs text-gray-500 truncate min-w-0"
              :class="contextTextClasses"
            >
              · {{ contextSummary }}
            </span>
            <span
              v-if="!isAwaiting"
              class="text-[10px] font-semibold uppercase tracking-wide flex-shrink-0"
              :class="statusTextClasses"
            >
              {{ statusLabel }}
            </span>
          </div>
        </div>

        <!-- Right Section: Actions or Link -->
        <div class="flex items-center gap-2 flex-shrink-0 ml-2">
          <!-- Action Buttons (for awaiting-approval state) -->
          <template v-if="isAwaiting">
            <button 
              @click.stop="deny"
              class="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-xs font-medium transition-colors"
              :disabled="isProcessing"
            >
              Deny
            </button>
            <button 
              @click.stop="approve"
              class="px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-xs font-medium transition-colors"
              :disabled="isProcessing"
            >
              Approve
            </button>
          </template>

          <!-- Minimal affordance: card itself is clickable -->
          <Icon
            v-if="!isAwaiting"
            icon="heroicons:chevron-right"
            class="w-4 h-4 text-gray-400"
            aria-hidden="true"
          />
        </div>
      </div>

      <!-- Error Message Row (always visible if error exists) -->
      <div v-if="errorMessage" class="px-3 pb-2 pt-0 border-t border-red-100/50">
        <div class="text-xs text-red-600 font-mono bg-red-50 px-2 py-1 rounded border border-red-100 mt-2">
          {{ errorMessage }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Icon } from '@iconify/vue';
import { useActiveContextStore } from '~/stores/activeContextStore';
import { useRightSideTabs } from '~/composables/useRightSideTabs';
import { useAgentActivityStore } from '~/stores/agentActivityStore';

const props = defineProps<{
  invocationId: string;
  toolName: string;
  status: string;
  args?: Record<string, any> | string; // New prop for arguments
  errorMessage?: string;
}>();

const activeContextStore = useActiveContextStore();
const { setActiveTab } = useRightSideTabs();
const activityStore = useAgentActivityStore();

const isProcessing = ref(false);
const isExecuting = computed(() => props.status === 'executing' || props.status === 'parsing');
const isAwaiting = computed(() => props.status === 'awaiting-approval');
const isNavigable = computed(() => !isAwaiting.value);
const normalizedToolName = computed(() => (props.toolName || '').toLowerCase());

const parsedArgs = computed<Record<string, any> | null>(() => {
  if (props.args === undefined || props.args === null) return null;
  if (typeof props.args === 'string') {
    try {
      const parsed = JSON.parse(props.args);
      return (parsed && typeof parsed === 'object') ? parsed : null;
    } catch {
      return { raw: props.args };
    }
  }
  return props.args;
});

const statusClasses = computed(() => {
  switch (props.status) {
    case 'executing':
    case 'parsing':
      return 'bg-white border-gray-200';
    case 'success':
      return 'bg-white border-gray-200';
    case 'error':
      return 'bg-white border-red-200';
    case 'approved':
      return 'bg-white border-cyan-200';
    case 'awaiting-approval':
      return 'bg-white border-amber-200';
    case 'denied':
      return 'bg-white border-gray-200 opacity-75';
    default:
      return 'bg-white border-gray-200';
  }
});

const statusLabel = computed(() => {
  switch (props.status) {
    case 'success':
      return 'success';
    case 'error':
      return 'failed';
    case 'approved':
      return 'approved';
    case 'executing':
    case 'parsing':
      return 'running';
    case 'denied':
      return 'denied';
    default:
      return '';
  }
});

const statusTextClasses = computed(() => {
  switch (props.status) {
    case 'success':
      return 'text-green-600';
    case 'error':
      return 'text-red-600';
    case 'approved':
      return 'text-cyan-600';
    case 'executing':
    case 'parsing':
      return 'text-blue-600';
    case 'denied':
      return 'text-gray-500';
    default:
      return 'text-gray-500';
  }
});

const isFileTool = computed(() => {
  const name = normalizedToolName.value;
  return (
    name.includes('write_file') ||
    name.includes('edit_file') ||
    name.includes('read_file') ||
    name.includes('apply_patch')
  );
});

const isCommandTool = computed(() => {
  const name = normalizedToolName.value;
  return (
    name.includes('bash') ||
    name.includes('terminal') ||
    name.includes('exec_command') ||
    name.includes('run_command')
  );
});

const contextSummary = computed(() => {
  const args = parsedArgs.value;
  if (!args) return '';

  if (isFileTool.value) {
    const path = pickFirstString(args, ['path', 'file_path', 'filepath', 'filename', 'target_path']);
    if (path) return compactFileName(path);
  }

  if (isCommandTool.value) {
    const command = pickFirstString(args, ['command', 'cmd', 'script']);
    if (command) return truncateText(redactSecrets(command), 56);
  }

  return '';
});

const contextTextClasses = computed(() => isCommandTool.value ? 'font-mono' : '');

const pickFirstString = (obj: Record<string, any>, keys: string[]): string => {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === 'string' && val.trim().length > 0) return val.trim();
  }
  return '';
};

const compactFileName = (path: string): string => {
  const normalized = path.replace(/\\/g, '/').trim();
  if (!normalized) return '';
  const segments = normalized.split('/').filter(Boolean);
  if (segments.length === 0) return normalized;
  return segments[segments.length - 1];
};

const redactSecrets = (text: string): string => {
  let sanitized = text;
  sanitized = sanitized.replace(/(api[_-]?key|token|password|passwd|secret)\s*=\s*([^\s]+)/gi, '$1=***');
  sanitized = sanitized.replace(/(--?(?:api-key|token|password|passwd|secret)\s+)([^\s]+)/gi, '$1***');
  return sanitized;
};

const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
};

const approve = async () => {
  if (isProcessing.value) return;
  isProcessing.value = true;
  try {
    await activeContextStore.postToolExecutionApproval(props.invocationId, true);
  } finally {
    isProcessing.value = false;
  }
};

const deny = async () => {
  if (isProcessing.value) return;
  isProcessing.value = true;
  try {
    await activeContextStore.postToolExecutionApproval(props.invocationId, false, "User denied via inline chat.");
  } finally {
    isProcessing.value = false;
  }
};

const goToActivity = () => {
  setActiveTab('progress');
  const agentId = activeContextStore.activeAgentContext?.state.agentId;
  if (agentId) {
    activityStore.setHighlightedActivity(agentId, props.invocationId);
  }
};

const handleCardClick = () => {
  if (isNavigable.value) {
    goToActivity();
  }
};
</script>

<style scoped>
div {
  -webkit-font-smoothing: antialiased;
}
</style>
