<template>
  <div class="p-6" style="max-width: 760px">
    <div data-test="probe-card"><SystemTaskNotificationSegment :segment="segment" /></div>
    <pre data-test="probe-segment-content">{{ segment.content }}</pre>
  </div>
</template>
<script setup lang="ts">
import SystemTaskNotificationSegment from '~/components/conversation/segments/SystemTaskNotificationSegment.vue';
const segment = {
  type: 'system_task_notification' as const,
  senderId: 'system.restart_resume',
  content: [
    '[Platform notice — application restarted]',
    '',
    'The application restarted at 2026-11-18 05:41 UTC (reason: a restart).',
    'If you started any background tasks, the restart stopped them. Check what you still need: restart it, or continue your work.',
  ].join('\n'),
};
</script>
