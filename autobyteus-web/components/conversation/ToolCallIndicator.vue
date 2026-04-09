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
      <div class="flex items-center justify-between px-3 py-2 select-none">
        <div class="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          <div v-if="isExecuting" class="animate-spin h-5 w-5 border-[2.5px] border-blue-500 border-t-transparent rounded-full flex-shrink-0"></div>
          <Icon v-else-if="status === 'success'" icon="heroicons:check-circle-solid" class="w-5 h-5 text-green-500 flex-shrink-0" />
          <Icon v-else-if="status === 'error'" icon="heroicons:exclamation-circle-solid" class="w-5 h-5 text-red-500 flex-shrink-0" />
          <Icon v-else-if="status === 'approved'" icon="heroicons:check-badge-solid" class="w-5 h-5 text-cyan-500 flex-shrink-0" />
          <Icon v-else-if="isAwaiting" icon="heroicons:hand-raised-solid" class="w-5 h-5 text-amber-500 animate-pulse flex-shrink-0" />
          <Icon v-else-if="status === 'denied'" icon="heroicons:x-circle-solid" class="w-5 h-5 text-gray-400 flex-shrink-0" />
          <Icon v-else icon="heroicons:wrench-screwdriver-solid" class="w-5 h-5 text-gray-500 flex-shrink-0" />

          <div class="min-w-0 flex flex-1 items-baseline gap-2 overflow-hidden">
            <span class="max-w-[12rem] truncate font-medium text-gray-700 text-sm">{{ toolName }}</span>
            <span
              v-if="contextSummary"
              data-test="tool-context-summary"
              class="min-w-0 flex-1 truncate text-xs text-gray-500"
              :class="contextTextClasses"
              :title="contextSummaryTitle"
            >
              · {{ contextSummary }}
            </span>
          </div>
        </div>

        <div class="ml-3 flex flex-shrink-0 items-center gap-2">
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

          <Icon
            v-if="!isAwaiting"
            icon="heroicons:chevron-right"
            class="w-4 h-4 text-gray-400"
            aria-hidden="true"
          />
        </div>
      </div>

      <div v-if="errorMessage" class="px-3 pb-2 pt-0 border-t border-red-100/50">
        <div class="mt-2 rounded border border-red-100 bg-red-50 px-2 py-1 font-mono text-xs text-red-600 break-words">
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
import { getToolDisplaySummary } from '~/utils/toolDisplaySummary';

const props = defineProps<{
  invocationId: string;
  toolName: string;
  status: string;
  args?: Record<string, any> | string;
  errorMessage?: string;
}>();

const activeContextStore = useActiveContextStore();
const { setActiveTab } = useRightSideTabs();
const activityStore = useAgentActivityStore();

const isProcessing = ref(false);
const isExecuting = computed(() => props.status === 'executing' || props.status === 'parsing');
const isAwaiting = computed(() => props.status === 'awaiting-approval');
const isNavigable = computed(() => !isAwaiting.value);
const displaySummary = computed(() => getToolDisplaySummary(props.toolName, props.args, {
  preferCompactPath: true,
}));

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

const contextSummary = computed(() => displaySummary.value?.text ?? '');
const contextSummaryTitle = computed(() => displaySummary.value?.title ?? '');
const contextTextClasses = computed(() => (
  displaySummary.value?.kind === 'command' || displaySummary.value?.kind === 'file'
    ? 'font-mono'
    : ''
));

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
    await activeContextStore.postToolExecutionApproval(props.invocationId, false, 'User denied via inline chat.');
  } finally {
    isProcessing.value = false;
  }
};

const goToActivity = () => {
  setActiveTab('progress');
  const agentRunId = activeContextStore.activeAgentContext?.state.runId;
  if (agentRunId) {
    activityStore.setHighlightedActivity(agentRunId, props.invocationId);
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
