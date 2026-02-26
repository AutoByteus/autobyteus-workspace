<template>
  <div class="flex-1 overflow-y-auto p-6 space-y-4" ref="chatContainer">
    <div v-if="!teamContext && !error" class="flex flex-col items-center justify-center h-full text-gray-500">
      <span class="i-heroicons-sparkles-20-solid w-12 h-12 text-gray-400"></span>
      <h3 class="mt-2 text-lg font-medium">Socratic Math Teacher</h3>
      <p class="mt-1 text-sm text-center">Enter a problem below to start the conversation.</p>
    </div>
    <div v-else>
      <div v-for="(message, index) in messages" :key="index">
        <AppUserMessage v-if="message.type === 'user'" :message="message" />
        <AppAIMessage v-else-if="message.type === 'ai'" :message="message" />
      </div>
    </div>
    <div v-if="error" class="flex flex-col items-center justify-center bg-red-50 p-4 rounded-md h-full">
      <span class="i-heroicons-exclamation-triangle-20-solid w-12 h-12 text-red-500"></span>
      <h3 class="mt-2 text-lg font-bold text-red-800">An Error Occurred</h3>
      <p class="mt-1 text-sm text-red-700 text-center">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import type { Message, UserMessage as UserMessageType, AIMessage as AIMessageType } from '~/types/conversation';
import AppUserMessage from './AppUserMessage.vue';
import AppAIMessage from './AppAIMessage.vue';

const props = defineProps<{
  teamContext: AgentTeamContext | null;
  error: string | null;
}>();

const chatContainer = ref<HTMLDivElement | null>(null);

const messages = computed<(UserMessageType | AIMessageType)[]>(() => {
  if (!props.teamContext) return [];
  const coordinator = props.teamContext.members.get(props.teamContext.focusedMemberName);
  if (!coordinator) return [];
  
  // Filter for user and ai messages only
  return coordinator.state.conversation.messages.filter(
    (msg): msg is UserMessageType | AIMessageType => msg.type === 'user' || msg.type === 'ai'
  );
});

const scrollToBottom = () => {
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
  }
};

watch(messages, () => {
  nextTick(() => {
    scrollToBottom();
  });
}, { deep: true, immediate: true });
</script>
