<template>
  <section v-if="teamDefinitionId" class="rounded-3xl border border-blue-200 bg-white p-4" data-testid="mobile-team-launch-focus-picker">
    <div class="mb-3">
      <p class="text-sm font-bold text-blue-950">First message target</p>
      <p class="mt-1 text-xs text-blue-700">Choose the team member that receives the first prompt.</p>
    </div>

    <MobileLaunchTargetPicker
      v-if="memberItems.length > 0"
      :model-value="modelValue"
      label="Team member"
      placeholder="Choose a member"
      :items="memberItems"
      test-id="mobile-team-launch-focus-select"
      @update:model-value="$emit('update:modelValue', $event)"
    />

    <p v-else class="mt-2 text-xs font-semibold text-amber-700" data-testid="mobile-team-launch-focus-empty">
      This team has no member available for mobile direct messages.
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import MobileLaunchTargetPicker from '~/components/mobile/MobileLaunchTargetPicker.vue'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'
import {
  buildMobileTeamMemberFocusRows,
} from '~/composables/mobile/useMobileTeamMemberFocusCoordinator'
import {
  buildTeamMemberTreeFromDefinition,
  flattenLeafAgentMemberNodes,
} from '~/utils/teamDefinitionMembers'

const props = defineProps<{
  teamDefinitionId: string
  modelValue: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const agentDefinitionStore = useAgentDefinitionStore()
const teamDefinitionStore = useAgentTeamDefinitionStore()

const memberTree = computed(() => {
  const teamDefinitionId = props.teamDefinitionId.trim()
  if (!teamDefinitionId) {
    return []
  }
  const definition = teamDefinitionStore.getAgentTeamDefinitionById(teamDefinitionId)
  if (!definition) {
    return []
  }
  try {
    return buildTeamMemberTreeFromDefinition(definition, {
      getTeamDefinitionById: (nestedTeamDefinitionId: string) =>
        teamDefinitionStore.getAgentTeamDefinitionById(nestedTeamDefinitionId),
    })
  } catch (cause) {
    console.error('[MobileTeamLaunchFocusPicker] Failed to build team member tree.', cause)
    return []
  }
})

const memberRows = computed(() => buildMobileTeamMemberFocusRows(
  flattenLeafAgentMemberNodes(memberTree.value),
  (agentDefinitionId) => agentDefinitionStore.getAgentDefinitionById(agentDefinitionId)?.name || null,
))
const memberItems = computed(() => memberRows.value.map((member) => ({
  id: member.routeKey,
  label: member.label,
  detail: member.detail,
  group: 'Team members',
})))

watch(
  [memberRows, () => props.modelValue],
  ([rows, selectedRouteKey]) => {
    if (rows.length === 0) {
      if (selectedRouteKey) {
        emit('update:modelValue', '')
      }
      return
    }
    if (!rows.some((row) => row.routeKey === selectedRouteKey)) {
      emit('update:modelValue', rows[0].routeKey)
    }
  },
  { immediate: true },
)
</script>
