<template>
  <!-- The Chat box is the product's existing message box (frame, Context Files area, textarea,
       mic and send) plus the Chat features: chips, `/` and `@`, and the footer row (DEC-014). -->
  <div
    class="relative rounded-xl border border-gray-200 bg-white shadow-sm focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-500/20"
    data-test="chat-composer"
  >
    <div class="overflow-hidden rounded-t-xl">
      <ContextFilePathInputArea :target="target" />
    </div>

    <div class="border-t border-gray-100">
      <div class="flex flex-col bg-white">
        <div v-if="hasChips()" class="flex flex-wrap items-center gap-1.5 px-3 pt-2.5" data-test="chat-composer-chips">
          <slot name="chips" />
          <SkillTagChips :names="requestedSkillNames" @remove="removeSkill" />
        </div>

        <ChatMessageInput
          ref="inputRef"
          :context="target?.context ?? null"
          :placeholder="placeholder"
          :disabled="starting || target?.access === 'read_only'"
          :skill-options="skillOptions"
          :skills-all-installed="skillsAllInstalled"
          :mention-source="mentionSource"
          :autofocus="autofocus"
          @submit="activatePrimaryAction"
        />

        <VoiceInputStatusRow class="mx-3 mb-2" />
      </div>
    </div>

    <!-- Footer: what can still change for this chat. Left: workspace and approval (New chat only). -->
    <div class="flex flex-wrap items-center gap-0.5 rounded-b-xl border-t border-gray-100 bg-white px-2 py-1.5" data-test="chat-composer-footer">
      <slot name="footer-left" />
      <!-- min-w-0: a long model name truncates so Send always stays inside the box. -->
      <div class="ml-auto flex min-w-0 max-w-full items-center gap-0.5">
        <slot name="footer-right" />
        <span class="w-1" aria-hidden="true"></span>
        <VoiceInputButton class="flex-shrink-0" :target="voiceTarget" compact />
        <MessagePrimaryActionButton
          class="flex-shrink-0"
          data-test="chat-primary-action"
          compact
          :kind="primaryKind"
          :disabled="primaryDisabled"
          :busy="starting"
          :title="primaryTitle"
          @activate="activatePrimaryAction"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useSlots } from 'vue'
import ContextFilePathInputArea from '~/components/agentInput/ContextFilePathInputArea.vue'
import { useComposerVoiceTarget } from '~/composables/voiceInput/useComposerVoiceTarget';
import VoiceInputButton from '~/components/voiceInput/VoiceInputButton.vue'
import VoiceInputStatusRow from '~/components/agentInput/VoiceInputStatusRow.vue'
import MessagePrimaryActionButton from '~/components/agentInput/MessagePrimaryActionButton.vue'
import ChatMessageInput from '~/components/chat/ChatMessageInput.vue'
import SkillTagChips from '~/components/chat/SkillTagChips.vue'
import type { MentionCandidateSource } from '~/composables/runSettings/useMentionCandidates'
import type { SkillTagOption } from '~/utils/skills/skillTagMenu'
import type { ComposerTarget } from '~/composables/agentInput/useComposerTarget'
import { useContextFileUploadStore } from '~/stores/contextFileUploadStore'
import { useToasts } from '~/composables/useToasts'
import { hasSendableDraft, resolveAgentPrimaryAction } from '~/services/runSubmission/agentPrimaryAction'
import { AgentStatus } from '~/types/agent/AgentStatus'

const props = withDefaults(defineProps<{
  target: ComposerTarget | null
  placeholder: string
  skillOptions: SkillTagOption[] | null
  skillsAllInstalled?: boolean
  /** Where `@` candidates come from; null when `@` is not offered. */
  mentionSource?: MentionCandidateSource | null
  /** The first send of a New chat is in flight. */
  starting?: boolean
  /** Why the draft cannot be sent (e.g. its runtime is unavailable); labels the disabled send button. */
  sendBlockedReason?: string | null
  autofocus?: boolean
}>(), {
  skillsAllInstalled: false,
  mentionSource: null,
  starting: false,
  sendBlockedReason: null,
  autofocus: false,
})

const slots = useSlots()
const inputRef = ref<InstanceType<typeof ChatMessageInput> | null>(null)
const contextFileUploadStore = useContextFileUploadStore()

const requestedSkillNames = computed(() => props.target?.context.requestedSkillNames ?? [])
// Slots are not reactive: evaluate at render time.
const hasChips = () => requestedSkillNames.value.length > 0 || Boolean(slots.chips)

const primaryAction = computed(() => {
  const context = props.target?.context
  return resolveAgentPrimaryAction({
    hasContext: Boolean(context),
    status: context?.state.currentStatus ?? AgentStatus.Offline,
    submissionPending: context?.submissionPending ?? false,
    isUploading: contextFileUploadStore.isUploading,
    // Send is enabled by text or a skill tag; context files alone are not sendable.
    hasDraft: context ? hasSendableDraft(context) : false,
  })
})
const primaryKind = computed(() => (primaryAction.value.kind === 'interrupt' ? 'interrupt' : 'send'))
const primaryDisabled = computed(() => props.starting
  || !primaryAction.value.enabled
  || props.target?.access === 'read_only'
  || (primaryAction.value.kind === 'send' && Boolean(props.sendBlockedReason)))
const primaryTitle = computed(() => (primaryKind.value === 'send' && props.sendBlockedReason ? props.sendBlockedReason : null))

const removeSkill = (name: string) => {
  const context = props.target?.context
  if (!context) return
  context.requestedSkillNames = context.requestedSkillNames.filter((entry) => entry !== name)
  inputRef.value?.focus()
}

const activatePrimaryAction = async () => {
  const target = props.target
  if (!target || primaryDisabled.value) return
  try {
    if (primaryAction.value.kind === 'interrupt') {
      await target.interrupt?.()
      return
    }
    await target.send()
  } catch (error) {
    console.error('Chat send failed:', error)
    useToasts().addToast(error instanceof Error && error.message ? error.message : String(error), 'error')
  }
}

defineExpose({ focus: () => inputRef.value?.focus() })
const voiceTarget = useComposerVoiceTarget(() => props.target);
</script>
