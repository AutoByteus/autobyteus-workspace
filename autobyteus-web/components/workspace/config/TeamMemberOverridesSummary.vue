<template>
  <section
    class="rounded-lg border border-indigo-200 bg-indigo-50/80 p-4 shadow-sm"
    data-test="team-member-overrides-summary"
  >
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0 flex-1 space-y-3">
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="text-sm font-semibold text-indigo-950">
            {{ $t('workspace.components.workspace.config.TeamMemberOverridesSummary.title') }}
          </h3>
          <span class="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800" data-test="team-member-count">
            {{ totalMembers }} {{ $t(memberCountLabelKey) }}
          </span>
          <span
            class="rounded-full px-2 py-0.5 text-xs font-medium"
            :class="activeOverrideCount > 0 ? 'bg-blue-100 text-blue-800' : 'bg-white text-emerald-700 ring-1 ring-emerald-100'"
            data-test="team-member-override-count"
          >
            <template v-if="activeOverrideCount > 0">
              {{ activeOverrideCount }} {{ $t(activeOverrideCount === 1
                ? 'workspace.components.workspace.config.TeamMemberOverridesSummary.override_singular'
                : 'workspace.components.workspace.config.TeamMemberOverridesSummary.override_plural') }}
            </template>
            <template v-else>
              {{ $t('workspace.components.workspace.config.TeamMemberOverridesSummary.all_using_team_defaults') }}
            </template>
          </span>
        </div>

        <p class="text-sm leading-6 text-indigo-900/75">
          {{ $t(activeOverrideCount > 0
            ? 'workspace.components.workspace.config.TeamMemberOverridesSummary.overrides_description'
            : 'workspace.components.workspace.config.TeamMemberOverridesSummary.defaults_description') }}
        </p>

        <div v-if="activeOverrideCount > 0" class="flex flex-wrap items-center gap-2" data-test="team-member-override-names">
          <span
            v-for="name in activeOverrideNames"
            :key="name"
            class="max-w-full truncate rounded-full border border-indigo-200 bg-white px-2 py-1 text-xs font-medium text-indigo-700"
            :title="name"
          >
            {{ name }}
          </span>
          <span
            v-if="hiddenOverrideCount > 0"
            class="rounded-full border border-indigo-200 bg-white px-2 py-1 text-xs font-medium text-indigo-600"
          >
            +{{ hiddenOverrideCount }} {{ $t('workspace.components.workspace.config.TeamMemberOverridesSummary.more') }}
          </span>
        </div>
      </div>

      <button
        type="button"
        class="inline-flex shrink-0 items-center justify-center rounded-md border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-indigo-700 shadow-sm transition-colors hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        :aria-expanded="expanded ? 'true' : 'false'"
        data-test="team-member-overrides-edit"
        @click="$emit('toggle')"
      >
        <span>{{ $t(actionLabelKey) }}</span>
        <span
          class="i-heroicons-chevron-down-20-solid ml-1 h-4 w-4 transition-transform duration-200"
          :class="expanded ? 'rotate-180' : ''"
          aria-hidden="true"
        ></span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  totalMembers: number
  activeOverrideCount: number
  activeOverrideNames: string[]
  hiddenOverrideCount: number
  expanded: boolean
  readOnly?: boolean
}>()

defineEmits<{
  (e: 'toggle'): void
}>()

const isReadOnly = computed(() => props.readOnly === true)

const memberCountLabelKey = computed(() => (
  props.totalMembers === 1
    ? 'workspace.components.workspace.config.TeamMemberOverridesSummary.member_singular'
    : 'workspace.components.workspace.config.TeamMemberOverridesSummary.member_plural'
))

const actionLabelKey = computed(() => {
  if (props.expanded) {
    return 'workspace.components.workspace.config.TeamMemberOverridesSummary.hide_member_overrides'
  }
  if (isReadOnly.value) {
    return 'workspace.components.workspace.config.TeamMemberOverridesSummary.inspect_member_overrides'
  }
  return 'workspace.components.workspace.config.TeamMemberOverridesSummary.edit_member_overrides'
})
</script>
