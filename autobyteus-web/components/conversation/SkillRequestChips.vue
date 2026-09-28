<template>
  <div
    class="group/skills relative mb-1.5 flex flex-wrap gap-1.5 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
    data-test="skill-request-chips"
    tabindex="0"
    :aria-describedby="tooltipId"
  >
    <span
      v-for="name in skillNames"
      :key="name"
      class="inline-flex cursor-default items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-xs font-medium text-indigo-700"
    >
      <Icon icon="heroicons:sparkles" class="h-3.5 w-3.5" aria-hidden="true" />/{{ name }}
    </span>
    <div
      :id="tooltipId"
      role="tooltip"
      data-test="skill-request-sent-as"
      class="pointer-events-none absolute left-0 top-full z-20 mt-1.5 w-max max-w-md rounded-md bg-gray-900 px-2.5 py-2 text-xs leading-5 text-gray-100 opacity-0 shadow-lg transition-opacity duration-100 motion-reduce:transition-none group-hover/skills:opacity-100 group-focus/skills:opacity-100"
    >
      <span class="block text-[0.6875rem] font-medium uppercase tracking-wide text-gray-400">{{ $t('workspace.components.conversation.SkillRequestChips.sentToTheAgentAs') }}</span>
      <span class="block whitespace-pre-wrap break-words">{{ sentText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useId } from 'vue';
import { Icon } from '@iconify/vue';

defineProps<{
  skillNames: readonly string[];
  /** The exact content that was sent to the agent. */
  sentText: string;
}>();

const tooltipId = `skill-request-sent-as-${useId()}`;
</script>
