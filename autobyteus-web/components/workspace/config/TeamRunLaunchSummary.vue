<template>
  <div
    class="mb-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
    data-test="team-run-launch-summary"
  >
    <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span
        class="inline-flex items-center font-medium text-slate-700"
        data-test="team-run-launch-summary-members"
      >
        {{ summary.memberCount }} {{ $t(memberLabelKey) }}
      </span>
      <span class="text-slate-300" aria-hidden="true">·</span>
      <span
        class="inline-flex min-w-0 items-center font-medium text-slate-700"
        data-test="team-run-launch-summary-runtime"
      >
        <span class="mr-1 text-slate-500">{{ $t('workspace.components.workspace.config.TeamRunLaunchSummary.runtime') }}</span>
        <span class="truncate">{{ summary.runtimeLabel }}</span>
      </span>
      <span class="text-slate-300" aria-hidden="true">·</span>
      <span
        class="inline-flex min-w-0 items-center font-medium text-slate-700"
        data-test="team-run-launch-summary-model"
      >
        <span class="mr-1 text-slate-500">{{ $t('workspace.components.workspace.config.TeamRunLaunchSummary.model') }}</span>
        <span class="truncate">
          {{ summary.modelIdentifier || $t('workspace.components.workspace.config.TeamRunLaunchSummary.no_model') }}
        </span>
      </span>
      <span class="text-slate-300" aria-hidden="true">·</span>
      <span
        class="inline-flex min-w-0 items-center font-medium text-slate-700"
        data-test="team-run-launch-summary-auto-approve"
      >
        <span class="mr-1 text-slate-500">{{ $t('workspace.components.workspace.config.TeamRunLaunchSummary.auto_approve') }}</span>
        <span>{{ summary.autoApproveEnabled ? $t('workspace.components.workspace.config.TeamRunLaunchSummary.on') : $t('workspace.components.workspace.config.TeamRunLaunchSummary.off') }}</span>
      </span>
      <span class="text-slate-300" aria-hidden="true">·</span>
      <span
        class="inline-flex min-w-0 items-center font-medium text-slate-700"
        data-test="team-run-launch-summary-workspace"
      >
        <span class="mr-1 text-slate-500">{{ $t('workspace.components.workspace.config.TeamRunLaunchSummary.workspace') }}</span>
        <span class="truncate">{{ workspaceValue }}</span>
      </span>
      <span v-if="summary.memberOverrideTag" class="text-slate-300" aria-hidden="true">·</span>
      <button
        v-if="summary.memberOverrideTag"
        type="button"
        class="inline-flex max-w-full items-center rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 font-semibold text-orange-700 transition-colors hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1"
        data-test="team-run-launch-summary-overrides"
        @click="$emit('focus-overrides', summary.memberOverrideTag.routeKeys)"
      >
        <span class="truncate">{{ overrideTagLabel }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TeamRunLaunchSummaryPresentation } from '~/utils/teamRunConfigPresentation'
import { useLocalization } from '~/composables/useLocalization'

const props = defineProps<{
  summary: TeamRunLaunchSummaryPresentation
}>()
const { t: $t } = useLocalization()

defineEmits<{
  (e: 'focus-overrides', routeKeys: string[]): void
}>()

const memberLabelKey = computed(() => (
  props.summary.memberCount === 1
    ? 'workspace.components.workspace.config.TeamRunLaunchSummary.member_singular'
    : 'workspace.components.workspace.config.TeamRunLaunchSummary.member_plural'
))

const overrideTagLabel = computed(() => {
  const tag = props.summary.memberOverrideTag
  if (!tag) {
    return ''
  }

  if (tag.count === 1) {
    return $t('workspace.components.workspace.config.TeamRunLaunchSummary.override_one', {
      name: tag.visibleNames[0] || '',
    })
  }

  if (tag.count === 2) {
    return $t('workspace.components.workspace.config.TeamRunLaunchSummary.override_two', {
      first: tag.visibleNames[0] || '',
      second: tag.visibleNames[1] || '',
    })
  }

  return $t('workspace.components.workspace.config.TeamRunLaunchSummary.override_count', {
    count: tag.count,
  })
})

const workspaceValue = computed(() => {
  const workspace = props.summary.workspace
  if (workspace.mode === 'existing') {
    return workspace.name
      ? `${$t('workspace.components.workspace.config.TeamRunLaunchSummary.workspace_existing')} (${workspace.name})`
      : $t('workspace.components.workspace.config.TeamRunLaunchSummary.workspace_existing')
  }
  if (workspace.mode === 'new') {
    return workspace.path
      ? `${$t('workspace.components.workspace.config.TeamRunLaunchSummary.workspace_new')} (${workspace.path})`
      : $t('workspace.components.workspace.config.TeamRunLaunchSummary.workspace_new')
  }
  return $t('workspace.components.workspace.config.TeamRunLaunchSummary.workspace_required')
})
</script>
