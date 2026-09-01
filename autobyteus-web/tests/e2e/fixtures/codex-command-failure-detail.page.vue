<template>
  <main data-test="codex-command-failure-detail-probe" class="min-h-screen bg-slate-100 p-4 text-slate-900 sm:p-8">
    <header class="mx-auto mb-5 max-w-4xl rounded-lg bg-white p-4 shadow-sm">
      <h1 class="text-xl font-semibold">Codex command failure detail browser probe</h1>
      <p class="mt-1 text-sm text-slate-600">
        The existing center tool card and Activity card render one canonical failed-event error.
      </p>
    </header>

    <section class="mx-auto grid max-w-4xl gap-5 lg:grid-cols-2" aria-label="Failed command surfaces">
      <article data-test="center-surface" class="min-w-0 rounded-lg bg-white p-4 shadow-sm">
        <h2 class="mb-3 text-base font-semibold">Center tool card</h2>
        <ToolCallIndicator :presentation="presentation" />
      </article>

      <article data-test="activity-surface" class="min-w-0 rounded-lg bg-white p-4 shadow-sm">
        <h2 class="mb-3 text-base font-semibold">Activity panel</h2>
        <ToolActivityItem :activity="activity" />
      </article>
    </section>
  </main>
</template>

<script setup lang="ts">
import ToolCallIndicator from '~/components/conversation/ToolCallIndicator.vue';
import ToolActivityItem from '~/components/progress/ToolActivityItem.vue';
import type { ToolActivity } from '~/types/activity/RunActivity';
import {
  buildToolCardPresentation,
  type ToolCardSegment,
} from '~/utils/toolCardPresentation';

const diagnostic = 'first diagnostic line\nCODEX_FAILURE_STDERR_MARKER\nExit code: 23';
const invocationId = 'exec-command-failure-browser';
const command = "/bin/bash -lc 'printf CODEX_FAILURE_STDERR_MARKER >&2; exit 23'";
const cwd = '/workspace/command-failure';

const toolSegment: ToolCardSegment = {
  type: 'tool_call',
  invocationId,
  toolName: 'run_bash',
  arguments: { command, cwd },
  status: 'error',
  approvalTarget: null,
  logs: [],
  result: null,
  error: diagnostic,
};
const presentation = buildToolCardPresentation(toolSegment);

const activity: ToolActivity = {
  kind: 'tool',
  activityId: invocationId,
  invocationId,
  toolName: 'run_bash',
  type: 'terminal_command',
  status: 'error',
  contextText: command,
  arguments: { command, cwd },
  logs: [],
  result: null,
  error: diagnostic,
  timestamp: new Date('2026-09-01T12:00:00.000Z'),
};
</script>
