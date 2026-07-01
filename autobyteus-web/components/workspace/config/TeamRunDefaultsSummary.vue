<template>
  <section
    class="rounded-lg border p-4"
    :class="cardClasses"
    data-test="team-run-defaults-summary"
  >
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0 flex-1 space-y-3">
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="text-sm font-semibold text-slate-900">
            {{ $t('workspace.components.workspace.config.TeamRunDefaultsSummary.title') }}
          </h3>
          <span
            class="rounded-full px-2 py-0.5 text-xs font-medium"
            :class="statusBadgeClasses"
            data-test="team-run-defaults-status"
          >
            {{ $t(statusLabelKey) }}
          </span>
          <span
            class="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
            data-test="team-run-defaults-auto-approve"
          >
            {{ $t(autoApproveLabelKey) }}
          </span>
        </div>

        <p class="text-sm leading-6" :class="descriptionClasses">
          {{ $t(descriptionKey) }}
        </p>

        <dl class="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-slate-500">
              {{ $t('workspace.components.workspace.config.TeamRunDefaultsSummary.runtime') }}
            </dt>
            <dd class="mt-1 truncate font-medium text-slate-900" data-test="team-run-defaults-runtime">
              {{ runtimeLabel }}
            </dd>
          </div>
          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-slate-500">
              {{ $t('workspace.components.workspace.config.TeamRunDefaultsSummary.model') }}
            </dt>
            <dd class="mt-1 truncate font-medium text-slate-900" data-test="team-run-defaults-model">
              {{ modelIdentifier || $t('workspace.components.workspace.config.TeamRunDefaultsSummary.no_model_selected') }}
            </dd>
          </div>
          <div>
            <dt class="flex flex-wrap items-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-500">
              <span>{{ $t('workspace.components.workspace.config.TeamRunDefaultsSummary.llm_config') }}</span>
              <span
                v-if="modelConfigChangedFromDefinition"
                class="rounded-full bg-blue-100 px-1.5 py-0.5 text-[0.625rem] font-semibold normal-case tracking-normal text-blue-700"
              >
                {{ $t('workspace.components.workspace.config.TeamRunDefaultsSummary.llm_config_changed') }}
              </span>
            </dt>
            <dd class="mt-1" data-test="team-run-defaults-llm-config">
              <div
                v-if="modelConfigEntries.length > 0"
                class="flex flex-wrap gap-1.5"
                data-test="team-run-defaults-llm-config-entries"
              >
                <span
                  v-for="entry in modelConfigEntries"
                  :key="entry.key"
                  class="max-w-full truncate rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700"
                  :title="entry.title"
                  data-test="team-run-defaults-llm-config-entry"
                >
                  <span class="font-semibold">{{ entry.key }}</span>: {{ entry.value }}
                </span>
              </div>
              <span
                v-else
                class="font-medium text-slate-900"
                data-test="team-run-defaults-llm-config-empty"
              >
                {{ $t('workspace.components.workspace.config.TeamRunDefaultsSummary.no_custom_model_config') }}
              </span>
            </dd>
          </div>
        </dl>
      </div>

      <button
        type="button"
        class="inline-flex shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        :aria-expanded="expanded ? 'true' : 'false'"
        data-test="team-run-defaults-edit"
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

    <div
      v-if="expanded && $slots.expanded"
      class="mt-4 border-t border-slate-200 pt-4"
      data-test="team-run-defaults-editor"
    >
      <slot name="expanded" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type {
  TeamRunDefaultsSummaryState,
  TeamRunModelConfigEntry,
} from '~/utils/teamRunConfigPresentation'

const props = defineProps<{
  state: TeamRunDefaultsSummaryState
  runtimeLabel: string
  modelIdentifier: string
  modelConfigEntries: TeamRunModelConfigEntry[]
  modelConfigChangedFromDefinition: boolean
  autoExecuteTools: boolean
  expanded: boolean
  readOnly?: boolean
}>()

defineEmits<{
  (e: 'toggle'): void
}>()

const isMissingModel = computed(() => props.state === 'missing-model')
const isChanged = computed(() => props.state === 'changed')
const isReadOnly = computed(() => props.readOnly === true)

const cardClasses = computed(() => {
  if (isMissingModel.value) {
    return 'border-amber-200 bg-amber-50'
  }
  if (isChanged.value) {
    return 'border-blue-200 bg-blue-50/60'
  }
  return 'border-slate-200 bg-slate-50/80'
})

const statusBadgeClasses = computed(() => {
  if (isMissingModel.value) {
    return 'bg-amber-100 text-amber-800'
  }
  if (isChanged.value) {
    return 'bg-blue-100 text-blue-700'
  }
  return 'bg-emerald-100 text-emerald-700'
})

const descriptionClasses = computed(() => (
  isMissingModel.value ? 'text-amber-800' : 'text-slate-600'
))

const statusLabelKey = computed(() => {
  if (isMissingModel.value) {
    return 'workspace.components.workspace.config.TeamRunDefaultsSummary.status_model_required'
  }
  if (isChanged.value) {
    return 'workspace.components.workspace.config.TeamRunDefaultsSummary.status_changed'
  }
  return 'workspace.components.workspace.config.TeamRunDefaultsSummary.status_team_defaults'
})

const descriptionKey = computed(() => {
  if (isMissingModel.value) {
    return 'workspace.components.workspace.config.TeamRunDefaultsSummary.missing_model_description'
  }
  if (isChanged.value) {
    return 'workspace.components.workspace.config.TeamRunDefaultsSummary.changed_description'
  }
  return 'workspace.components.workspace.config.TeamRunDefaultsSummary.defaults_description'
})

const actionLabelKey = computed(() => {
  if (props.expanded) {
    return 'workspace.components.workspace.config.TeamRunDefaultsSummary.hide_team_default'
  }
  if (isReadOnly.value) {
    return 'workspace.components.workspace.config.TeamRunDefaultsSummary.inspect_team_default'
  }
  return 'workspace.components.workspace.config.TeamRunDefaultsSummary.edit_team_default'
})

const autoApproveLabelKey = computed(() => (
  props.autoExecuteTools
    ? 'workspace.components.workspace.config.TeamRunDefaultsSummary.auto_approve_on'
    : 'workspace.components.workspace.config.TeamRunDefaultsSummary.auto_approve_off'
))
</script>
