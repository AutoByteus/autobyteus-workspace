<template>
  <!-- Desktop fixture (autobyteus-585 AC-005): the founder's conversation drawn by the real feed. The agent's turn ends
       with a tool card, the restart reminder wakes it, and it replies. Installed into pages/ by
       notice-row-presentation-probe.mjs only while the probe runs. -->
  <main class="mx-auto max-w-3xl p-6" data-test="notice-row-probe">
    <div class="h-[720px] rounded-xl border border-gray-200">
      <AgentConversationFeed :conversation="conversation" run-id="notice-row-run" agent-name="Builder" />
    </div>
  </main>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import AgentConversationFeed from '~/components/workspace/agent/AgentConversationFeed.vue';
import type { Conversation } from '~/types/conversation';
// The feed's stylesheet, as its only product parent (AgentEventMonitor.vue) loads it on the desktop and the phone.
import '~/assets/css/phone-conversation.css';

// Only the feed: no app shell, which would call a node this fixture does not have.
definePageMeta({ layout: false });

const conversation = reactive<Conversation>({
  id: 'notice-row-run',
  createdAt: '2026-11-21T07:00:00.000Z',
  updatedAt: '2026-11-21T07:40:00.000Z',
  messages: [
    { type: 'user', text: 'Rebuild the app and tell me when it is done.', timestamp: new Date('2026-11-21T07:20:00Z'), messageId: 'user-1' },
    {
      type: 'ai', text: '', timestamp: new Date('2026-11-21T07:21:00Z'), isComplete: true, completionTokens: 1840, completionCost: 0.0184,
      segments: [
        { type: 'text', content: 'Starting the build in the background; I will check on it when it finishes.' },
        {
          type: 'terminal_command', invocationId: 'bash-1', toolName: 'run_bash', arguments: { command: 'pnpm build', run_in_background: true },
          status: 'success', logs: [], result: { status: 'running' }, error: null, command: 'pnpm build', description: 'Build the app',
        },
        {
          type: 'system_task_notification', senderId: 'system.restart_resume', messageId: 'restart-1',
          content: [
            '[Platform notice — application restarted]',
            '',
            'The application restarted at 2026-11-21 07:32 UTC (reason: a restart). Background commands you started before it were stopped. Continue your task.',
          ].join('\n'),
        },
        { type: 'text', content: 'The restart stopped my build. I have stopped and am waiting for you before I start it again.' },
      ],
    },
  ],
});
</script>
