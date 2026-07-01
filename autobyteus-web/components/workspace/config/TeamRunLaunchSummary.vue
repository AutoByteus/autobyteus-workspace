<template>
  <div
    class="mb-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
    data-test="team-run-launch-summary"
  >
    <div class="flex flex-wrap items-center gap-2">
      <span
        class="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 font-medium text-slate-700"
        data-test="team-run-launch-summary-members"
      >
        {{ summary.memberCount }} {{ $t(memberLabelKey) }}
      </span>
      <span
        class="inline-flex min-w-0 items-center rounded-full bg-slate-100 px-2 py-1 font-medium text-slate-700"
        data-test="team-run-launch-summary-runtime"
      >
        <span class="mr-1 text-slate-500">{{ $t('workspace.components.workspace.config.TeamRunLaunchSummary.runtime') }}</span>
        <span class="truncate">{{ summary.runtimeLabel }}</span>
      </span>
      <span
        class="inline-flex min-w-0 items-center rounded-full bg-slate-100 px-2 py-1 font-medium text-slate-700"
        data-test="team-run-launch-summary-model"
      >
        <span class="mr-1 text-slate-500">{{ $t('workspace.components.workspace.config.TeamRunLaunchSummary.model') }}</span>
        <span class="truncate">
          {{ summary.modelIdentifier || $t('workspace.components.workspace.config.TeamRunLaunchSummary.no_model') }}
        </span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TeamRunLaunchSummaryPresentation } from '~/utils/teamRunConfigPresentation'

const props = defineProps<{
  summary: TeamRunLaunchSummaryPresentation
}>()

const memberLabelKey = computed(() => (
  props.summary.memberCount === 1
    ? 'workspace.components.workspace.config.TeamRunLaunchSummary.member_singular'
    : 'workspace.components.workspace.config.TeamRunLaunchSummary.member_plural'
))
</script>
