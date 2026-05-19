<template>
  <section
    v-if="context?.kind === 'team-run'"
    class="border-b border-blue-100 bg-blue-50 px-4 py-3"
    data-testid="mobile-team-member-focus-bar"
  >
    <MobileLaunchTargetPicker
      v-if="memberItems.length > 0"
      :model-value="focusedMemberRouteKey"
      label="Message target"
      placeholder="Choose a member"
      :items="memberItems"
      test-id="mobile-team-focus-select"
      @update:model-value="handleFocusChange"
    />
    <div v-else class="rounded-2xl border border-blue-200 bg-white p-3" data-testid="mobile-team-focus-empty">
      <p class="text-sm font-bold text-blue-950">Message target</p>
      <p class="mt-1 text-xs text-amber-700">No team member is available for direct mobile messages.</p>
    </div>

    <p class="mt-2 text-xs text-blue-700" data-testid="mobile-team-focus-label">
      Current: <span class="font-semibold">{{ focusedMemberLabel }}</span>
    </p>
    <p v-if="error" class="mt-2 text-xs font-semibold text-red-600" data-testid="mobile-team-focus-error">
      {{ error }}
    </p>
    <p v-else class="mt-1 text-xs text-blue-700">
      Chat messages, Files, and Activity stay aligned to this member.
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
  focusedMemberLabel,
  focusedMemberRouteKey,
  focusMember,
  isUpdating,
  memberRows,
} = useMobileTeamMemberFocusCoordinator(toRef(props, 'context'))

const memberItems = computed(() => memberRows.value.map((member) => ({
  id: member.routeKey,
  label: member.label,
  detail: member.detail,
  group: 'Team members',
})))

async function handleFocusChange(memberRouteKey: string): Promise<void> {
  if (isUpdating.value || memberRouteKey === focusedMemberRouteKey.value) {
    return
  }
  try {
    await focusMember(memberRouteKey)
  } catch {
    // The coordinator exposes the actionable error copy for the bar.
  }
}
</script>
