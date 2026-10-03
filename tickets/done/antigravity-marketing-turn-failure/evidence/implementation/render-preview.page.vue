<template>
  <main class="min-h-screen bg-slate-50 p-6 text-slate-900">
    <section class="mx-auto max-w-2xl">
      <h1 class="text-xl font-semibold">Runtime error preview — test-owned data</h1>
      <nav class="my-4 flex flex-wrap gap-2" aria-label="Preview cases">
        <button v-for="item in cases" :key="item.name" :data-case="item.name"
          class="rounded border border-slate-400 bg-white px-3 py-2 focus:ring-2 focus:ring-blue-500"
          @click="select(item)">{{ item.name }}</button>
      </nav>
      <p class="text-sm">Previously completed tool output remains saved.</p>
      <ErrorSegment v-if="segment" :segment="segment" />
      <ErrorSegment :segment="{ type: 'error', message: 'Provider note available.', details: '<script>alert(1)</script> Inert detail text.' }" />
    </section>
  </main>
</template>
<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import ErrorSegment from '~/components/conversation/segments/ErrorSegment.vue';
import { handleError } from '~/services/agentStreaming/handlers/agentStatusHandler';
import type { AgentContext } from '~/types/agent/AgentContext';
import type { ErrorPayload } from '~/services/agentStreaming/protocol/messageTypes';
import type { ErrorSegment as ErrorSegmentModel } from '~/types/segments';

definePageMeta({ layout: false });
const cases = ref<Array<{ name: string; payload: ErrorPayload }>>([]);
const context = reactive({ state: { runId: 'render-owned-run' }, conversation: { messages: [] } });
const select = (item: { name: string; payload: ErrorPayload }) => {
  context.conversation.messages = [];
  handleError(item.payload, context as unknown as AgentContext);
};
const segment = computed(() => context.conversation.messages[0]?.segments[0] as ErrorSegmentModel | undefined);
onMounted(async () => {
  cases.value = await $fetch('/implementation-runtime-error-payloads.json');
  select(cases.value[0]);
});
</script>
