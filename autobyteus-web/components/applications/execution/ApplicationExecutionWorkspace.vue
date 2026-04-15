<template>
  <div v-if="session" class="grid h-full min-h-[32rem] gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
    <aside class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {{ $t('applications.shared.members') }}
          </p>
          <h2 class="mt-1 text-base font-semibold text-slate-900">
            {{ $t('applications.components.applications.execution.ApplicationExecutionWorkspace.executionSummary') }}
          </h2>
        </div>
        <button
          type="button"
          class="inline-flex shrink-0 items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          data-testid="open-full-execution-monitor"
          @click="$emit('openFullExecutionMonitor')"
        >
          {{ $t('applications.components.applications.execution.ApplicationExecutionWorkspace.openFullExecutionMonitor') }}
        </button>
      </div>

      <div class="mt-4 space-y-2">
        <button
          v-for="member in session.view.members"
          :key="member.memberRouteKey"
          type="button"
          class="w-full rounded-lg border px-3 py-3 text-left transition-colors"
          :class="member.memberRouteKey === selectedMemberRouteKey
            ? 'border-blue-200 bg-blue-50'
            : 'border-slate-200 bg-white hover:bg-slate-50'"
          @click="$emit('update:selectedMemberRouteKey', member.memberRouteKey)"
        >
          <div class="flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-slate-900">{{ member.displayName }}</p>
              <p class="mt-1 text-xs text-slate-500">{{ artifactSummaryFor(member) }}</p>
            </div>
            <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
              {{ memberArtifactCount(member) }}
            </span>
          </div>
        </button>
      </div>
    </aside>

    <section class="space-y-4">
      <div v-if="selectedMember" class="space-y-4">
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-slate-900">{{ selectedMember.displayName }}</h2>
              <p class="mt-1 text-sm text-slate-500">
                {{ artifactSummaryFor(selectedMember) }}
              </p>
            </div>
            <p class="text-xs text-slate-500">
              {{ $t('applications.shared.teamPath') }}:
              {{ selectedMember.teamPath.length ? selectedMember.teamPath.join(' / ') : $t('applications.shared.root') }}
            </p>
          </div>
        </div>

        <HostArtifactRenderer v-if="primaryArtifact" :artifact="primaryArtifact" />

        <div
          v-else
          class="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600 shadow-sm"
        >
          {{ $t('applications.components.applications.execution.ApplicationExecutionWorkspace.noRetainedMemberArtifactYet') }}
        </div>

        <div
          v-if="artifactEntries.length > 1"
          class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <h3 class="text-base font-semibold text-slate-900">{{ $t('applications.shared.artifacts') }}</h3>
          <div class="mt-4 space-y-3">
            <article
              v-for="artifact in artifactEntries"
              :key="artifact.artifactKey"
              class="rounded-lg border border-slate-200 bg-slate-50 p-3"
            >
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-sm font-semibold text-slate-900">{{ artifact.title || artifact.artifactType }}</p>
                  <p class="mt-1 text-xs text-slate-500">{{ artifact.artifactKey }}</p>
                </div>
                <span class="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                  {{ artifact.isFinal ? $t('applications.shared.final') : $t('applications.shared.draft') }}
                </span>
              </div>
              <p v-if="artifact.summary" class="mt-2 text-sm text-slate-600">{{ artifact.summary }}</p>
            </article>
          </div>
        </div>
      </div>

      <div
        v-else
        class="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600 shadow-sm"
      >
        {{ $t('applications.components.applications.execution.ApplicationExecutionWorkspace.selectMemberHint') }}
      </div>
    </section>
  </div>

  <div
    v-else
    class="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600 shadow-sm"
  >
    {{ $t('applications.components.applications.execution.ApplicationExecutionWorkspace.launchToInspectHint') }}
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLocalization } from '~/composables/useLocalization'
import HostArtifactRenderer from '~/components/applications/renderers/HostArtifactRenderer.vue'
import type {
  ApplicationArtifactProjection,
  ApplicationSession,
  ApplicationSessionMemberView,
} from '~/types/application/ApplicationSession'

const props = defineProps<{
  session: ApplicationSession | null
  selectedMemberRouteKey: string | null
}>()

const { t: $t } = useLocalization()

defineEmits<{
  (e: 'update:selectedMemberRouteKey', value: string | null): void
  (e: 'openFullExecutionMonitor'): void
}>()

const selectedMember = computed(() => {
  if (!props.session) {
    return null
  }

  if (props.selectedMemberRouteKey) {
    return props.session.view.members.find(
      (member) => member.memberRouteKey === props.selectedMemberRouteKey,
    ) || null
  }

  return props.session.view.members[0] || null
})

const artifactEntries = computed<ApplicationArtifactProjection[]>(() => {
  if (!selectedMember.value) {
    return []
  }
  return Object.values(selectedMember.value.artifactsByKey).sort(
    (left, right) => right.updatedAt.localeCompare(left.updatedAt),
  )
})

const primaryArtifact = computed<ApplicationArtifactProjection | null>(() => {
  if (!selectedMember.value?.primaryArtifactKey) {
    return null
  }
  return selectedMember.value.artifactsByKey[selectedMember.value.primaryArtifactKey] || null
})

const memberArtifactCount = (member: ApplicationSessionMemberView): number => (
  Object.keys(member.artifactsByKey).length
)

const artifactSummaryFor = (member: ApplicationSessionMemberView): string => {
  const artifactCount = memberArtifactCount(member)
  if (artifactCount === 0) {
    return $t('applications.components.applications.execution.ApplicationExecutionWorkspace.noRetainedArtifactsSummary')
  }
  return $t('applications.components.applications.execution.ApplicationExecutionWorkspace.retainedArtifactCount', {
    count: artifactCount,
  })
}
</script>
