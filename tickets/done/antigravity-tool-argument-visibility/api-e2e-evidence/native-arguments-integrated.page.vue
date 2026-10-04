<template>
  <main class="min-h-screen bg-slate-100 p-4">
    <h1 class="text-lg font-bold">Antigravity argument transport inspection</h1>
    <p data-test="state">{{ state }}</p>
    <p v-if="error" data-test="error">{{ error }}</p>
    <button data-test="reopen" @click="reopen">Reopen saved history</button>
    <div v-for="activity in tools" :key="activity.invocationId" :data-invocation="activity.invocationId" class="max-w-3xl">
      <ToolActivityItem :activity="activity" />
    </div>
  </main>
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import ToolActivityItem from '~/components/progress/ToolActivityItem.vue'
import { useAgentActivityStore } from '~/stores/agentActivityStore'
import { useAgentContextsStore } from '~/stores/agentContextsStore'
import { hydrateLiveRunContext } from '~/services/runHydration/runContextHydrationService'
import { AgentStreamingService } from '~/services/agentStreaming/AgentStreamingService'
import { createWorkspaceMetadata } from '~/utils/workspaceMetadata'
definePageMeta({ layout: false })
const route = useRoute()
const runId = String(route.query.runId || '')
const state = ref('loading')
const error = ref('')
const activities = useAgentActivityStore()
const contexts = useAgentContextsStore()
const tools = computed(() => activities.getToolActivities(runId))
let stream: AgentStreamingService | undefined
const reopen = () => { stream?.disconnect(); window.location.reload() }
onMounted(async () => {
  try {
    const candidate = await hydrateLiveRunContext({ runId, fallbackAgentName: 'Owned native probe',
      resolveWorkspaceMetadataByRootPath: async (rootPath) => createWorkspaceMetadata({
        workspaceId: 'owned-argument-inspection', workspaceRootPath: rootPath }) })
    if (candidate.resumeConfig.isActive) {
      stream = new AgentStreamingService(useRuntimeConfig().public.agentWsEndpoint)
      stream.connect(runId, contexts.getRun(runId)!)
      const deadline = Date.now() + 15000
      while (!stream.isReady && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 50))
      if (!stream.isReady) throw new Error('Owned stream failed to connect')
      state.value = 'live-ready'
    } else state.value = 'saved-ready'
  } catch (cause) { error.value = String(cause); state.value = 'error' }
})
onUnmounted(() => stream?.disconnect())
</script>
