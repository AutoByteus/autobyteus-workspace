<template>
  <div class="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-300">
    <ContextFilePathInputArea />
    <div class="border-t border-gray-100">
      <AgentUserInputTextArea />
    </div>
  </div>
</template>

<script setup lang="ts">
import ContextFilePathInputArea from '~/components/agentInput/ContextFilePathInputArea.vue';
import AgentUserInputTextArea from '~/components/agentInput/AgentUserInputTextArea.vue';
</script>
