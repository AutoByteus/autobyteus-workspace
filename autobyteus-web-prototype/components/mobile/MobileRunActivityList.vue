<template>
  <section class="space-y-2" data-testid="mobile-run-activity-list">
    <article v-if="!runId" class="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
      Select a run to see run activity history.
    </article>
    <article v-else-if="!activities.length" class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
      No run activity has been recorded for this run yet.
    </article>
    <template v-else>
      <MobileRunActivityItem
        v-for="activity in activities.slice(0, 10)"
        :key="activity.activityId"
        :activity="activity"
        :runtime-kind="runtimeKind"
      />
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue';
import { useMobileFocusedRunIdentity } from '~/composables/mobile/useMobileFocusedRunIdentity';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import type { MobileWorkContext } from '~/types/mobileWork';
import MobileRunActivityItem from '~/components/mobile/MobileRunActivityItem.vue';

const props = defineProps<{
  context: MobileWorkContext | null;
}>();

const activityStore = useAgentActivityStore();
const { focusedRunId: runId, focusedAgentContext } = useMobileFocusedRunIdentity(toRef(props, 'context'));
const runtimeKind = computed(() => focusedAgentContext.value?.config.runtimeKind ?? null);
const activities = computed(() => {
  return runId.value ? activityStore.getActivities(runId.value) : [];
});
</script>
