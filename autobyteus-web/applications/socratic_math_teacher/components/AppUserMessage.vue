<template>
  <div class="p-4 bg-gray-100 rounded-lg">
    <div v-if="message.contextFilePaths && message.contextFilePaths.length > 0">
      <strong>Context Files:</strong>
      <ul class="list-disc list-inside text-sm">
        <li v-for="file in message.contextFilePaths" :key="file.path">
          <span>{{ file.path }}</span>
        </li>
      </ul>
    </div>
    <div class="mt-2">
      <strong>You:</strong>
      <div class="whitespace-pre-wrap">{{ message.text }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UserMessage } from '~/types/conversation';

defineProps<{
  message: UserMessage;
}>();
</script>
