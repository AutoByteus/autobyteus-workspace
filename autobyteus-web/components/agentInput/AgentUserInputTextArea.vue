<template>
  <div class="flex flex-col bg-white">
    <p v-if="targetContext?.state.recoverableBlock && targetContext.state.recoverableBlock.state !== 'recovering'" role="status" class="px-3 pt-2 text-xs text-amber-700">
      {{ $t('agentInput.components.agentInput.AgentUserInputTextArea.compaction_retry') }}
    </p>
    <div ref="rootRef" class="relative flex-grow">
      <!-- Background only: native textarea owns text, selection, undo and accessibility. -->
      <div
        v-if="activeMentionNames.length"
        class="mention-mirror-viewport"
        aria-hidden="true"
        :style="{ width: `${mirrorMetrics.width}px`, height: `${mirrorMetrics.height}px` }"
        data-test="composer-mention-mirror"
      >
        <div
          class="composer-text mention-mirror"
          :style="{ transform: `translate(${-mirrorMetrics.scrollLeft}px, ${-mirrorMetrics.scrollTop}px)` }"
        ><template v-for="(part, index) in mentionParts" :key="index"><span
          :class="{ 'mention-highlight': part.kind === 'mention' }"
        >{{ part.kind === 'mention' ? '@' + part.value : part.value }}</span></template></div>
      </div>
      <textarea
        :value="internalRequirement"
        @input="handleInput"
        @scroll="syncMirrorMetrics"
        :aria-label="t('chat.mentions.messageLabel')"
        ref="textarea"
        class="composer-text relative w-full border-0 focus:ring-0 focus:outline-none resize-none bg-transparent"
        :style="{
          height: `${textareaHeight}px`,
          minHeight: `${MIN_TEXTAREA_HEIGHT}px`,
          maxHeight: `${MAX_TEXTAREA_HEIGHT}px`
        }"
        :placeholder="composerPlaceholder"
        :role="hasMenus ? 'combobox' : undefined"
        :aria-autocomplete="hasMenus ? 'list' : undefined"
        :aria-expanded="hasMenus ? (activeMenu ? 'true' : 'false') : undefined"
        :aria-controls="activeMenu?.listId"
        :aria-activedescendant="activeMenu && activeMenu.count ? `${activeMenu.listId}-option-${activeMenu.highlight}` : undefined"
        @keydown="handleKeyDown"
        @click="detectMenus"
        :disabled="!target"
        @dragover.prevent
        @drop.prevent="handleDrop"
        data-file-drop-target="true"
      ></textarea>

      <VoiceInputButton :target="target" class="absolute bottom-2 right-14" />

      <MessagePrimaryActionButton
        class="absolute bottom-2 right-2"
        :kind="primaryAction.kind === 'interrupt' ? 'interrupt' : 'send'"
        :disabled="isActionDisabled"
        @activate="handlePrimaryAction"
      />

      <!-- `/` skill menu: standalone runs only (skillTagging). -->
      <template v-if="skillTagging && skillMenu.open.value">
        <div v-if="skillMenu.popover.narrow.value" class="fixed inset-0 z-40 bg-black/20" aria-hidden="true"></div>
        <div
          class="z-50"
          :class="skillMenu.popover.narrow.value
            ? 'fixed inset-x-2 bottom-2 [&>div]:w-auto'
            : ['absolute left-2', skillMenu.popover.placement.value === 'above' ? 'bottom-full mb-1.5' : 'top-full mt-1.5']"
        >
          <ChatSkillMenu
            :list-id="skillMenuListId"
            :query="skillMenu.query.value"
            :skills="skillMenu.filteredSkills.value"
            :has-any-skills="skillTagging.skills.length > 0"
            :selected="targetContext?.requestedSkillNames ?? []"
            :highlight="skillMenu.highlight.value"
            :all-installed="skillTagging.allInstalled"
            @highlight="skillMenu.highlight.value = $event"
            @choose="skillMenu.choose"
          />
        </div>
      </template>

      <!-- `@` menu: bring a shared Agent or Team into this live run. -->
      <template v-if="mentionMenu.open.value">
        <div v-if="mentionMenu.popover.narrow.value" class="fixed inset-0 z-40 bg-black/20" aria-hidden="true"></div>
        <div
          class="z-50 flex flex-col"
          :class="mentionMenu.popover.narrow.value
            ? 'fixed inset-x-2 bottom-2 [&>div]:w-auto'
            : ['absolute left-2', mentionMenu.popover.placement.value === 'above' ? 'bottom-full mb-1.5' : 'top-full mt-1.5']"
          :style="mentionMenu.popover.narrow.value ? undefined : { maxHeight: `${mentionMenu.popover.maxHeight.value}px` }"
        >
          <ChatTargetMenu
            variant="run"
            :list-id="mentionMenuListId"
            :query="mentionMenu.query.value"
            :targets="mentionMenu.filtered.value"
            :highlight="mentionMenu.highlight.value"
            :focused-name="mentionMenu.focusedName.value"
            @highlight="mentionMenu.highlight.value = $event"
            @choose="mentionMenu.choose"
          />
        </div>
      </template>
    </div>

    <VoiceInputStatusRow class="mx-3 mb-2" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch, onUnmounted, toRef, useId } from 'vue';
