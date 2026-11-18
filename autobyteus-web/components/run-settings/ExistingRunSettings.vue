<template>
  <div class="flex min-h-0 flex-1 flex-col" data-test="existing-run-settings" :data-state="stateKey">
    <div class="flex-1 overflow-y-auto px-4 py-5">
      <div class="mx-auto max-w-2xl">
        <RunSubjectHeader :kind="headerKind" :name="headerName" :status="headerActive ? 'active' : 'stopped'">
          <!-- REQ-014: a running run has a small red stop icon right after its status; on a copy it stops that copy. -->
          <button
            v-if="headerStop"
            type="button"
            class="-ml-1 inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 disabled:cursor-default disabled:opacity-60"
            :disabled="headerStop.pending"
            :title="headerStop.label"
            :aria-label="headerStop.label"
            :data-test="headerStop.testId"
            @click="headerStop.run"
          >
            <Icon icon="heroicons:stop-20-solid" class="h-4 w-4" :class="headerStop.pending ? 'animate-pulse motion-reduce:animate-none' : ''" aria-hidden="true" />
          </button>
          <template v-if="subjectNode && !showGroup && (groupName || subjectNode.isCoordinator || subjectNode.badge || subjectNode.remoteNode)" #details>
            <span v-if="groupName" class="truncate" data-test="run-subject-group">{{ $t('runSettings.subject.inGroup', { name: groupName }) }}</span>
            <span v-if="subjectNode.isCoordinator" class="flex-shrink-0 rounded-full bg-gray-100 px-1.5 py-px text-[0.6875rem] font-medium text-gray-600">{{ $t('runSettings.members.coordinator') }}</span>
            <span v-if="subjectNode.badge" class="flex-shrink-0 rounded-full bg-gray-100 px-1.5 py-px text-[0.6875rem] font-medium text-gray-600" data-test="run-member-badge">{{ $t('runSettings.delegated.copy') }}</span>
            <RemoteNodeChip v-if="subjectNode.remoteNode" :node-name="subjectNode.remoteNode" />
          </template>
        </RunSubjectHeader>

        <!-- A member or a Team copy's member: this agent, or its group's settings (DEC-002). -->
        <div v-if="groupLabel" class="mb-4 inline-flex rounded-lg bg-gray-100 p-0.5 text-xs font-medium" role="group" data-test="run-settings-switch">
          <button
            type="button"
            class="rounded-md px-2.5 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
            :class="showGroup ? 'text-gray-600 hover:text-gray-900' : 'bg-white text-gray-900 shadow-sm'"
            :aria-pressed="showGroup ? 'false' : 'true'"
            data-test="run-settings-switch-agent"
            @click="emit('update:show-group', false)"
          >{{ $t('runSettings.subject.thisAgent') }}</button>
          <button
            type="button"
            class="rounded-md px-2.5 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
            :class="showGroup ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'"
            :aria-pressed="showGroup ? 'true' : 'false'"
            data-test="run-settings-switch-group"
            @click="emit('update:show-group', true)"
          >{{ groupLabel }}</button>
        </div>

        <!-- Only what the settings cannot show themselves: a needed refresh, a run whose settings
             cannot change, a failed stop or save. -->
        <p
          v-if="note"
          class="-mt-2 mb-4 flex items-center gap-1.5 text-xs"
          :class="note.tone === 'warning' ? 'text-amber-700' : note.tone === 'error' ? 'text-red-600' : 'text-gray-500'"
          :role="note.tone === 'info' ? 'status' : 'alert'"
          data-test="existing-run-note"
        >
          <Icon :icon="note.tone === 'info' ? 'heroicons:lock-closed' : 'heroicons:exclamation-triangle'" class="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
          <span>{{ note.text }}</span>
          <button
            v-if="note.refresh"
            type="button"
            class="rounded px-1 font-medium text-blue-600 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
            data-test="existing-run-refresh"
            @click="emit('refresh')"
          >
            {{ $t('runSettings.existing.refresh') }}
          </button>
        </p>

        <RunSubjectCard
          v-if="cardNode"
          :key="cardNode.key"
          :node="cardNode"
          :locked="subject.origin === 'member' ? memberLocked : DELEGATED_LOCKED"
          :locked-models="(subject.origin === 'member' ? lockedModelsFor : delegatedLockedModelsFor)?.(cardNode.key) ?? null"
          @change="subject.origin === 'member' ? emit('change-member', cardNode!.key, $event) : emit('change-delegated', cardNode!.key, $event)"
        />
        <div v-else class="rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm" data-test="existing-run-root-card">
          <RunSettingsCard
            :values="root"
            :locked="rootLocked"
            :runtime-locked="kind !== 'agent'"
            :locked-models="rootLockedModels"
            :model-unavailable="rootModelUnavailable"
            test-suffix="root"
            @change="emit('change-root', $event)"
          />
        </div>
        <!-- A hub's copies are in the left tree; each shows its own settings when it is selected there (DEC-004). -->
        <p v-if="copiesHint" class="mt-2 text-xs text-gray-500" data-test="existing-run-copies-hint">{{ $t('runSettings.subject.selectCopyHint') }}</p>
        <!-- A stopped run's Agent, member or delegated copy can switch its agent runtime; the switch is made by its next message. -->
        <p
          v-if="runtimeChangePending"
          class="mt-2 flex items-center gap-1.5 text-xs text-gray-500"
          role="status"
          data-test="existing-run-runtime-change-hint"
        >
          <Icon icon="heroicons:arrows-right-left" class="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
          <span>{{ $t('runSettings.existing.runtimeChangeHint') }}</span>
        </p>

        <!-- The group view: the run's members, or a Team copy's. -->
        <RunMembersSection
          v-if="groupRows.length"
          :title="$t('runSettings.members.title')"
          :nodes="groupRows"
          :locked="groupNode ? DELEGATED_LOCKED : memberLocked"
          :locked-models-for="groupNode ? delegatedLockedModelsFor : lockedModelsFor"
          read-only
          @change="(key, change) => groupNode ? emit('change-delegated', key, change) : emit('change-member', key, change)"
        />
      </div>
    </div>

    <!-- The Save bar appears only after a change (REQ-015). -->
    <div v-if="dirty || saving || saved" class="flex items-center gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3" data-test="existing-run-save-bar">
      <p class="min-w-0 flex-1 truncate text-xs" :class="saved && !dirty ? 'text-emerald-700' : 'text-gray-600'" :title="saveText" role="status" aria-live="polite" data-test="existing-run-save-text">
        {{ saveText }}
      </p>
      <template v-if="dirty || saving">
        <button
          type="button"
          class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          :disabled="saving"
          data-test="existing-run-cancel"
          @click="emit('cancel')"
        >
          {{ $t('runSettings.save.cancel') }}
        </button>
        <button
          type="button"
          class="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          :disabled="saving || !canSave"
          data-test="save-existing-model-config"
          @click="emit('save')"
        >
          {{ saving ? $t('runSettings.save.saving') : $t('runSettings.save.save') }}
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import { useLocalization } from '~/composables/useLocalization'
import type { ChatModelOption } from '~/composables/chat/useChatModelCatalog'
import type { RunMemberSettingChange, RunSettingFlags, RunSettingsValues } from '~/types/runSettings/RunSettings'
import type { RunMemberDelegatedFacts, RunMemberNode } from '~/utils/runSettings/runMemberTree'
import type { SettingsSubject } from '~/utils/runSettings/settingsSubject'
import RemoteNodeChip from '~/components/workspace/remote/RemoteNodeChip.vue'
import RunMembersSection from './RunMembersSection.vue'
import RunSettingsCard from './RunSettingsCard.vue'
import RunSubjectCard from './RunSubjectCard.vue'
import RunSubjectHeader from './RunSubjectHeader.vue'

