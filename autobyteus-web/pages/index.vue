<template>
  <MobileRemoteAccessShell v-if="isMobileRuntime" />
  <div v-else class="flex items-center justify-center h-screen bg-gray-100">
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
      <p class="mt-4 text-gray-600">{{ $t('shell.pages.index.redirecting_to_agent_management') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import MobileRemoteAccessShell from '~/components/mobile/MobileRemoteAccessShell.vue';
import { isMobileRemoteAccessRuntime } from '~/utils/remoteAccess/mobileRuntime';

definePageMeta({
  layout: false,
});

const isMobileRuntime = computed(() => isMobileRemoteAccessRuntime());

onMounted(() => {
  if (!isMobileRuntime.value) {
    navigateTo('/agents', { replace: true });
  }
});
</script>
