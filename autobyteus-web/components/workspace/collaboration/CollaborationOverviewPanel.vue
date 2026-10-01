<template>
  <div class="flex h-full flex-col overflow-hidden bg-white">
    <CollaborationMessagesSection :messages="messages" />
  </div>
</template>

<script setup lang="ts">
import type { CollaborationMessagesContextView } from '~/types/workspace/collaborationMessagesContextView'
import CollaborationMessagesSection from './CollaborationMessagesSection.vue'

defineProps<{
  messages: CollaborationMessagesContextView
}>()
</script>
