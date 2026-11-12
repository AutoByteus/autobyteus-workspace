<template>
  <!-- Activity (UIS-007, VIS-012, 013): the open agent's background tasks (autobyteus-473) and tool calls. -->
  <section class="fixed inset-0 z-20 flex h-[100dvh] flex-col bg-white text-slate-900" data-testid="mobile-activity">
    <MobileScreenBar title="Activity" @back="$emit('back')" />
    <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
      <!-- Shown when the agent has any; a runtime that does not report background tasks shows none (REQ-004). -->
      <MobileBackgroundTasks v-if="backgroundTasks.length" :tasks="backgroundTasks" />
      <p v-if="!activities.length && !backgroundTasks.length" class="px-4 py-10 text-center text-sm text-slate-500" data-testid="mobile-activity-empty">No activity yet</p>
      <MobileRunActivityItem
        v-for="activity in activities"
        :key="activity.activityId"
        :activity="activity"
        :runtime-kind="target.context.config.runtimeKind ?? null"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import MobileScreenBar from '~/components/mobile/MobileScreenBar.vue';
import MobileRunActivityItem from '~/components/mobile/views/MobileRunActivityItem.vue';
import MobileBackgroundTasks from '~/components/mobile/views/MobileBackgroundTasks.vue';
import { useBackgroundTaskPanelView } from '~/composables/useBackgroundTaskPanelView';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import type { ActiveAgentWorkspaceTarget } from '~/types/workspace/activeAgentWorkspaceTarget';

const props = defineProps<{ target: ActiveAgentWorkspaceTarget }>();
defineEmits<{ (event: 'back'): void }>();

const activityStore = useAgentActivityStore();
const runId = computed(() => props.target.context.state.runId);
const activities = computed(() => activityStore.getActivities(runId.value));
// The desktop panel's source (REQ-002), read while Activity is open; it also brings tasks started before (REQ-003).
const { tasks: backgroundTasks } = useBackgroundTaskPanelView(runId, computed(() => true));
</script>