import { useContextFileUploadStore } from '~/stores/contextFileUploadStore';
import { useComposerFilePathDrop } from '~/composables/agentInput/useComposerFilePathDrop';
import type { AgentContext } from '~/types/agent/AgentContext';
import { resolveAgentPrimaryAction } from '~/services/runSubmission/agentPrimaryAction';
import { AgentStatus } from '~/types/agent/AgentStatus';
import type { ComposerTarget } from '~/composables/agentInput/useComposerTarget';
import VoiceInputButton from '~/components/agentInput/VoiceInputButton.vue';
import VoiceInputStatusRow from '~/components/agentInput/VoiceInputStatusRow.vue';
import MessagePrimaryActionButton from '~/components/agentInput/MessagePrimaryActionButton.vue';
import ChatSkillMenu from '~/components/chat/ChatSkillMenu.vue';
import ChatTargetMenu from '~/components/chat/ChatTargetMenu.vue';
import { useRunMentionMenu } from '~/composables/agentInput/useRunMentionMenu';
import { useSkillTagMenu, type SkillTaggingCapability } from '~/composables/agentInput/useSkillTagMenu';
import { hasSendableDraft } from '~/services/runSubmission/agentPrimaryAction';
import { useLocalization } from '~/composables/useLocalization';
import { mentionsPresentInText, splitMentionText } from '~/utils/collaborators/collaboratorMentionText';

const props = defineProps<{
  target: ComposerTarget | null;
  beforeSend?: () => void | Promise<void>;
  /** `/` skill tags; supplied only for standalone agent runs. */
  skillTagging?: SkillTaggingCapability | null;
  placeholder?: string | null;
}>();

const { t } = useLocalization();
const contextFileUploadStore = useContextFileUploadStore();
const { resolveDroppedFilePaths } = useComposerFilePathDrop();
const internalRequirement = ref('');

const targetContext = computed<AgentContext | null>(() => props.target?.context ?? null);
const submissionPending = computed(() => targetContext.value?.submissionPending ?? false);

const primaryAction = computed(() => resolveAgentPrimaryAction({
  hasContext: Boolean(targetContext.value),
  status: targetContext.value?.state.currentStatus ?? AgentStatus.Offline,
  submissionPending: submissionPending.value,
  isUploading: contextFileUploadStore.isUploading,
  // With skill tagging (a standalone run), a skill tag or a context file also makes a draft, as in Chat.
  hasDraft: props.skillTagging && targetContext.value
    ? Boolean(internalRequirement.value.trim()) || hasSendableDraft(targetContext.value, { attachmentsAreSendable: true })
    : Boolean(internalRequirement.value.trim()),
}));
const isActionDisabled = computed(() => !primaryAction.value.enabled
  || props.target?.access === 'read_only');

