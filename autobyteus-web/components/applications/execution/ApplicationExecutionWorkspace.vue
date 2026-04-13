<template>
  <div v-if="session" class="grid h-full min-h-[32rem] gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
    <aside class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 class="text-base font-semibold text-slate-900">Members</h2>
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
            <div>
              <p class="text-sm font-semibold text-slate-900">{{ member.displayName }}</p>
              <p class="mt-1 text-xs text-slate-500">{{ member.memberRouteKey }}</p>
            </div>
            <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
              {{ member.runtimeTarget?.runtimeKind || 'pending' }}
            </span>
          </div>
        </button>
      </div>
    </aside>

    <section class="space-y-4">
      <div
        v-if="session.view.delivery.current"
        class="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 shadow-sm"
      >
        <p class="font-semibold">Current delivery</p>
        <p class="mt-1">{{ session.view.delivery.current.title || session.view.delivery.current.deliveryState }}</p>
        <p v-if="session.view.delivery.current.summary" class="mt-1 text-emerald-800">
          {{ session.view.delivery.current.summary }}
        </p>
      </div>

      <div v-if="selectedMember" class="space-y-4">
        <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-slate-900">{{ selectedMember.displayName }}</h2>
              <p class="mt-1 text-sm text-slate-500">
                Route {{ selectedMember.memberRouteKey }}
                <span v-if="selectedMember.runtimeTarget">
                  · run {{ selectedMember.runtimeTarget.runId }}
                </span>
              </p>
            </div>
            <p class="text-xs text-slate-500">
              Team path: {{ selectedMember.teamPath.length ? selectedMember.teamPath.join(' / ') : 'root' }}
            </p>
          </div>
        </div>

        <div v-if="primaryProgress || progressEntries.length" class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 class="text-base font-semibold text-slate-900">Progress</h3>
          <div class="mt-4 space-y-3">
            <article
              v-for="progress in progressEntries"
              :key="progress.publicationKey"
              class="rounded-lg border border-slate-200 bg-slate-50 p-3"
            >
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-sm font-semibold text-slate-900">{{ progress.phaseLabel }}</p>
                  <p v-if="progress.detailText" class="mt-1 text-sm text-slate-600">{{ progress.detailText }}</p>
                </div>
                <span class="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                  {{ progress.state }}<span v-if="progress.percent !== null"> · {{ progress.percent }}%</span>
                </span>
              </div>
            </article>
          </div>
        </div>

        <HostArtifactRenderer v-if="primaryArtifact" :artifact="primaryArtifact" />

        <div
          v-else
          class="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600 shadow-sm"
        >
          No retained member artifact yet.
        </div>
      </div>

      <div
        v-else
        class="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600 shadow-sm"
      >
        Select a member to inspect retained progress and artifacts.
      </div>
    </section>
  </div>

  <div
    v-else
    class="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600 shadow-sm"
  >
    Launch the application to inspect retained member progress, artifacts, and delivery state.
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import HostArtifactRenderer from '~/components/applications/renderers/HostArtifactRenderer.vue'
import type {
  ApplicationMemberArtifactProjection,
  ApplicationMemberProgressProjection,
  ApplicationSession,
} from '~/types/application/ApplicationSession'

const props = defineProps<{
  session: ApplicationSession | null
  selectedMemberRouteKey: string | null
}>()

defineEmits<{
  (e: 'update:selectedMemberRouteKey', value: string | null): void
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

const progressEntries = computed<ApplicationMemberProgressProjection[]>(() => {
  if (!selectedMember.value) {
    return []
  }
  return Object.values(selectedMember.value.progressByKey).sort(
    (left, right) => right.updatedAt.localeCompare(left.updatedAt),
  )
})

const primaryProgress = computed(() => {
  if (!selectedMember.value?.primaryProgressKey) {
    return null
  }
  return selectedMember.value.progressByKey[selectedMember.value.primaryProgressKey] || null
})

const primaryArtifact = computed<ApplicationMemberArtifactProjection | null>(() => {
  if (!selectedMember.value?.primaryArtifactKey) {
    return null
  }
  return selectedMember.value.artifactsByKey[selectedMember.value.primaryArtifactKey] || null
})
</script>
