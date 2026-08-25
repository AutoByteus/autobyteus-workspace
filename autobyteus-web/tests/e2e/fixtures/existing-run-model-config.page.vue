<template>
  <main data-test="existing-run-model-config-probe" class="min-h-screen bg-slate-100 p-4 text-slate-900">
    <section class="mx-auto flex min-h-[760px] max-w-[760px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <header class="border-b border-slate-200 px-4 py-3">
        <h1 class="text-lg font-semibold">Stopped run model-settings fixture</h1>
        <p class="mt-1 text-sm text-slate-600">Actual Settings editor with deterministic GraphQL boundaries.</p>
        <div class="mt-3 flex gap-2">
          <button data-test="show-agent" type="button" class="rounded bg-indigo-600 px-3 py-2 text-sm text-white" @click="selectAgent">
            Agent settings
          </button>
          <button data-test="show-team" type="button" class="rounded bg-indigo-600 px-3 py-2 text-sm text-white" @click="selectTeam">
            Team settings
          </button>
        </div>
      </header>
      <div data-test="editor-host" class="flex min-h-0 flex-1 flex-col">
        <ExistingRunConfigEditor />
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import ExistingRunConfigEditor from '~/components/workspace/config/ExistingRunConfigEditor.vue'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentSelectionStore } from '~/stores/agentSelectionStore'

definePageMeta({ layout: false })

const selection = useAgentSelectionStore()
const definitions = useAgentDefinitionStore()

const selectAgent = () => selection.setRunSelection('agent-run-browser-1', 'agent')
const selectTeam = () => selection.setRunSelection('team-run-browser-1', 'team')

type ExistingRunModelConfigProbeControl = {
  selectAgent: () => void
  selectTeam: () => void
}

onMounted(() => {
  definitions.agentDefinitions = [{
    id: 'agent-definition-browser-1',
    name: 'Browser Probe Agent',
    role: 'Validator',
    description: 'Deterministic stopped-run Settings fixture.',
    instructions: 'Exercise the real existing-run model-settings editor.',
    category: 'Testing',
    avatarUrl: null,
    toolNames: [],
    inputProcessorNames: [],
    llmResponseProcessorNames: [],
    toolExecutionResultProcessorNames: [],
    toolInvocationPreprocessorNames: [],
    lifecycleProcessorNames: [],
    skillNames: [],
    defaultLaunchConfig: null,
  }]

  const globalWindow = window as typeof window & {
    __existingRunModelConfigProbe?: ExistingRunModelConfigProbeControl
  }
  globalWindow.__existingRunModelConfigProbe = { selectAgent, selectTeam }
  selectAgent()
})

onBeforeUnmount(() => {
  const globalWindow = window as typeof window & {
    __existingRunModelConfigProbe?: ExistingRunModelConfigProbeControl
  }
  delete globalWindow.__existingRunModelConfigProbe
})
</script>
