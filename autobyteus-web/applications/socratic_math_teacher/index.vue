<template>
  <div class="w-full h-full flex flex-col bg-gray-50">
    <div class="flex-shrink-0 flex justify-between items-center p-4 border-b border-gray-200 bg-white">
      <h1 class="text-xl font-semibold text-gray-800">Socratic Math Teacher</h1>
      <button
        @click="handleReset"
        class="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        Start New Problem
      </button>
    </div>

    <ChatDisplay
      :team-context="teamContext"
      :error="error"
      class="flex-grow"
    />

    <div v-if="isLoading" class="p-2 border-t border-gray-200 flex items-center text-sm text-gray-500 bg-gray-50">
      <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
      <span>The AI is thinking...</span>
    </div>

    <AppChatInput
      :is-loading="isLoading"
      :draft-owner="contextFilesDraftOwner"
      :context-files-target-key="focusedMemberRouteKey"
      :update-context-files-for-target="updateContextFilesForTarget"
      v-model:problemText="problemText"
      v-model:contextFiles="contextFiles"
      @submit="handleSubmit"
      class="flex-shrink-0"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, toRef } from 'vue';
import { useApplicationRunStore } from '~/stores/applicationRunStore';
import { useApplicationContextStore } from '~/stores/applicationContextStore';
import AppChatInput from './components/AppChatInput.vue';
import ChatDisplay from './components/ChatDisplay.vue';
import type { ContextAttachment } from '~/types/conversation';
import {
  buildTeamMemberDraftContextFileOwner,
  type DraftContextFileOwnerDescriptor,
} from '~/utils/contextFiles/contextFileOwner';
import { AgentStatus } from '~/types/agent/AgentStatus';

const props = defineProps<{
  applicationRunId: string;
}>();

const emit = defineEmits<{
  (e: 'reset'): void;
}>();

type ComposerDraftState = {
  problemText: string;
  contextFiles: ContextAttachment[];
};

const createEmptyComposerDraft = (): ComposerDraftState => ({
  problemText: '',
  contextFiles: [],
});

const applicationRunStore = useApplicationRunStore();
const appContextStore = useApplicationContextStore();

const applicationRunId = toRef(props, 'applicationRunId');
const error = ref<string | null>(null);
const composerDraftsByMember = ref<Record<string, ComposerDraftState>>({});

onUnmounted(() => {
  if (applicationRunId.value) {
    applicationRunStore.terminateApplication(applicationRunId.value);
  }
});

const runContext = computed(() =>
  applicationRunId.value ? appContextStore.getRun(applicationRunId.value) : null,
);

const teamContext = computed(() => runContext.value?.teamContext || null);
const focusedMemberRouteKey = computed(() => teamContext.value?.focusedMemberName || null);

const ensureComposerDraft = (memberRouteKey: string): ComposerDraftState => {
  const existingDraft = composerDraftsByMember.value[memberRouteKey];
  if (existingDraft) {
    return existingDraft;
  }

  const nextDraft = createEmptyComposerDraft();
  composerDraftsByMember.value[memberRouteKey] = nextDraft;
  return nextDraft;
};

const replaceComposerDraft = (memberRouteKey: string, draft: ComposerDraftState): void => {
  composerDraftsByMember.value[memberRouteKey] = {
    problemText: draft.problemText,
    contextFiles: [...draft.contextFiles],
  };
};

const updateContextFilesForTarget = (
  memberRouteKey: string,
  updater: (current: ContextAttachment[]) => ContextAttachment[],
): void => {
  const draft = ensureComposerDraft(memberRouteKey);
  draft.contextFiles = updater([...draft.contextFiles]);
};

const problemText = computed<string>({
  get() {
    return focusedMemberRouteKey.value
      ? ensureComposerDraft(focusedMemberRouteKey.value).problemText
      : '';
  },
  set(value) {
    if (!focusedMemberRouteKey.value) {
      return;
    }
    ensureComposerDraft(focusedMemberRouteKey.value).problemText = value;
  },
});

const contextFiles = computed<ContextAttachment[]>({
  get() {
    return focusedMemberRouteKey.value
      ? ensureComposerDraft(focusedMemberRouteKey.value).contextFiles
      : [];
  },
  set(value) {
    if (!focusedMemberRouteKey.value) {
      return;
    }
    ensureComposerDraft(focusedMemberRouteKey.value).contextFiles = [...value];
  },
});

const contextFilesDraftOwner = computed<DraftContextFileOwnerDescriptor | null>(() => {
  if (!teamContext.value?.teamRunId || !focusedMemberRouteKey.value) {
    return null;
  }

  return buildTeamMemberDraftContextFileOwner(
    teamContext.value.teamRunId,
    focusedMemberRouteKey.value,
  );
});

const isLoading = computed(() => {
  if (!runContext.value) return true;
  if (applicationRunStore.isLaunching) return true;

  const coordinatorStatus = teamContext.value?.members.get(teamContext.value.focusedMemberName)?.state.currentStatus;
  if (
    coordinatorStatus &&
    coordinatorStatus !== AgentStatus.Idle &&
    coordinatorStatus !== AgentStatus.Uninitialized &&
    coordinatorStatus !== AgentStatus.Error
  ) {
    return true;
  }
  return false;
});

async function handleSubmit() {
  error.value = null;

  if (
    isLoading.value ||
    !problemText.value.trim() ||
    !applicationRunId.value ||
    !focusedMemberRouteKey.value ||
    !contextFilesDraftOwner.value
  ) {
    return;
  }

  const payload = {
    problemText: problemText.value,
    contextFiles: [...contextFiles.value],
    targetMemberRouteKey: focusedMemberRouteKey.value,
    draftOwner: contextFilesDraftOwner.value,
  };

  replaceComposerDraft(payload.targetMemberRouteKey, createEmptyComposerDraft());

  try {
    await applicationRunStore.sendMessageToApplication(
      applicationRunId.value,
      payload.problemText,
      payload.contextFiles,
      {
        targetMemberRouteKey: payload.targetMemberRouteKey,
        draftOwner: payload.draftOwner,
      },
    );
  } catch (e: any) {
    console.error('Error during submission:', e);
    error.value = e.message || 'An unknown error occurred during submission.';
    replaceComposerDraft(payload.targetMemberRouteKey, {
      problemText: payload.problemText,
      contextFiles: payload.contextFiles,
    });
  }
}

function handleReset() {
  if (applicationRunId.value) {
    applicationRunStore.terminateApplication(applicationRunId.value);
  }
  emit('reset');
}
</script>
