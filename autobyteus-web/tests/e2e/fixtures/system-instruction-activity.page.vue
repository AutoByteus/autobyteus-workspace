<template>
  <main data-test="system-instruction-probe" class="min-h-screen bg-slate-100 p-4 text-slate-900 sm:p-8">
    <header class="mx-auto mb-5 max-w-4xl rounded-lg bg-white p-4 shadow-sm">
      <h1 class="text-xl font-semibold">System instruction Activity browser probe</h1>
      <p class="mt-1 text-sm text-slate-600">Production component; standalone/team runtime labels share this renderer.</p>
    </header>
    <section class="mx-auto max-w-4xl" aria-label="System instruction runtime examples">
      <div v-for="fixture in fixtures" :key="fixture.id" :data-runtime="fixture.runtimeKind ?? 'unknown'">
        <SystemInstructionActivityItem
          :activity="fixture.activity"
          :runtime-kind="fixture.runtimeKind"
        />
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import SystemInstructionActivityItem from '~/components/progress/SystemInstructionActivityItem.vue';
import type { SystemInstructionActivity } from '~/types/activity/RunActivity';

const exactContent = 'first line\n\n  indented line\nemoji: 🧪\nfinal line';
const longToken = `LONG_TOKEN_${'x'.repeat(4096)}_END`;
const at = new Date('2026-08-20T12:34:56.000Z');
const activity = (id: string, content: string): SystemInstructionActivity => ({
  kind: 'system_instruction',
  activityId: id,
  timestamp: at,
  content,
});

const fixtures: Array<{
  id: string;
  runtimeKind: string | null;
  activity: SystemInstructionActivity;
}> = [
  { id: 'native', runtimeKind: 'autobyteus', activity: activity('browser-native', exactContent) },
  { id: 'claude', runtimeKind: 'claude_agent_sdk', activity: activity('browser-claude', exactContent) },
  { id: 'codex', runtimeKind: 'codex_app_server', activity: activity('browser-codex', `${exactContent}\n${longToken}`) },
  { id: 'unknown', runtimeKind: null, activity: activity('browser-unknown', exactContent) },
];
</script>
