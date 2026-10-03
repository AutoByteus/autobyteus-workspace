<template>
  <main class="min-h-screen bg-gray-100 p-4 text-gray-900">
    <section class="mx-auto max-w-lg" data-test="native-arguments-preview">
      <h1 class="mb-3 text-lg font-semibold">Native argument presentation — local self-check</h1>
      <nav class="mb-3 flex flex-wrap gap-2">
        <button v-for="candidate in modes" :key="candidate" class="rounded border bg-white px-3 py-1 text-sm" @click="mode = candidate">{{ candidate }}</button>
      </nav>
      <p class="mb-2 text-sm">{{ mode }} (controlled component fixture; not a server/native acceptance run)</p>
      <ToolActivityItem :key="mode" :activity="activity" />
    </section>
  </main>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue';
import ToolActivityItem from '~/components/progress/ToolActivityItem.vue';
import type { ToolActivity } from '~/types/activity/RunActivity';
definePageMeta({ layout: false });
const modes = ['Live', 'Saved', 'Summary fallback', 'Old history'] as const;
const mode = ref<typeof modes[number]>('Live');
const full = { TargetFile: '/owned/same.txt', TargetContent: 'before\nsecond line\n', ReplacementContent: 'after\n🙂\n',
  StartLine: 0, EndLine: 2, AllowMultiple: false, Instruction: '', Includes: ['*.txt', ''], metadata: { enabled: false, count: 0 } };
const activity = computed<ToolActivity>(() => ({ kind: 'tool', activityId: 'agy-tool-preview-turn-6',
  invocationId: 'agy-tool-preview-turn-6', timestamp: new Date(0), toolName: 'replace_file_content', type: 'tool_call',
  status: mode.value === 'Live' ? 'executing' : 'success', contextText: 'replace_file_content',
  arguments: mode.value === 'Live' || mode.value === 'Saved' ? full : { TargetFile: full.TargetFile },
  logs: [], result: mode.value === 'Live' ? null : { provider_state: 'DONE', output: null }, error: null }));
</script>
