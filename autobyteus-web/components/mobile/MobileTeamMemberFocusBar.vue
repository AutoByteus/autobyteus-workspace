<template>
  <section
    v-if="context?.kind === 'team-run'"
    class="shrink-0 border-b border-blue-100 bg-blue-50 px-4 py-2"
    data-testid="mobile-team-member-focus-bar"
    aria-label="Message target"
  >
    <MobileLaunchTargetPicker
      v-if="memberItems.length > 0"
      :model-value="focusedAgentRunId"
      label="Message target"
      placeholder="Choose a member"
      :items="memberItems"
      test-id="mobile-team-focus-select"
      :show-label="false"
      item-noun="members"
      toggle-variant="chevron"
      @update:model-value="handleFocusChange"
    />
    <div
      v-else
      class="rounded-2xl border border-blue-200 bg-white p-3"
      data-testid="mobile-team-focus-empty"
      aria-label="Message target"
    >
      <p class="text-xs text-amber-700">No team member is available for direct mobile messages.</p>
    </div>

    <p v-if="error" class="mt-2 text-xs font-semibold text-red-600" data-testid="mobile-team-focus-error">
      {{ error }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import MobileLaunchTargetPicker from '~/components/mobile/MobileLaunchTargetPicker.vue'
import { useMobileTeamMemberFocusCoordinator } from '~/composables/mobile/useMobileTeamMemberFocusCoordinator'
import type { MobileWorkContext } from '~/types/mobileWork'

const props = defineProps<{
  context: MobileWorkContext | null
}>()

const {
  error,
  focusedAgentRunId,
  focusMember,
  isUpdating,
  memberRows,
} = useMobileTeamMemberFocusCoordinator(toRef(props, 'context'))

const memberItems = computed(() => memberRows.value.map((member) => ({
  id: member.agentRunId,
  label: member.label,
  detail: member.detail,
  group: 'Team members',
})))

async function handleFocusChange(agentRunId: string): Promise<void> {
  if (isUpdating.value || agentRunId === focusedAgentRunId.value) {
    return
  }
  try {
    await focusMember(agentRunId)
  } catch {
    // The coordinator exposes the actionable error copy for the bar.
  }
}
</script>
