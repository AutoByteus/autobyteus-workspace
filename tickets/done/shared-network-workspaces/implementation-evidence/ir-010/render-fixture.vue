<template>
  <main class="bg-slate-100 p-4 h-screen flex flex-col gap-3">
    <header><h1 class="text-xl font-semibold">Editor draft refresh — implementation fixture</h1>
      <p class="text-sm text-slate-600">Real file tabs, viewer and Monaco; controlled committed-content transport.</p>
      <div class="flex gap-4 py-2">
        <button @click="refresh">Receive peer modification</button>
        <button @click="reopen">Reopen current file</button>
        <button @click="mounted = !mounted">Toggle Files surface</button>
        <button @click="store.setActiveFile('other.md', workspaceId)">Other file</button>
        <button @click="store.setActiveFile('notes.md', workspaceId)">Notes file</button>
      </div>
    </header>
    <section class="flex-1 min-h-0"><FileExplorerTabs v-if="mounted" :workspace-id="workspaceId" /></section>
  </main>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import FileExplorerTabs from '~/components/fileExplorer/FileExplorerTabs.vue'
import { useFileExplorerStore } from '~/stores/fileExplorer'
import { TreeNode } from '~/utils/fileExplorer/TreeNode'
definePageMeta({ layout: false })
const store = useFileExplorerStore(), workspaceId = 'ir010-owned-fixture', mounted = ref(true)
const state = store._getOrCreateWorkspaceState(workspaceId)
for (const path of ['notes.md', 'other.md']) {
  const node = new TreeNode(path, path, true, [], path)
  state.tree.addChild(node); state.nodeIdToNode[node.id] = node
}
await store.openFile('notes.md', workspaceId)
await store.openFile('other.md', workspaceId)
store.setActiveFile('notes.md', workspaceId)
const refresh = () => store.handleFileSystemChange(workspaceId, {
  changes: [{ type: 'modify', node_id: state.activeFile!, parent_id: state.tree.id }],
})
const reopen = () => store.openFile(state.activeFile!, workspaceId)
</script>
