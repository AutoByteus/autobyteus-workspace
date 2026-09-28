<template>
  <div class="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-300">
    <ContextFilePathInputArea :target="target" />
    <div class="border-t border-gray-100">
      <AgentUserInputTextArea :target="target" :before-send="beforeSend" />
    </div>
  </div>
</template>

<script setup lang="ts">
import ContextFilePathInputArea from '~/components/agentInput/ContextFilePathInputArea.vue';
import AgentUserInputTextArea from '~/components/agentInput/AgentUserInputTextArea.vue';
import { useComposerTarget } from '~/composables/agentInput/useComposerTarget';

defineProps<{
  beforeSend?: () => void | Promise<void>;
}>();

const target = useComposerTarget();
</script>