/**
 * UIS-003: a saved run's settings. Workspace and tool approval are fixed (a lock); the agent runtime,
 * model, thinking and other model settings change only while the run is stopped (a Team or Org root's own
 * runtime stays fixed); a placed team's workspace changes when stopped. The container maps `existingRunConfigStore` into these props.
 *
 * autobyteus-366: it shows one subject, the focused agent, as one card; a member's or a Team copy's member's group
 * is one switch away. With no subject it shows the run's group view: its root card and its members.
 */
const props = withDefaults(defineProps<{
  kind: 'agent' | 'team' | 'org'
  name: string
  isActive: boolean
  /** Model and thinking can change now (stopped, editable, nothing in flight). */
  canEdit: boolean
  state: 'editable' | 'read_only' | 'refresh_required'
  stop: Readonly<{ label: string; pending: boolean; error: string | null }>
  root: RunSettingsValues
  rootLockedModels?: readonly ChatModelOption[] | null
  rootModelUnavailable?: boolean
  members?: readonly RunMemberNode[]
  lockedModelsFor?: ((key: string) => readonly ChatModelOption[] | null) | null
  /** The agent to show, and its group. */
  subject?: SettingsSubject
  /** The group's settings show instead of the subject's. */
  showGroup?: boolean
  /** The subject is running (a copy: that copy, or its Team copy; otherwise the run). */
  subjectActive?: boolean
  /** A hub with open copies: say where their settings are. */
  copiesHint?: boolean
  /** A copy's own locks say whether its model can change. */
  delegatedLockedModelsFor?: ((key: string) => readonly ChatModelOption[] | null) | null
  /** The outcome of a copy's Stop when it needs saying (a failure, or older copies it could not stop). */
  delegatedNotice?: Readonly<{ tone: 'info' | 'error'; text: string }> | null
  dirty: boolean
  /** Every agent with unsaved edits; they may not be on screen. */
  unsavedNames?: readonly string[]
  canSave: boolean
  saving: boolean
  saved: boolean
  /** A failed save, surfaced as is. */
  saveError?: string | null
  /** The draft chooses another agent runtime than the saved one for the Agent, a member or a delegated copy. */
  runtimeChangePending?: boolean
}>(), { runtimeChangePending: false, rootLockedModels: null, rootModelUnavailable: false, members: () => [], lockedModelsFor: null,
  subject: () => ({ origin: 'none', subject: null, group: 'root' }), showGroup: false, subjectActive: false, copiesHint: false,
  delegatedLockedModelsFor: null, delegatedNotice: null, unsavedNames: () => [], saveError: null })