// Local component state
const textarea = ref<HTMLTextAreaElement | null>(null);
const MIN_TEXTAREA_HEIGHT = 56;
const MAX_TEXTAREA_HEIGHT = 220;
const textareaHeight = ref(MIN_TEXTAREA_HEIGHT);
const rootRef = ref<HTMLElement | null>(null);
const skillMenuListId = `agent-skill-menu-${useId()}`;
const mentionMenuListId = `agent-mention-menu-${useId()}`;
let pendingLocalAcknowledgementContext: AgentContext | null = null;
let textareaResizeObserver: ResizeObserver | null = null;
const mirrorMetrics = ref({ width: 0, height: 0, scrollTop: 0, scrollLeft: 0 });
const syncMirrorMetrics = () => {
  const element = textarea.value;
  if (!element) return;
  // client dimensions exclude native scrollbars; the mirror clips independently of menus.
  mirrorMetrics.value = {
    width: element.clientWidth, height: element.clientHeight,
    scrollTop: element.scrollTop, scrollLeft: element.scrollLeft,
  };
};

const adjustTextareaHeight = () => {
  if (textarea.value) {
    textarea.value.style.height = 'auto';
    const scrollHeight = textarea.value.scrollHeight;
    const newHeight = Math.min(Math.max(scrollHeight, MIN_TEXTAREA_HEIGHT), MAX_TEXTAREA_HEIGHT);
    textarea.value.style.height = `${newHeight}px`;
    textarea.value.style.overflowY = scrollHeight > MAX_TEXTAREA_HEIGHT ? 'auto' : 'hidden';
    textareaHeight.value = newHeight;
    syncMirrorMetrics();
  }
};

const syncInternalRequirement = (nextRequirement: string) => {
  if (nextRequirement === internalRequirement.value) {
    return;
  }

  internalRequirement.value = nextRequirement;
  nextTick(adjustTextareaHeight);
};

watch(
  targetContext,
  (context) => {
    syncInternalRequirement(context?.requirement ?? '');
    nextTick(adjustTextareaHeight);
  },
  { immediate: true },
);

watch(() => targetContext.value?.requirement ?? '', (requirement) => {
  syncInternalRequirement(requirement);
});

const syncPendingLocalAcknowledgement = () => {
  const context = targetContext.value;
  if (
    !pendingLocalAcknowledgementContext
    || context !== pendingLocalAcknowledgementContext
    || !submissionPending.value
  ) {
    return;
  }

  syncInternalRequirement(context.requirement);
  pendingLocalAcknowledgementContext = null;
};

watch(submissionPending, (pending) => {
  if (pending) {
    syncPendingLocalAcknowledgement();
  }
}, { flush: 'sync' });

const setRequirement = (text: string) => {
  internalRequirement.value = text;
  nextTick(adjustTextareaHeight);
  // The exact AgentContext owns every unsent edit, including deliberate clearing.
  // Do not buffer local-only state past submission or verified context replacement.
  if (targetContext.value) {
    targetContext.value.requirement = text;
  }
};

const skillMenu = useSkillTagMenu({
  rootRef,
  textareaRef: textarea,
  context: targetContext,
  capability: toRef(props, 'skillTagging'),
  setText: setRequirement,
});

const mentionMenu = useRunMentionMenu({
  rootRef,
  textareaRef: textarea,
  context: targetContext,
  scope: computed(() => props.target?.mentionScope ?? null),
  getText: () => internalRequirement.value,
  setText: setRequirement,
});

const composerPlaceholder = computed(() => mentionMenu.available.value
  ? t('chat.mentions.placeholderMention')
  : props.skillTagging?.placeholder || props.placeholder
    || t('agentInput.components.agentInput.AgentUserInputTextArea.type_a_message'));
const activeMentionNames = computed(() => mentionsPresentInText(
  internalRequirement.value, targetContext.value?.requestedMentions,
).map((mention) => mention.name));
const mentionParts = computed(() => splitMentionText(internalRequirement.value, activeMentionNames.value));

/** One menu at a time: `@` takes the token when it matches, otherwise `/`. */
const detectMenus = () => {
  if (mentionMenu.detect()) {
    skillMenu.close();
    return;
  }
  skillMenu.detect();
};

const hasMenus = computed(() => Boolean(props.skillTagging) || mentionMenu.available.value);
/** The open menu, for the textarea's combobox semantics. */
const activeMenu = computed(() => {
  if (mentionMenu.open.value) {
    return { listId: mentionMenuListId, count: mentionMenu.filtered.value.length, highlight: mentionMenu.highlight.value };
  }
  if (props.skillTagging && skillMenu.open.value) {
    return { listId: skillMenuListId, count: skillMenu.filteredSkills.value.length, highlight: skillMenu.highlight.value };
  }
  return null;
});

