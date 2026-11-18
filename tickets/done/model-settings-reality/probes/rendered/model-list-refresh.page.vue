<template>
  <main data-test="model-list-refresh-probe" class="min-h-screen bg-slate-100 p-6 text-slate-900">
    <p data-test="picked" class="mb-4 text-sm text-slate-600">{{ picked || 'nothing picked' }}</p>
    <div class="flex flex-wrap items-end gap-12" style="min-height: 560px">
      <section data-test="chat-host" class="w-[22rem]">
        <p class="mb-2 text-xs font-medium text-slate-500">Chat model menu</p>
        <ChatModelMenu
          runtime-kind="claude_agent_sdk"
          :llm-model-identifier="current"
          :model-label="current"
          placement="auto"
          align="left"
          @select="onSelect"
        />
      </section>
      <section data-test="launch-host" class="w-[26rem] rounded-lg bg-white p-4 shadow-sm">
        <p class="mb-2 text-xs font-medium text-slate-500">Launch config picker (definition default)</p>
        <RuntimeModelConfigFields
          runtime-kind="claude_agent_sdk"
          :llm-model-identifier="launchModel"
          :llm-config="null"
          @update:llm-model-identifier="launchModel = $event"
        />
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ChatModelMenu from '~/components/chat/ChatModelMenu.vue'
import RuntimeModelConfigFields from '~/components/launch-config/RuntimeModelConfigFields.vue'

definePageMeta({ layout: false })

const current = ref('opus')
const launchModel = ref('opus')
const picked = ref('')
const onSelect = (value: { runtimeKind: string; llmModelIdentifier: string }) => {
  picked.value = `${value.runtimeKind}:${value.llmModelIdentifier}`
  current.value = value.llmModelIdentifier
}
</script>