const emit = defineEmits<{
  (event: 'stop'): void
  (event: 'refresh'): void
  (event: 'change-root', change: RunMemberSettingChange): void
  (event: 'change-member', key: string, change: RunMemberSettingChange): void
  (event: 'change-delegated', key: string, change: RunMemberSettingChange): void
  (event: 'stop-delegated', reference: NonNullable<RunMemberDelegatedFacts['stop']>): void
  (event: 'update:show-group', showGroup: boolean): void
  (event: 'cancel'): void
  (event: 'save'): void
}>()

const { t } = useLocalization()
/** A copy row without its own locks is fully locked; rows say themselves when their model can change. */
const DELEGATED_LOCKED: RunSettingFlags = { workspace: true, model: true, thinking: true, approval: true }

const rootLocked = computed<RunSettingFlags>(() => ({ workspace: true, approval: true, model: !props.canEdit, thinking: !props.canEdit }))
const memberLocked = computed<RunSettingFlags>(() => ({
  workspace: !(props.kind === 'org' && props.canEdit),
  approval: true,
  model: !props.canEdit,
  thinking: !props.canEdit,
}))

const subjectNode = computed(() => (props.subject.subject === 'root' ? null : props.subject.subject))
/** A Team copy, the group of the focused member of that copy. */
const groupNode = computed(() => (props.subject.origin === 'delegated' ? props.subject.group : null))
/** The one card that replaces the root card: the subject's, or in the group view its Team copy's. */
const cardNode = computed(() => (props.showGroup ? groupNode.value : subjectNode.value))
const groupRows = computed(() => {
  if (cardNode.value && !props.showGroup) return []
  return groupNode.value ? groupNode.value.children : props.members
})
/** The switch's group label; a subject without a group has no switch. */
const groupLabel = computed(() => {
  if (props.subject.origin === 'member') return t(props.kind === 'org' ? 'runSettings.subject.organizationSettings' : 'runSettings.subject.teamSettings')
  return groupNode.value ? t('runSettings.subject.teamSettings') : null
})
const groupName = computed(() => (props.subject.origin === 'member' ? props.name : groupNode.value?.name ?? null))
const headerKind = computed(() => {
  if (props.showGroup && groupNode.value) return 'team' as const
  return !props.showGroup && subjectNode.value ? 'agent' as const : props.kind
})
const headerName = computed(() => cardNode.value?.name ?? props.name)
const headerActive = computed(() => {
  if (props.subject.origin === 'delegated') return props.subjectActive
  return props.isActive
})
/** What the header's stop icon stops: the run, or for a copy that copy (a Team copy's member: its Team copy). A remote copy has none. */
const headerStop = computed(() => {
  if (props.subject.origin !== 'delegated') {
    return props.isActive ? { label: props.stop.label, pending: props.stop.pending, testId: 'existing-run-stop', run: () => emit('stop') } : null
  }
  const owner = props.subject.subject.delegated?.stop ? props.subject.subject : props.subject.group
  const facts = owner?.delegated
  if (!owner || !facts?.stop || !(facts.running || facts.stopping)) return null
  const reference = facts.stop
  return { label: t(facts.stopping ? 'runSettings.delegated.stopping' : 'runSettings.delegated.stop', { name: owner.name }), pending: facts.stopping,
    testId: 'run-member-stop', run: () => emit('stop-delegated', reference) }
})
const saveText = computed(() => {
  if (props.saved && !props.dirty && !props.saving) return t('runSettings.save.saved')
  return props.unsavedNames.length ? t('runSettings.save.unsavedNamed', { names: props.unsavedNames.join(', ') }) : t('runSettings.save.unsavedResumes')
})

const note = computed(() => {
  if (props.state === 'refresh_required') return { tone: 'warning', text: props.saveError ?? t('runSettings.existing.refreshNote'), refresh: true }
  if (props.stop.error) return { tone: 'error', text: props.stop.error, refresh: false }
  if (props.saveError) return { tone: 'error', text: props.saveError, refresh: false }
  if (props.delegatedNotice) return { ...props.delegatedNotice, refresh: false }
  if (props.state === 'read_only' && !props.isActive) return { tone: 'info', text: t('runSettings.existing.readOnlyNote'), refresh: false }
  return null
})

const stateKey = computed(() => {
  if (props.state === 'refresh_required') return 'refresh-required'
  if (props.isActive) return props.stop.pending ? 'stopping' : 'active'
  return props.state === 'read_only' ? 'read-only' : 'stopped'
})
</script>