const handleInput = (event: Event) => {
  setRequirement((event.target as HTMLTextAreaElement).value);
  nextTick(detectMenus);
};

const handleSend = async () => {
  const target = props.target;
  if (!target) {
    return;
  }
  let submittedContext: AgentContext | null = null;
  try {
    if (props.beforeSend) {
      await props.beforeSend();
    }
    submittedContext = target.context;
    pendingLocalAcknowledgementContext = submittedContext;
    const sendPromise = target.send();
    syncPendingLocalAcknowledgement();
    await sendPromise;
  } catch (error) {
    console.error('Error sending requirement:', error);
  } finally {
    if (pendingLocalAcknowledgementContext === submittedContext) {
      pendingLocalAcknowledgementContext = null;
    }
  }
};

const handleStop = () => {
  try {
    void props.target?.interrupt?.();
  } catch (error) {
    console.error('Error interrupting generation:', error);
  }
};

const handlePrimaryAction = () => {
  const action = primaryAction.value;
  if (isActionDisabled.value) {
    return;
  }
  if (action.kind === 'interrupt') {
    handleStop();
    return;
  }
  void handleSend();
};

const insertFilePaths = (
  filePaths: string[],
  insertionContext: AgentContext | null = targetContext.value,
) => {
  if (!insertionContext || filePaths.length === 0) return;

  const textToInsert = filePaths.join(' ');
  const isTargetStillActive = targetContext.value === insertionContext;
  const baseRequirement = isTargetStillActive ? internalRequirement.value : insertionContext.requirement;
  const start = isTargetStillActive && textarea.value ? textarea.value.selectionStart : baseRequirement.length;
  const end = isTargetStillActive && textarea.value ? textarea.value.selectionEnd : baseRequirement.length;
  const newText = baseRequirement.substring(0, start) + textToInsert + baseRequirement.substring(end);

  insertionContext.requirement = newText;

  if (!isTargetStillActive) {
    return;
  }

  internalRequirement.value = newText;
  nextTick(adjustTextareaHeight);

  nextTick(() => {
    if (textarea.value && targetContext.value === insertionContext) {
      const newCursorPos = start + textToInsert.length;
      textarea.value.focus();
      textarea.value.setSelectionRange(newCursorPos, newCursorPos);
    }
  });
};

const handleDrop = async (event: DragEvent) => {
  const dropContext = targetContext.value;
  if (!dropContext) return;
  insertFilePaths(await resolveDroppedFilePaths(event), dropContext);
};

const handleKeyDown = (event: KeyboardEvent) => {
  if (mentionMenu.onKeydown(event)) return;
  if (skillMenu.onKeydown(event)) return;
  if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.altKey) {
    event.preventDefault();
    handlePrimaryAction();
  }
};

const handleResize = () => {
  adjustTextareaHeight();
};

onMounted(() => {
  adjustTextareaHeight();
  textareaResizeObserver = new ResizeObserver(handleResize);
  if (textarea.value) textareaResizeObserver.observe(textarea.value);
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  textareaResizeObserver?.disconnect();
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped>
/* A single metric policy for native glyphs and their decorative backgrounds. */
.composer-text {
  box-sizing: border-box;
  padding: 10px 56px 10px 12px;
  font-family: inherit;
  font-size: 0.9375rem;
  line-height: 24px;
  letter-spacing: normal;
  tab-size: 8;
  text-align: start;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  word-break: normal;
}
.mention-mirror-viewport {
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden;
  pointer-events: none;
}
.mention-mirror {
  width: 100%;
  color: transparent;
}
.mention-highlight {
  background: #f0f9ff;
  box-shadow: inset 0 0 0 1px #bae6fd;
  border-radius: 4px;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}
@media (forced-colors: active) {
  /* Native controls may paint an opaque Canvas even with a transparent CSS background. */
  .mention-mirror-viewport { z-index: 1; }
  .mention-mirror { forced-color-adjust: none; }
  .mention-highlight { background: transparent; box-shadow: inset 0 0 0 1px Highlight; }
}
textarea {
  outline: none;
  overflow-y: hidden;
}
textarea::-webkit-scrollbar {
  width: 6px;
}
textarea::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.6);
  border-radius: 9999px;
}
textarea {
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.6) transparent;
}
</style>
