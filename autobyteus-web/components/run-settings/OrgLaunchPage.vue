<template>
  <div
    class="flex h-full min-w-0 flex-1 flex-col overflow-y-auto bg-white"
    :class="[membersLayout.open ? 'lg:pr-[var(--members-panel-width)]' : '', membersLayout.resizing ? '' : 'transition-[padding] duration-200 ease-out motion-reduce:transition-none']"
    :style="{ '--members-panel-width': `${membersLayout.width}px` }"
    data-test="org-launch-page"
    :data-state="stateKey"
  >
    <!-- UIS-004: an Agent Org has no recipient, so it starts here: the same heading, a settings card
         where the message box would be with Run in its corner, a status line and the members line. -->
    <div class="flex flex-1 flex-col items-center justify-center px-4 pb-10 pt-[14vh] sm:px-6">
      <div class="relative -top-6 flex max-w-full items-center justify-center sm:-top-10" data-test="org-launch-target">
        <RunTargetSwitcher
          :name="org?.name ?? ''"
          :avatar-url="org?.avatarUrl ?? null"
          :current-key="`org:${definitionId}`"
          :disabled="draft?.phase === 'launching'"
          @choose="chooseTarget"
        />
      </div>

      <div v-if="unavailable" class="mt-8 flex max-w-md flex-col items-center gap-3 text-center" data-test="org-launch-unavailable">
        <p class="text-sm text-gray-600" role="alert">{{ $t('runSettings.orgLaunch.unavailable') }}</p>
        <button
          type="button"
          class="rounded-md px-2 py-1 text-sm font-medium text-blue-700 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
          data-test="org-launch-back"
          @click="router.push('/agent-orgs')"
        >
          {{ $t('runSettings.orgLaunch.back') }}
        </button>
      </div>

      <div v-else-if="draft" class="mt-8 w-full max-w-3xl">
        <div class="relative rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm" data-test="org-launch-card">
          <RunSettingsCard
            :values="draft.root"
            :locked="locked"
            test-suffix="org-launch"
            @change="changeRoot"
          />
          <button
            type="button"
            class="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm transition-all duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!canRun"
            :title="runLabel"
            :aria-label="runLabel"
            :aria-busy="draft.phase === 'launching' ? 'true' : undefined"
            data-test="org-launch-run"
            @click="run"
          >
            <Icon v-if="draft.phase === 'launching'" icon="heroicons:arrow-path-solid" class="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            <!-- The play glyph sits a hair right of center to look centered. -->
            <Icon v-else icon="heroicons:play-solid" class="ml-0.5 h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <p
          v-if="statusText"
          class="mt-2.5 flex items-center justify-center gap-1.5 text-center text-xs"
          :class="draft.error ? 'text-red-600' : blockedReason ? 'text-amber-700' : 'text-gray-500'"
          :role="draft.error ? 'alert' : 'status'"
          aria-live="polite"
          data-test="org-launch-status"
        >
          <span v-if="draft.phase === 'preparing'" class="h-3 w-3 flex-shrink-0 animate-spin rounded-full border-2 border-gray-200 border-t-gray-500 motion-reduce:animate-none" aria-hidden="true"></span>
          <!-- Wraps rather than truncates: a reason or error is read in full. -->
          <span class="min-w-0 leading-snug">{{ statusText }}</span>
        </p>

        <RunMembersLine
          v-if="draft.phase === 'ready' && memberNodes.length"
          :key="draft.key"
          class="mt-2.5"
          subject-kind="org"
          :subject-name="org?.name ?? ''"
          :nodes="memberNodes"
          @change="store.changeMember"
          @reset="store.resetMember"
          @reset-all="store.resetAllMembers"
          @layout="membersLayout = $event"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import { useRoute, useRouter } from 'vue-router'
import { useLocalization } from '~/composables/useLocalization'
import { useRunStart } from '~/composables/runSettings/useRunStart'
import { useAgentOrgLaunchDraftStore } from '~/stores/agentOrgLaunchDraftStore'
import { useWorkspaceStore } from '~/stores/workspace'
import { runtimeKindToLabel } from '~/types/agent/AgentRunConfig'
import type { RunMemberSettingChange, RunSettingFlags } from '~/types/runSettings/RunSettings'
import RunMembersLine from './RunMembersLine.vue'
import RunSettingsCard from './RunSettingsCard.vue'
import RunTargetSwitcher, { type RunTargetChoice } from './RunTargetSwitcher.vue'

/**
 * The Org launch page at the existing route
 * `/workspace?rootSubjectKind=agent_org&definitionId=…&mode=configuration[&sourceOrgRunId=…]` (DEC-005).
 * It renders the Org launch draft and emits intents; the draft store owns the launch.
 */
const route = useRoute()
const router = useRouter()
const { t } = useLocalization()
const store = useAgentOrgLaunchDraftStore()
const workspaceStore = useWorkspaceStore()
const runStart = useRunStart()

const definitionId = computed(() => String(route.query.definitionId || ''))
const sourceOrgRunId = computed(() => String(route.query.sourceOrgRunId || '') || null)
const draft = computed(() => store.draft)
const org = computed(() => store.org)
const memberNodes = computed(() => store.memberNodes)

// Run/"+" started the draft before navigating; a reload starts it from the route.
watch([definitionId, sourceOrgRunId], ([id, source]) => {
  if (id) store.ensureForRoute({ orgDefinitionId: id, sourceOrgRunId: source })
}, { immediate: true })
if (!workspaceStore.workspacesFetched) void workspaceStore.fetchAllWorkspaces().catch(() => undefined)

const unavailable = computed(() => Boolean(draft.value?.unavailable))
/** While the run's settings are copied or the Org starts, its settings are held as they are. */
const locked = computed<RunSettingFlags>(() => {
  const busy = draft.value?.phase !== 'ready'
  return { workspace: busy, model: busy, thinking: busy, approval: busy }
})
const blockedReason = computed(() => {
  const current = draft.value
  if (!current || current.phase !== 'ready') return ''
  const readiness = store.readiness
  return readiness.ready ? '' : readiness.reason
})
const canRun = computed(() => Boolean(draft.value?.phase === 'ready' && store.readiness.ready))
const runLabel = computed(() => blockedReason.value || t('runSettings.orgLaunch.run'))
const statusText = computed(() => {
  const current = draft.value
  if (!current) return ''
  if (current.phase === 'preparing') return current.sourceOrgRunId ? t('runSettings.orgLaunch.preparing') : ''
  if (current.phase === 'launching') {
    return t('chat.new.starting', { name: org.value?.name ?? '', runtime: runtimeKindToLabel(current.root.runtimeKind) })
  }
  return current.error || blockedReason.value
})
const stateKey = computed(() => {
  const current = draft.value
  if (unavailable.value) return 'unavailable'
  if (!current) return 'loading'
  if (current.phase !== 'ready') return current.phase
  if (current.error) return 'failed'
  if (blockedReason.value) return 'blocked'
  return 'ready'
})

const changeRoot = (change: RunMemberSettingChange) => {
  if (change.field === 'workspace') store.setWorkspace(change.choice)
  else if (change.field === 'model') store.setModel(change.choice)
  else if (change.field === 'thinking') store.setModelConfig(change.llmConfig)
  else store.setAutoExecuteTools(change.value)
}
const run = () => { void store.launch((target) => router.push(target)) }
const chooseTarget = (choice: RunTargetChoice) => { void runStart.switchTarget(choice, 'org') }

// The member settings drawer docks on the right; on wide screens the page makes room for it.
const membersLayout = ref({ open: false, width: 0, resizing: false })
</script>
