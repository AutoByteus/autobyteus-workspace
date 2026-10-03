<template>
  <main class="min-h-screen bg-slate-100 p-4">
    <h1 class="mb-4 text-lg font-semibold">Mobile approval — implementation self-check</h1>
    <label class="mb-4 block">Runtime
      <select id="preview-runtime" v-model="runtime" class="ml-2 rounded border p-2">
        <option value="autobyteus">AutoByteus</option>
        <option value="antigravity_cli">Antigravity CLI</option>
      </select>
    </label>
    <section class="mb-5" data-check="agent">
      <h2 class="mb-2 text-sm font-semibold">Fresh Agent</h2>
      <MobileLaunchRunOptionsCard :auto-execute-tools="agent.autoExecuteTools" :runtime-kind="runtime"
        @update:auto-execute-tools="agent.autoExecuteTools = $event" />
    </section>
    <section data-check="team">
      <h2 class="mb-2 text-sm font-semibold">Fresh Team</h2>
      <MobileLaunchRunOptionsCard :auto-execute-tools="team.rootConfig.autoExecuteTools" :runtime-kind="runtime"
        @update:auto-execute-tools="team.rootConfig.autoExecuteTools = $event" />
    </section>
  </main>
</template>
<script setup lang="ts">
import { reactive, ref } from 'vue'
import MobileLaunchRunOptionsCard from '~/components/mobile/MobileLaunchRunOptionsCard.vue'
import { buildAgentRunTemplate, buildTeamRunTemplate } from '~/composables/useDefinitionLaunchDefaults'
definePageMeta({ layout: false })
const agent = reactive(buildAgentRunTemplate({ id: 'preview-agent', name: 'Preview Agent' }))
const team = reactive(buildTeamRunTemplate({ id: 'preview-team', name: 'Preview Team' }))
const runtime = ref('autobyteus')
</script>
