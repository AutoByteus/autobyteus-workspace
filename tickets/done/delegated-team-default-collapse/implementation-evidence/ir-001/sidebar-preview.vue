<template>
  <main class="min-h-screen bg-gray-100 p-6 text-gray-800">
    <h1 class="mb-4 text-xl font-semibold">Project Task Manager — local sidebar preview</h1>
    <div class="flex gap-5">
      <aside class="w-[360px] rounded border bg-white p-2">
        <button class="w-full rounded p-2 text-left text-sm font-medium hover:bg-gray-50" data-preview="host" @click="openHost">Project Task Manager</button>
        <AgentRunTaskRows v-if="opened" run-id="host-run" label="Project Task Manager" :run-selected="true" :has-collaboration="true" @select-run="selections++" />
      </aside>
      <section class="rounded border bg-white p-4"><h2 class="font-medium">Selected conversation target</h2><p data-preview="selected" class="mt-2 text-sm">{{ collaboration.selectedChild('host-run') || 'host-run' }}</p></section>
    </div>
  </main>
</template>
<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import AgentRunTaskRows from '~/components/workspace/history/AgentRunTaskRows.vue'
import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore'
import { multiTeamView } from '~/services/agentCollaboration/__tests__/agentRootMultiTeamFixture'
definePageMeta({ layout: false })
const collaboration = useAgentRunCollaborationStore()
const opened = ref(false), selections = ref(0)
const openHost = () => { opened.value = true; collaboration.selectChild('host-run', null) }
onMounted(() => { (window as any).__sidebarPreview = { view: multiTeamView(), refresh: () => collaboration.inspect('host-run'), state: () => ({ selections: selections.value, rows: collaboration.taskRows('host-run').map(item => item.row.rowKey), error: collaboration.errors['host-run'] }) } })
onBeforeUnmount(() => { delete (window as any).__sidebarPreview })
</script>
