<template>
  <div>
    <div class="flex items-start gap-3 pr-8">
      <div class="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-white border border-sky-200 flex items-center justify-center">
        <img
          v-if="showAvatarImage"
          :src="userAvatarUrl || ''"
          :alt="`${displayUserName} avatar`"
          class="h-full w-full object-cover"
          @error="avatarLoadError = true"
        />
        <svg
          v-else
          class="h-8 w-8 text-sky-600"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.86 0-7 2.24-7 5a1 1 0 1 0 2 0c0-1.42 2.22-3 5-3s5 1.58 5 3a1 1 0 1 0 2 0c0-2.76-3.14-5-7-5Z"
          />
        </svg>
      </div>

      <div class="min-w-0 flex-1 pt-0.5">
        <span class="sr-only">{{ displayUserName }}</span>

        <div class="whitespace-pre-wrap break-words text-gray-900 leading-6">{{ message.text }}</div>

        <div v-if="message.contextFilePaths && message.contextFilePaths.length > 0" class="mt-2">
          <p class="text-xs font-medium text-gray-500">Context files</p>
          <ul class="mt-1 flex flex-wrap gap-2">
            <li v-for="file in message.contextFilePaths" :key="file.path">
              <button
                type="button"
                @click="handleFileClick(file.path)"
                class="max-w-full text-xs px-2 py-1 rounded-md border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 truncate"
                :title="`Open ${file.path}`"
              >
                {{ file.path }}
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { UserMessage } from '~/types/conversation';
import { useFileExplorerStore } from '~/stores/fileExplorer';

import { useWorkspaceStore } from '~/stores/workspace';
const props = defineProps<{
  message: UserMessage;
  userDisplayName?: string;
  userAvatarUrl?: string | null;
}>();

const fileExplorerStore = useFileExplorerStore();
const workspaceStore = useWorkspaceStore();
const avatarLoadError = ref(false);

const displayUserName = computed(() => props.userDisplayName?.trim() || 'You');
const showAvatarImage = computed(() => Boolean(props.userAvatarUrl) && !avatarLoadError.value);

watch(() => props.userAvatarUrl, () => {
  avatarLoadError.value = false;
});

const handleFileClick = (filePath: string) => {
  const wsId = workspaceStore.activeWorkspace?.workspaceId;
  if(wsId) fileExplorerStore.openFile(filePath, wsId);
};
</script>

<style scoped>
</style>
