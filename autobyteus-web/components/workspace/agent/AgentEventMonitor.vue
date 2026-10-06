<template>
  <div class="flex h-full min-h-0 flex-col gap-3 overflow-hidden overscroll-none p-4" data-testid="agent-event-monitor">
    <AgentConversationFeed
      class="min-h-0 flex-1"
      :conversation="conversation"
      :run-id="effectiveRunId"
      :agent-name="agentName"
      :agent-avatar-url="agentAvatarUrl"
      :inter-agent-sender-name-by-id="interAgentSenderNameById"
      :compaction-activities="compactionActivities"
      :presentation-revision="presentationRevision"
      :browse-items="browse.presentation.value"
      :browse-state="browse.state.value"
      :can-load-earlier="browse.canLoadEarlier.value"
      :newer-browse-content-released="browse.newerBrowseContentReleased.value"
      :browse-has-newer-live-activity="browse.hasNewerLiveActivity.value"
      :enable-event-monitor-file-actions="true"
      @file-path-action="handleFilePathAction"
      @load-earlier="browse.loadEarlier"
      @jump-to-latest="browse.jumpToLatest"
    />

    <div v-if="!readOnly" class="shrink-0">
      <p
        v-if="filePreviewStatus"
        class="mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
        role="status"
        aria-live="polite"
        data-testid="event-monitor-file-preview-status"
      >
        {{ filePreviewStatus }}
      </p>
      <slot name="composerContext" />
      <!-- A collaborator that could not be brought into this run (REQ-008); hidden otherwise. -->
      <CollaboratorAddFailureNotice />
      <slot name="composer">
        <AgentUserInputForm :before-send="beforeSend" :skill-tagging="skillTagging" :placeholder="composerPlaceholder" />
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, toRef } from 'vue';
import { useWorkspaceToolReveal } from '~/composables/layout/useWorkspaceToolReveal';
import type { Conversation } from '~/types/conversation';
import AgentUserInputForm from '~/components/agentInput/AgentUserInputForm.vue';
import CollaboratorAddFailureNotice from '~/components/agentInput/CollaboratorAddFailureNotice.vue';
import type { SkillTaggingCapability } from '~/composables/agentInput/useSkillTagMenu';
import AgentConversationFeed from '~/components/workspace/agent/AgentConversationFeed.vue';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import type { AbsoluteFilePathAction } from '~/utils/eventMonitorFilePaths/absoluteFilePathAction';
import {
  useEventMonitorActiveTraceBrowse,
} from '~/services/eventMonitor/eventMonitorActiveTraceBrowse';
import type {
  EventMonitorActiveTraceBrowseSubject,
} from '~/services/eventMonitor/eventMonitorActiveTracePageService';

const props = defineProps<{
  conversation: Conversation;
  readOnly?: boolean;
  runId?: string;
  agentName?: string;
  agentAvatarUrl?: string | null;
  interAgentSenderNameById?: Record<string, string>;
  beforeSend?: () => void | Promise<void>;
  presentationRevision?: number;
  hasEarlierActiveTraceEvents?: boolean;
  browseSubject: EventMonitorActiveTraceBrowseSubject;
  /** `/` skill tags in the box; standalone agent runs only. */
  skillTagging?: SkillTaggingCapability | null;
  /** Composer placeholder when there are no skill tags (e.g. "Message code reviewer…"). */
  composerPlaceholder?: string | null;
}>();

const activityStore = useAgentActivityStore();
const effectiveRunId = computed(() => props.runId || props.conversation.id);
const compactionActivities = computed(() => activityStore.getCompactionActivities(effectiveRunId.value));
const filePreviewStatus = ref('');
const revealTool = useWorkspaceToolReveal();
let isLive = true;
onBeforeUnmount(() => { isLive = false; });
const browse = useEventMonitorActiveTraceBrowse({
  subject: toRef(props, 'browseSubject'),
  hasEarlierAvailable: () => props.hasEarlierActiveTraceEvents === true,
  presentationRevision: () => props.presentationRevision ?? 0,
});

const handleFilePathAction = async (action: AbsoluteFilePathAction): Promise<void> => {
  // Keep the launcher effect boundary out of Markdown rendering and passive
  // message arrival. It is created only for explicit user activation.
  const originRunId = effectiveRunId.value;
  const isOriginCurrent = () => isLive && effectiveRunId.value === originRunId;
  const { useEventMonitorFilePreview } = await import('~/composables/useEventMonitorFilePreview');
  if (!isOriginCurrent()) return;
  const result = await useEventMonitorFilePreview({ revealTool, isOriginCurrent }).openPath(action);
  if (!isOriginCurrent()) return;
  filePreviewStatus.value = result.status === 'opened' ? '' : result.message;
};
</script>
