<template>
  <main class="flex min-h-screen items-center justify-center bg-white">
    <section v-if="ready" class="mt-52 w-[48rem] max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 p-3">
      <h1 class="mb-12 text-center text-2xl font-semibold">Workspace control — implementation preview</h1>
      <ChatWorkspaceMenu :workspace="workspace" @select="workspace = $event" />
    </section>
  </main>
</template>
<script setup lang="ts">
// Temporary implementation-only render fixture. Native reply and workspace data are controlled;
// no backend, model, real chooser or full-caller journey is exercised here.
import { onMounted, ref } from 'vue'
import ChatWorkspaceMenu from '~/components/chat/ChatWorkspaceMenu.vue'
import { useWorkspaceStore } from '~/stores/workspace'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { useLocalization } from '~/composables/useLocalization'
import type { RunWorkspaceChoice } from '~/types/runSettings/RunWorkspaceChoice'
definePageMeta({ layout: false })
const workspace = ref<RunWorkspaceChoice>({ kind: 'existing', workspaceId: 'temp_ws_default' })
const ready = ref(false)
const store = useWorkspaceStore()
const node = useWindowNodeContextStore()
const locale = useLocalization()
onMounted(async () => {
  const params = new URLSearchParams(location.search)
  await locale.setPreference(params.get('locale') === 'zh-CN' ? 'zh-CN' : 'en')
  store.workspaces = {
    temp_ws_default: { workspaceId: 'temp_ws_default', name: 'Temp Workspace', absolutePath: '/owned/temp', isTemp: true, workspaceConfig: {} },
    known: { workspaceId: 'known', name: 'implementation-workspace', absolutePath: '/owned/implementation-workspace', isTemp: false, workspaceConfig: {} },
  } as never
  if (params.get('context') !== 'browser') {
    window.electronAPI = { showFolderDialog: () => new Promise((resolve) => {
      (window as any).__folderPreviewReply = resolve
    }) } as Window['electronAPI']
  }
  if (params.get('context') === 'remote') node.bindNodeContext('preview-remote', 'http://127.0.0.1:9')
  ready.value = true
})
</script>
