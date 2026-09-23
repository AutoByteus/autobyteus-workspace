<template>
  <main class="min-h-screen bg-slate-100 p-5 text-slate-900">
    <section class="mx-auto max-w-5xl rounded-xl border bg-white p-5 shadow-sm">
      <h1 class="text-lg font-semibold">Files metadata recovery — IR-003 implementation preview</h1>
      <p class="mt-1 text-sm text-slate-500">Real Files components and reactive registration; synthetic transport and tree stream, no backend/provider/project I/O.</p>
      <div class="my-4 flex flex-wrap gap-2">
        <button class="rounded border px-3 py-1" @click="target = null">Unavailable target</button>
        <button class="rounded border px-3 py-1" @click="recover('B')">Recover B metadata</button>
        <button class="rounded border px-3 py-1" @click="recover('C')">Recover C metadata</button>
        <button class="rounded border px-3 py-1 disabled:opacity-40" :disabled="!pending" @click="complete">Complete registration</button>
        <button class="rounded border px-3 py-1 disabled:opacity-40" :disabled="!pending" @click="fail">Reject registration</button>
      </div>
      <p class="mb-3 text-sm">Target: {{ target ?? 'unavailable' }} · Registration requests: {{ requests }} · Active leases: {{ leases }} · File reads: {{ reads }}</p>
      <div class="h-[480px] overflow-hidden rounded border"><FileExplorerLayout :workspace-id="target" /></div>
    </section>
  </main>
</template>
<script setup lang="ts">
import { onBeforeUnmount, ref, shallowRef } from 'vue'
import FileExplorerLayout from '~/components/fileExplorer/FileExplorerLayout.vue'
import { useWorkspaceStore } from '~/stores/workspace'
import { useFileExplorerStore } from '~/stores/fileExplorer'
import { TreeNode } from '~/utils/fileExplorer/TreeNode'
import { BOUND_APOLLO_CLIENT_KEY } from '~/plugins/30.apollo.client'
definePageMeta({ layout: false })
const target = ref<string | null>(null), requests = ref(0), leases = ref(0), reads = ref(0)
const pending = shallowRef<{ id: string; resolve: (value: unknown) => void; reject: (error: Error) => void } | null>(null)
const app = useNuxtApp() as any, originalClient = app[BOUND_APOLLO_CLIENT_KEY]
const workspace = useWorkspaceStore(), files = useFileExplorerStore()
const originalAcquire = workspace.acquireFileExplorerLiveSession
app[BOUND_APOLLO_CLIENT_KEY] = {
  mutate: ({ variables }: any) => {
    if (variables.input?.rootPath) {
      requests.value++
      return new Promise((resolve, reject) => { pending.value = { id: variables.input.rootPath.split('/').at(-1), resolve, reject } })
    }
    return Promise.resolve({ data: { writeFileContent: JSON.stringify({ changes: [] }) } })
  },
  query: () => { reads.value++; return Promise.resolve({ data: { fileContent: 'Recovered workspace file. Synthetic preview content; no filesystem access.' } }) },
}
workspace.acquireFileExplorerLiveSession = (id) => {
  leases.value++
  files._getOrCreateWorkspaceState(id).tree.children = [new TreeNode(`${id}.txt`, `${id}.txt`, true, [], `${id}-file`)]
  return () => { leases.value-- }
}
const recover = (id: string) => {
  workspace.cacheWorkspaceMetadata({ workspaceId: id, workspaceRootPath: `/preview/${id}`, displayName: id, kind: 'filesystem' })
  target.value = id
}
const complete = () => {
  const work = pending.value
  if (!work) return
  pending.value = null
  work.resolve({ data: { createWorkspace: { workspaceId: work.id, name: work.id, workspaceRootPath: `/preview/${work.id}`,
    absolutePath: `/preview/${work.id}`, config: { rootPath: `/preview/${work.id}` }, kind: 'filesystem' } } })
}
const fail = () => {
  const work = pending.value
  pending.value = null
  work?.reject(new Error('Synthetic registration unavailable — retry is safe.'))
}
onBeforeUnmount(() => { app[BOUND_APOLLO_CLIENT_KEY] = originalClient; workspace.acquireFileExplorerLiveSession = originalAcquire })
</script>
