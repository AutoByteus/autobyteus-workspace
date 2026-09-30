<template>
  <div
    class="rounded-xl border border-gray-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-300"
    :class="hasMenus ? 'relative' : 'overflow-hidden'"
  >
    <!-- With a `/` or `@` menu, only the Context Files area clips, so the menu can open above the box. -->
    <div :class="hasMenus ? 'overflow-hidden rounded-t-xl' : ''">
      <ContextFilePathInputArea :target="target" />
    </div>
    <div class="border-t border-gray-100" :class="hasMenus ? 'rounded-b-xl' : ''">
      <MentionChipRow :chips="mentionChips" @remove="removeMention" />
      <div
        v-if="skillTagging && requestedSkillNames.length"
        class="flex flex-wrap items-center gap-1.5 px-3 pt-2.5"
        data-test="agent-input-skill-chips"
      >
        <SkillTagChips :names="requestedSkillNames" @remove="removeSkill" />
      </div>
      <AgentUserInputTextArea :target="target" :before-send="beforeSend" :skill-tagging="skillTagging" />
    </div>
  </div>
</template>

<script setup lang="ts">
import ContextFilePathInputArea from '~/components/agentInput/ContextFilePathInputArea.vue';
import AgentUserInputTextArea from '~/components/agentInput/AgentUserInputTextArea.vue';
import SkillTagChips from '~/components/chat/SkillTagChips.vue';
import MentionChipRow from '~/components/agentInput/MentionChipRow.vue';
import { removeRunMentionChip, runMentionChipsOf, type RunMentionChip } from '~/composables/agentInput/useRunMentionMenu';
import { computed } from 'vue';
import { useComposerTarget } from '~/composables/agentInput/useComposerTarget';
import type { SkillTaggingCapability } from '~/composables/agentInput/useSkillTagMenu';

const props = defineProps<{
  beforeSend?: () => void | Promise<void>;
  /** `/` skill tags and their chip row; supplied only for standalone agent runs. */
  skillTagging?: SkillTaggingCapability | null;
}>();

const target = useComposerTarget();
const requestedSkillNames = computed(() => target.value?.context.requestedSkillNames ?? []);
const hasMenus = computed(() => Boolean(props.skillTagging) || Boolean(target.value?.mentionScope));
const mentionChips = computed(() => (target.value?.mentionScope ? runMentionChipsOf(target.value.context) : []));
const removeMention = (chip: RunMentionChip) => {
  const context = target.value?.context;
  if (context) removeRunMentionChip(context, chip);
};
const removeSkill = (name: string) => {
  const context = target.value?.context;
  if (!context) return;
  context.requestedSkillNames = context.requestedSkillNames.filter((entry) => entry !== name);
};
</script>
